"use client"

import { useState, useEffect } from "react"
import { login as apiLogin, signup as apiSignup, forgotPassword as apiForgotPassword, resendVerification } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EyebrowLabel, SegmentedProgress } from "@/components/shared"
import {
  BookOpen,
  Loader2,
  Mail,
  Lock,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  MailCheck,
  LogIn,
  UserPlus,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function mapAuthError(message: string): string {
  if (/email ja cadastrado/i.test(message))
    return "Este e-mail já está cadastrado. Tente fazer login."
  if (/nome de usuario ja cadastrado/i.test(message))
    return "Este nome de usuário já está em uso. Escolha outro."
  if (/credenciais invalidas/i.test(message))
    return "E-mail ou senha incorretos. Verifique suas credenciais."
  if (/invalid login credentials/i.test(message))
    return "E-mail ou senha incorretos. Verifique suas credenciais."
  if (/email not confirmed/i.test(message))
    return "E-mail não confirmado. Verifique sua caixa de entrada."
  if (/too many requests/i.test(message))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente."
  if (/user already registered/i.test(message))
    return "Este e-mail já está cadastrado. Tente fazer login."
  if (/password should be at least/i.test(message))
    return "A senha deve ter pelo menos 6 caracteres."
  return "Algo deu errado. Tente novamente."
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

type StrengthTone = "destructive" | "warning" | "success"

function getPasswordStrength(password: string): { label: string; value: number; tone: StrengthTone } | null {
  if (!password) return null
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const isLong = password.length >= 8
  const score = [isLong, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (score <= 1) return { label: "Fraca", value: 1, tone: "destructive" }
  if (score === 2) return { label: "Razoável", value: 2, tone: "warning" }
  if (score === 3) return { label: "Boa", value: 3, tone: "warning" }
  return { label: "Forte", value: 3, tone: "success" }
}

const strengthTextClass: Record<StrengthTone, string> = {
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
}

const fieldLabel = "text-xs font-semibold text-foreground"
const fieldIcon = "pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
const fieldInput = "h-11 rounded-[10px] bg-card pl-10 text-sm shadow-none placeholder:text-muted-foreground/70 dark:bg-card"
const fieldInputError = "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
const trailingBtn = "absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
const fieldError = "mt-1.5 flex items-center gap-1 text-xs text-destructive"
const primaryBtn = "h-11 w-full rounded-[10px] text-sm font-semibold shadow-md shadow-primary/25"
const apiErrorBox =
  "flex items-start gap-2 rounded-[10px] border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-sm text-destructive-soft-foreground"
const tabTrigger =
  "h-full rounded-lg text-sm font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary"

type LoginErrors = { email?: string; password?: string }
type SignupErrors = { email?: string; password?: string; confirmPassword?: string }

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"tabs" | "forgot">("tabs")

  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({})
  const [loginApiError, setLoginApiError] = useState<string | null>(null)
  const [emailNotVerifiedFor, setEmailNotVerifiedFor] = useState<string | null>(null)
  const [verifyResendCooldown, setVerifyResendCooldown] = useState(0)
  const [verifyResendLoading, setVerifyResendLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")

  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({})
  const [signupApiError, setSignupApiError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotEmailError, setForgotEmailError] = useState<string | undefined>()
  const [forgotApiError, setForgotApiError] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)

  function validateLoginField(field: keyof LoginErrors, value: string): string | undefined {
    if (field === "email") {
      if (!value.trim()) return "E-mail é obrigatório"
      if (!isValidEmail(value)) return "Formato de e-mail inválido"
    }
    if (field === "password") {
      if (!value) return "Senha é obrigatória"
    }
  }

  function validateLoginForm(): LoginErrors {
    return {
      email: validateLoginField("email", loginEmail),
      password: validateLoginField("password", loginPassword),
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateLoginForm()
    if (errors.email || errors.password) {
      setLoginErrors(errors)
      return
    }
    setLoginApiError(null)
    setEmailNotVerifiedFor(null)
    setLoading(true)
    try {
      await apiLogin(loginEmail.trim(), loginPassword)
      toast.success("Bem-vindo de volta!")
      window.location.href = "/"
    } catch (error: any) {
      if (error.message === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerifiedFor(loginEmail.trim())
        setVerifyResendCooldown(0)
      } else {
        setLoginApiError(mapAuthError(error.message || ""))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (verifyResendCooldown <= 0) return
    const t = setTimeout(() => setVerifyResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [verifyResendCooldown])

  const handleResendVerification = async () => {
    if (!emailNotVerifiedFor) return
    setVerifyResendLoading(true)
    try {
      await resendVerification(emailNotVerifiedFor)
      toast.success("E-mail de verificação reenviado!")
      setVerifyResendCooldown(60)
    } catch {
      toast.error("Erro ao reenviar. Tente novamente.")
    } finally {
      setVerifyResendLoading(false)
    }
  }

  function validateSignupField(field: keyof SignupErrors, value: string): string | undefined {
    if (field === "email") {
      if (!value.trim()) return "E-mail é obrigatório"
      if (!isValidEmail(value)) return "Formato de e-mail inválido"
    }
    if (field === "password") {
      if (!value) return "Senha é obrigatória"
      if (value.length < 8) return "A senha deve ter pelo menos 8 caracteres"
    }
    if (field === "confirmPassword") {
      if (!value) return "Confirmação de senha é obrigatória"
      if (value !== signupPassword) return "As senhas não coincidem"
    }
  }

  function validateSignupForm(): SignupErrors {
    return {
      email: validateSignupField("email", signupEmail),
      password: validateSignupField("password", signupPassword),
      confirmPassword: validateSignupField("confirmPassword", confirmPassword),
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors = validateSignupForm()
    if (errors.email || errors.password || errors.confirmPassword) {
      setSignupErrors(errors)
      return
    }
    setSignupApiError(null)
    setLoading(true)
    try {
      await apiSignup(signupEmail.trim(), signupPassword)
      setSignupSuccess(true)
    } catch (error: any) {
      setSignupApiError(mapAuthError(error.message || ""))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = async () => {
    setResendLoading(true)
    try {
      await apiForgotPassword(forgotEmail.trim())
    } catch {
    } finally {
      setResendLoading(false)
      setResendCooldown(60)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotEmailError("E-mail é obrigatório")
      return
    }
    if (!isValidEmail(forgotEmail)) {
      setForgotEmailError("Formato de e-mail inválido")
      return
    }
    setForgotEmailError(undefined)
    setForgotApiError(null)
    setLoading(true)
    try {
      await apiForgotPassword(forgotEmail.trim())
      setForgotSent(true)
      setResendCooldown(60)
    } catch (error: any) {
      setForgotApiError(error.message || "Erro ao enviar link de redefinição.")
    } finally {
      setLoading(false)
    }
  }

  function openForgotView() {
    setForgotEmail(loginEmail)
    setForgotEmailError(undefined)
    setForgotApiError(null)
    setForgotSent(false)
    setView("forgot")
  }

  function backToLogin() {
    setView("tabs")
    setForgotSent(false)
    setForgotEmail("")
    setForgotApiError(null)
    setResendCooldown(0)
  }

  const passwordStrength = getPasswordStrength(signupPassword)
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === signupPassword

  return (
    <div className="relative isolate flex h-screen items-center justify-center overflow-y-auto bg-background bg-gradient-to-br from-primary-soft/60 via-background to-primary-soft/40 p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-banner-to/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-[390px] gap-0 rounded-panel border-border/70 bg-card py-6 shadow-card">
        <CardHeader className="gap-0 px-6 pb-5 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-banner shadow-lg shadow-primary/30">
            <BookOpen className="size-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight">English Slang App</CardTitle>
          <CardDescription className="mt-1.5 text-[13px]">Seu dicionário inteligente de gírias e vocabulário</CardDescription>
        </CardHeader>

        <CardContent className="px-6">
          {view === "forgot" ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={backToLogin}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar para o login
              </button>

              {forgotSent ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-success-soft">
                    <MailCheck className="size-8 text-success" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold">Verifique seu e-mail</p>
                    <p className="px-4 text-sm text-muted-foreground">
                      Se <span className="font-medium text-foreground">{forgotEmail}</span> estiver cadastrado,
                      você receberá um link para redefinir sua senha em breve.
                    </p>
                  </div>
                  <div className="mt-2 w-full space-y-2">
                    <Button
                      className={primaryBtn}
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resendLoading}
                    >
                      {resendLoading ? (
                        <><Loader2 className="size-4 mr-2 animate-spin" /> Enviando…</>
                      ) : resendCooldown > 0 ? (
                        `Reenviar em ${resendCooldown}s`
                      ) : (
                        "Reenviar e-mail"
                      )}
                    </Button>
                    <Button variant="outline" className="h-11 w-full rounded-[10px]" onClick={backToLogin}>
                      Voltar para o login
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <p className="pb-1 text-sm text-muted-foreground">
                      Digite seu e-mail e enviaremos um link para redefinir sua senha.
                    </p>
                    <Label htmlFor="forgot-email" className={fieldLabel}>E-mail</Label>
                    <div className="relative">
                      <Mail className={fieldIcon} aria-hidden="true" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="voce@exemplo.com"
                        autoFocus
                        className={cn(fieldInput, (forgotEmailError || forgotApiError) && fieldInputError)}
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value)
                          if (forgotEmailError) setForgotEmailError(undefined)
                          if (forgotApiError) setForgotApiError(null)
                        }}
                        onBlur={() => {
                          if (!forgotEmail.trim()) setForgotEmailError("E-mail é obrigatório")
                          else if (!isValidEmail(forgotEmail)) setForgotEmailError("Formato de e-mail inválido")
                        }}
                      />
                    </div>
                    {forgotEmailError && (
                      <p className={fieldError}>
                        <XCircle className="size-3" /> {forgotEmailError}
                      </p>
                    )}
                  </div>

                  {forgotApiError && (
                    <div className={apiErrorBox}>
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{forgotApiError}</span>
                    </div>
                  )}

                  <Button className={primaryBtn} type="submit" disabled={loading}>
                    {loading ? <Loader2 className="size-5 animate-spin" /> : "Enviar link de redefinição"}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full gap-0">
              <TabsList className="mb-5 grid h-11 w-full grid-cols-2 rounded-xl bg-primary-soft/70 p-1">
                <TabsTrigger value="login" className={tabTrigger}>
                  <LogIn aria-hidden="true" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className={tabTrigger}>
                  <UserPlus aria-hidden="true" />
                  Criar Conta
                </TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className={fieldLabel}>E-mail</Label>
                    <div className="relative">
                      <Mail className={fieldIcon} aria-hidden="true" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="voce@exemplo.com"
                        className={cn(fieldInput, loginErrors.email && fieldInputError)}
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value)
                          if (loginErrors.email) setLoginErrors((prev) => ({ ...prev, email: undefined }))
                          if (loginApiError) setLoginApiError(null)
                        }}
                        onBlur={() => setLoginErrors((prev) => ({ ...prev, email: validateLoginField("email", loginEmail) }))}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className={fieldError}>
                        <XCircle className="size-3" /> {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className={fieldLabel}>Senha</Label>
                      <button
                        type="button"
                        onClick={openForgotView}
                        className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={fieldIcon} aria-hidden="true" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        className={cn(fieldInput, "pr-10", loginErrors.password && fieldInputError)}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value)
                          if (loginErrors.password) setLoginErrors((prev) => ({ ...prev, password: undefined }))
                          if (loginApiError) setLoginApiError(null)
                        }}
                        onBlur={() => setLoginErrors((prev) => ({ ...prev, password: validateLoginField("password", loginPassword) }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                        className={trailingBtn}
                      >
                        {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className={fieldError}>
                        <XCircle className="size-3" /> {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {loginApiError && (
                    <div className={apiErrorBox}>
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{loginApiError}</span>
                    </div>
                  )}

                  {emailNotVerifiedFor && (
                    <div className="space-y-2 rounded-[10px] border border-warning/20 bg-warning-soft px-3 py-3">
                      <div className="flex items-start gap-2 text-sm text-warning-soft-foreground">
                        <MailCheck className="mt-0.5 size-4 shrink-0" />
                        <span>
                          Verifique seu e-mail antes de entrar. Enviamos um link para{" "}
                          <span className="font-medium">{emailNotVerifiedFor}</span>.
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-[10px] border-warning/30 bg-card text-warning-soft-foreground hover:bg-warning-soft hover:text-warning-soft-foreground"
                        onClick={handleResendVerification}
                        disabled={verifyResendCooldown > 0 || verifyResendLoading}
                      >
                        {verifyResendLoading ? (
                          <><Loader2 className="size-3 mr-2 animate-spin" />Enviando…</>
                        ) : verifyResendCooldown > 0 ? (
                          `Reenviar em ${verifyResendCooldown}s`
                        ) : (
                          "Reenviar e-mail de verificação"
                        )}
                      </Button>
                    </div>
                  )}

                  <Button className={cn(primaryBtn, "mt-2")} type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        Entrar Agora
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup">
                {signupSuccess ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-success-soft">
                      <MailCheck className="size-8 text-success" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-bold">Conta criada com sucesso!</p>
                      <p className="px-4 text-sm text-muted-foreground">
                        Enviamos um link de confirmação para{" "}
                        <span className="font-medium text-foreground">{signupEmail}</span>.
                        Verifique sua caixa de entrada antes de fazer login.
                      </p>
                    </div>
                    <Button
                      className={cn(primaryBtn, "mt-2")}
                      onClick={() => {
                        setSignupSuccess(false)
                        setActiveTab("login")
                        setLoginEmail(signupEmail)
                      }}
                    >
                      Ir para o login
                    </Button>
                  </div>
                ) : (
                <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className={fieldLabel}>E-mail</Label>
                    <div className="relative">
                      <Mail className={fieldIcon} aria-hidden="true" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="voce@exemplo.com"
                        className={cn(fieldInput, signupErrors.email && fieldInputError)}
                        value={signupEmail}
                        onChange={(e) => {
                          setSignupEmail(e.target.value)
                          if (signupErrors.email) setSignupErrors((prev) => ({ ...prev, email: undefined }))
                          if (signupApiError) setSignupApiError(null)
                        }}
                        onBlur={() => setSignupErrors((prev) => ({ ...prev, email: validateSignupField("email", signupEmail) }))}
                      />
                    </div>
                    {signupErrors.email && (
                      <p className={fieldError}>
                        <XCircle className="size-3" /> {signupErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className={fieldLabel}>Senha</Label>
                    <div className="relative">
                      <Lock className={fieldIcon} aria-hidden="true" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Mínimo de 8 caracteres"
                        className={cn(fieldInput, "pr-10", signupErrors.password && fieldInputError)}
                        value={signupPassword}
                        onChange={(e) => {
                          setSignupPassword(e.target.value)
                          if (signupErrors.password) setSignupErrors((prev) => ({ ...prev, password: undefined }))
                        }}
                        onBlur={() => setSignupErrors((prev) => ({ ...prev, password: validateSignupField("password", signupPassword) }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? "Ocultar senha" : "Mostrar senha"}
                        className={trailingBtn}
                      >
                        {showSignupPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className={fieldError}>
                        <XCircle className="size-3" /> {signupErrors.password}
                      </p>
                    )}
                    {passwordStrength && !signupErrors.password && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <EyebrowLabel as="span" className="text-[10px]">Força da senha</EyebrowLabel>
                          <span className={cn("text-[11px] font-semibold", strengthTextClass[passwordStrength.tone])}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <SegmentedProgress
                          segments={3}
                          value={passwordStrength.value}
                          tone={passwordStrength.tone}
                          aria-label="Força da senha"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className={fieldLabel}>Confirmar Senha</Label>
                    <div className="relative">
                      <History className={fieldIcon} aria-hidden="true" />
                      <Input
                        id="confirmPassword"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Digite novamente a senha"
                        className={cn(
                          fieldInput,
                          "pr-10",
                          signupErrors.confirmPassword && fieldInputError,
                          passwordsMatch && "border-success focus-visible:border-success focus-visible:ring-success/20",
                        )}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (signupErrors.confirmPassword) setSignupErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                        }}
                        onBlur={() => setSignupErrors((prev) => ({ ...prev, confirmPassword: validateSignupField("confirmPassword", confirmPassword) }))}
                      />
                      <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2">
                        {confirmPassword && (
                          passwordsMatch
                            ? <CheckCircle2 className="size-4 text-success" />
                            : <XCircle className="size-4 text-destructive" />
                        )}
                      </div>
                    </div>
                    {signupErrors.confirmPassword && (
                      <p className={fieldError}>
                        <XCircle className="size-3" /> {signupErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {signupApiError && (
                    <div className={apiErrorBox}>
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{signupApiError}</span>
                    </div>
                  )}

                  <Button className={cn(primaryBtn, "mt-2")} type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        Criar Minha Conta
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>

        <CardFooter className="px-6 pt-5">
          <div className="flex w-full items-center gap-2 rounded-[10px] border border-primary/10 bg-primary-soft/60 px-3 py-2.5 text-xs font-medium text-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Aprenda gírias e expressões reais de forma inteligente</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
