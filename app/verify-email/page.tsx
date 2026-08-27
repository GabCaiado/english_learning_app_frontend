"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authFetch } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookMarked, Loader2, CheckCircle2, XCircle } from "lucide-react"

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
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando seu e-mail…</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-base">E-mail verificado!</p>
            <p className="text-sm text-muted-foreground">Sua conta está ativa. Redirecionando para o login…</p>
          </div>
          <Button className="w-full mt-2" onClick={() => router.push("/login")}>
            Ir para o login
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-base">Verificação falhou</p>
            <p className="text-sm text-muted-foreground px-4">{message}</p>
          </div>
          <Button variant="outline" className="w-full mt-2" onClick={() => router.push("/login")}>
            Voltar para o login
          </Button>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 shadow-2xl backdrop-blur-sm bg-background/80">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <BookMarked className="w-10 h-10 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Confirmação de e-mail</CardTitle>
            <CardDescription>English Slang App</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
            <VerifyEmailContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
