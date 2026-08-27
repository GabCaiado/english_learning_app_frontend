"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPassword as apiResetPassword } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookMarked, Loader2, Lock, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [confirmError, setConfirmError] = useState<string | undefined>()
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password

  function validatePassword(value: string): string | undefined {
    if (!value) return "Senha é obrigatória"
    if (value.length < 8) return "A senha deve ter pelo menos 8 caracteres"
  }

  function validateConfirm(value: string): string | undefined {
    if (!value) return "Confirmação de senha é obrigatória"
    if (value !== password) return "As senhas não coincidem"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pErr = validatePassword(password)
    const cErr = validateConfirm(confirmPassword)
    if (pErr || cErr) {
      setPasswordError(pErr)
      setConfirmError(cErr)
      return
    }
    if (!token) return

    setApiError(null)
    setLoading(true)
    try {
      await apiResetPassword(token, password)
      setSuccess(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch (error: any) {
      setApiError(error.message || "Erro ao redefinir senha. O link pode ter expirado.")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-base">Link inválido</p>
          <p className="text-sm text-muted-foreground px-4">
            Este link de redefinição é inválido ou expirou. Solicite um novo link.
          </p>
        </div>
        <Button variant="outline" className="w-full mt-2" onClick={() => router.push("/login")}>
          Voltar para o login
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-base">Senha redefinida!</p>
          <p className="text-sm text-muted-foreground px-4">
            Sua senha foi atualizada com sucesso. Redirecionando para o login…
          </p>
        </div>
        <Button className="w-full mt-2" onClick={() => router.push("/login")}>
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="new-password">Nova senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoFocus
            className={cn("pl-10 pr-10", passwordError && "border-red-500 focus-visible:ring-red-500")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError(undefined)
              if (apiError) setApiError(null)
            }}
            onBlur={() => setPasswordError(validatePassword(password))}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {passwordError && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <XCircle className="w-3 h-3" /> {passwordError}
          </p>
        )}
        {passwordStrength && !passwordError && (
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
        <Label htmlFor="confirm-password">Confirmar nova senha</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            className={cn(
              "pl-10 pr-10",
              confirmError && "border-red-500 focus-visible:ring-red-500",
              passwordsMatch && "border-green-500 focus-visible:ring-green-500",
            )}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (confirmError) setConfirmError(undefined)
            }}
            onBlur={() => setConfirmError(validateConfirm(confirmPassword))}
          />
          <div className="absolute right-3 top-3">
            {confirmPassword && (
              passwordsMatch
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
        {confirmError && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <XCircle className="w-3 h-3" /> {confirmError}
          </p>
        )}
      </div>

      {apiError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <Button className="w-full h-11 text-base font-semibold mt-2" type="submit" disabled={loading}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Redefinir senha"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
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
            <CardTitle className="text-3xl font-bold tracking-tight">Nova senha</CardTitle>
            <CardDescription className="text-base">Escolha uma senha segura para sua conta</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 text-center pb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Aprenda gírias de forma inteligente</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
