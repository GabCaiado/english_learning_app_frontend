"use client"

import { useState, useEffect } from "react"
import { login as apiLogin, signup as apiSignup, forgotPassword as apiForgotPassword, resendVerification } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookMarked, Loader2, Mail, Lock, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, ArrowLeft, MailCheck } from "lucide-react"
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

function getPasswordStrength(password: string): { label: string; color: string; width: string } | null {
  if (!password) return null
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const isLong = password.length >= 8
  const score = [isLong, hasUpper, hasNumber, hasSpecial].filter(Boolean).length
  if (score <= 1) return { label: "Fraca", color: "bg-red-500", width: "25%" }
  if (score === 2) return { label: "Razoável", color: "bg-orange-400", width: "50%" }
  if (score === 3) return { label: "Boa", color: "bg-yellow-500", width: "75%" }
  return { label: "Forte", color: "bg-green-500", width: "100%" }
}

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
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-2 shadow-2xl backdrop-blur-sm bg-background/80">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transform hover:scale-105 transition-transform">
            <BookMarked className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight">English Slang App</CardTitle>
            <CardDescription className="text-base">Seu dicionário inteligente de gírias</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {view === "forgot" ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={backToLogin}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </button>

              {forgotSent ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                    <MailCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-base">Verifique seu e-mail</p>
                    <p className="text-sm text-muted-foreground px-4">
                      Se <span className="font-medium text-foreground">{forgotEmail}</span> estiver cadastrado,
                      você receberá um link para redefinir sua senha em breve.
                    </p>
                  </div>
                  <div className="w-full space-y-2 mt-2">
                    <Button
                      className="w-full"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resendLoading}
                    >
                      {resendLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…</>
                      ) : resendCooldown > 0 ? (
                        `Reenviar em ${resendCooldown}s`
                      ) : (
                        "Reenviar e-mail"
                      )}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={backToLogin}>
                      Voltar para o login
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground pb-1">
                      Digite seu e-mail e enviaremos um link para redefinir sua senha.
                    </p>
                    <Label htmlFor="forgot-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        autoFocus
                        className={cn("pl-10", (forgotEmailError || forgotApiError) && "border-red-500 focus-visible:ring-red-500")}
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
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <XCircle className="w-3 h-3" /> {forgotEmailError}
                      </p>
                    )}
                  </div>

                  {forgotApiError && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{forgotApiError}</span>
                    </div>
                  )}

                  <Button className="w-full h-11 text-base font-semibold" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Enviar link de redefinição"}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>

              {/* Login */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <div className="space-y-1">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        className={cn("pl-10", loginErrors.email && "border-red-500 focus-visible:ring-red-500")}
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
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <XCircle className="w-3 h-3" /> {loginErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Senha</Label>
                      <button
                        type="button"
                        onClick={openForgotView}
                        className="text-xs text-primary hover:underline underline-offset-2"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        className={cn("pl-10 pr-10", loginErrors.password && "border-red-500 focus-visible:ring-red-500")}
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
                        className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <XCircle className="w-3 h-3" /> {loginErrors.password}
                      </p>
                    )}
                  </div>

                  {loginApiError && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{loginApiError}</span>
                    </div>
                  )}

                  {emailNotVerifiedFor && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-900 px-3 py-3 space-y-2">
                      <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                        <MailCheck className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          Verifique seu e-mail antes de entrar. Enviamos um link para{" "}
                          <span className="font-medium">{emailNotVerifiedFor}</span>.
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
                        onClick={handleResendVerification}
                        disabled={verifyResendCooldown > 0 || verifyResendLoading}
                      >
                        {verifyResendLoading ? (
                          <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Enviando…</>
                        ) : verifyResendCooldown > 0 ? (
                          `Reenviar em ${verifyResendCooldown}s`
                        ) : (
                          "Reenviar e-mail de verificação"
                        )}
                      </Button>
                    </div>
                  )}

                  <Button className="w-full h-11 text-lg font-semibold mt-2" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Entrar Agora"}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup">
                {signupSuccess ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                      <MailCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-base">Conta criada com sucesso!</p>
                      <p className="text-sm text-muted-foreground px-4">
                        Enviamos um link de confirmação para{" "}
                        <span className="font-medium text-foreground">{signupEmail}</span>.
                        Verifique sua caixa de entrada antes de fazer login.
                      </p>
                    </div>
                    <Button
                      className="w-full mt-2"
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
                  <div className="space-y-1">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="nome@exemplo.com"
                        className={cn("pl-10", signupErrors.email && "border-red-500 focus-visible:ring-red-500")}
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
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <XCircle className="w-3 h-3" /> {signupErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        className={cn("pl-10 pr-10", signupErrors.password && "border-red-500 focus-visible:ring-red-500")}
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
                        className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <XCircle className="w-3 h-3" /> {signupErrors.password}
                      </p>
                    )}
                    {passwordStrength && !signupErrors.password && (
                      <div className="space-y-1 pt-1">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-300", passwordStrength.color)}
                            style={{ width: passwordStrength.width }}
                          />
                        </div>
                        <p className={cn(
                          "text-xs",
                          passwordStrength.label === "Fraca" && "text-red-500",
                          passwordStrength.label === "Razoável" && "text-orange-400",
                          passwordStrength.label === "Boa" && "text-yellow-500",
                          passwordStrength.label === "Forte" && "text-green-500",
                        )}>
                          Força da senha: {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="confirmPassword"
                        type={showSignupPassword ? "text" : "password"}
                        className={cn(
                          "pl-10 pr-10",
                          signupErrors.confirmPassword && "border-red-500 focus-visible:ring-red-500",
                          passwordsMatch && "border-green-500 focus-visible:ring-green-500",
                        )}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (signupErrors.confirmPassword) setSignupErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                        }}
                        onBlur={() => setSignupErrors((prev) => ({ ...prev, confirmPassword: validateSignupField("confirmPassword", confirmPassword) }))}
                      />
                      <div className="absolute right-3 top-3">
                        {confirmPassword && (
                          passwordsMatch
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {signupErrors.confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <XCircle className="w-3 h-3" /> {signupErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {signupApiError && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{signupApiError}</span>
                    </div>
                  )}

                  <Button className="w-full h-11 text-lg font-semibold mt-2 bg-primary/90" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Criar Minha Conta"}
                  </Button>
                </form>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 text-center pb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Aprenda gírias de forma inteligente</span>
          </div>
          <p className="text-xs text-muted-foreground px-8">
            Ao continuar, você concorda com nossos termos de serviço e política de privacidade.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
