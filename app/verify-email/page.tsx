"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authFetch } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const primaryBtn = "h-11 w-full rounded-[10px] text-sm font-semibold shadow-md shadow-primary/25"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Link inválido ou expirado.")
      return
    }

    authFetch("/auth/verify-email", {
      method: "POST",
      skipCsrf: true,
      body: JSON.stringify({ token }),
    }).then(async (res) => {
      if (res.ok) {
        setStatus("success")
        setTimeout(() => router.push("/login"), 3000)
      } else {
        const err = await res.json().catch(() => ({}))
        setStatus("error")
        setMessage(err.detail || "Link inválido ou expirado. Solicite um novo.")
      }
    }).catch(() => {
      setStatus("error")
      setMessage("Erro ao conectar com o servidor.")
    })
  }, [token, router])

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="size-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando seu e-mail…</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold">E-mail verificado!</p>
            <p className="px-4 text-sm text-muted-foreground">Sua conta está ativa. Redirecionando para o login…</p>
          </div>
          <Button className={cn(primaryBtn, "mt-2")} onClick={() => router.push("/login")}>
            Ir para o login
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="flex size-16 items-center justify-center rounded-full bg-destructive-soft">
            <XCircle className="size-8 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold">Verificação falhou</p>
            <p className="px-4 text-sm text-muted-foreground">{message}</p>
          </div>
          <Button variant="outline" className="mt-2 h-11 w-full rounded-[10px]" onClick={() => router.push("/login")}>
            Voltar para o login
          </Button>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
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
          <CardTitle className="text-2xl font-extrabold tracking-tight">Confirmação de e-mail</CardTitle>
          <CardDescription className="mt-1.5 text-[13px]">English Slang App</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
            <VerifyEmailContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
