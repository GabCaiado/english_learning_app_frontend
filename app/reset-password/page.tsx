"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPassword as apiResetPassword } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BookOpen, Loader2, Lock, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { EyebrowLabel, SegmentedProgress } from "@/components/shared"

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
        <div className="flex size-16 items-center justify-center rounded-full bg-destructive-soft">
          <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold">Link inválido</p>
          <p className="px-4 text-sm text-muted-foreground">
            Este link de redefinição é inválido ou expirou. Solicite um novo link.
          </p>
        </div>
        <Button variant="outline" className="mt-2 h-11 w-full rounded-[10px]" onClick={() => router.push("/login")}>
          Voltar para o login
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold">Senha redefinida!</p>
          <p className="px-4 text-sm text-muted-foreground">
            Sua senha foi atualizada com sucesso. Redirecionando para o login…
          </p>
        </div>
        <Button className={cn(primaryBtn, "mt-2")} onClick={() => router.push("/login")}>
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="new-password" className={fieldLabel}>Nova senha</Label>
        <div className="relative">
          <Lock className={fieldIcon} aria-hidden="true" />
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoFocus
            className={cn(fieldInput, "pr-10", passwordError && fieldInputError)}
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
            className={trailingBtn}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {passwordError && (
          <p className={fieldError}>
            <XCircle className="size-3" /> {passwordError}
          </p>
        )}
        {passwordStrength && !passwordError && (
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
        <Label htmlFor="confirm-password" className={fieldLabel}>Confirmar nova senha</Label>
        <div className="relative">
          <Lock className={fieldIcon} aria-hidden="true" />
          <Input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            className={cn(
              fieldInput,
              "pr-10",
              confirmError && fieldInputError,
              passwordsMatch && "border-success focus-visible:border-success focus-visible:ring-success/20",
            )}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (confirmError) setConfirmError(undefined)
            }}
            onBlur={() => setConfirmError(validateConfirm(confirmPassword))}
          />
          <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2">
            {confirmPassword && (
              passwordsMatch
                ? <CheckCircle2 className="size-4 text-success" />
                : <XCircle className="size-4 text-destructive" />
            )}
          </div>
        </div>
        {confirmError && (
          <p className={fieldError}>
            <XCircle className="size-3" /> {confirmError}
          </p>
        )}
      </div>

      {apiError && (
        <div className={apiErrorBox}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <Button className={cn(primaryBtn, "mt-2")} type="submit" disabled={loading}>
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Redefinir senha"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
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
          <CardTitle className="text-2xl font-extrabold tracking-tight">Nova senha</CardTitle>
          <CardDescription className="mt-1.5 text-[13px]">Escolha uma senha segura para sua conta</CardDescription>
        </CardHeader>

        <CardContent className="px-6">
          <Suspense fallback={<div className="flex h-40 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>

        <CardFooter className="px-6 pt-5">
          <div className="flex w-full items-center gap-2 rounded-[10px] border border-primary/10 bg-primary-soft/60 px-3 py-2.5 text-xs font-medium text-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Aprenda gírias de forma inteligente</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
