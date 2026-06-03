"use client"

import { useState } from "react"
import { login as apiLogin, signup as apiSignup } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookMarked, Loader2, Mail, Lock, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function mapAuthError(message: string): string {
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

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({})
  const [loginApiError, setLoginApiError] = useState<string | null>(null)

  // Signup state
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [signupErrors, setSignupErrors] = useState<SignupErrors>({})
  const [signupApiError, setSignupApiError] = useState<string | null>(null)

  // Login validation
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
    setLoading(true)
    try {
      await apiLogin(loginEmail.trim(), loginPassword)
      toast.success("Bem-vindo de volta!")
      window.location.href = "/"
    } catch (error: any) {
      setLoginApiError(mapAuthError(error.message || ""))
    } finally {
      setLoading(false)
    }
  }

  // Signup validation 
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
      toast.success("Conta criada! Verifique seu e-mail para confirmar.")
    } catch (error: any) {
      setSignupApiError(mapAuthError(error.message || ""))
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(signupPassword)
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === signupPassword

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
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
          <Tabs defaultValue="login" className="w-full">
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
                  <Label htmlFor="login-password">Senha</Label>
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

                <Button className="w-full h-11 text-lg font-semibold mt-2" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Entrar Agora"}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
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
            </TabsContent>
          </Tabs>
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
