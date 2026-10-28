"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LogOut,
  Eye,
  EyeOff,
  Flame,
  BookMarked,
  BookOpen,
  ShieldCheck,
  KeyRound,
  Crown,
  Star,
  GraduationCap,
  CalendarDays,
  Zap,
  Library,
} from "lucide-react"
import { StatCard, TonalIcon, Pill } from "@/components/shared"
import { useAuth } from "@/hooks/use-auth"
import { getUserWords } from "@/lib/api"
import { PageContainer } from "@/components/layout/page-container"

// ---------------------------------------------------------------------------
// Streak helpers
// ---------------------------------------------------------------------------

function calculateStreak(words: Array<{ created_at?: string }>): number {
  if (!words.length) return 0

  // Collect unique calendar days (UTC date string YYYY-MM-DD)
  const daySet = new Set<string>()
  for (const w of words) {
    const d = w.created_at?.split("T")[0]
    if (d) daySet.add(d)
  }

  const sorted = Array.from(daySet).sort().reverse() // newest first

  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0]

  // Streak must be active (word added today or yesterday)
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00")
    const curr = new Date(sorted[i] + "T12:00:00")
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86_400_000)
    if (diff === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { signout, user, updatePassword } = useAuth()

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [streak, setStreak] = useState<number | null>(null)

  // Populate from auth session
  useEffect(() => {
    if (user) {
      setName(user.full_name || user.username || user.email?.split("@")[0] || "Usuário")
      setEmail(user.email || "")
    }
  }, [user])

  // Fetch real stats
  useEffect(() => {
    if (!user) return
    getUserWords()
      .then((data) => {
        setWordCount(data.total)
        setStreak(calculateStreak(data.items))
      })
      .catch(() => {
        setWordCount(0)
        setStreak(0)
      })
  }, [user])

  const initials = name
    ? name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  const progressLabel = wordCount === null ? "—" : `${Math.min(wordCount, 100)}%`

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* ── Banner do perfil ── */}
      <section className="relative overflow-hidden rounded-panel bg-gradient-banner p-6 text-primary-foreground shadow-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative shrink-0">
              <Avatar className="size-20 ring-[3px] ring-warning-strong ring-offset-[3px] ring-offset-primary">
                <AvatarImage
                  src={user?.avatar_url ?? undefined}
                  className="object-cover"
                />
                <AvatarFallback className="bg-card text-3xl font-extrabold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-warning-strong text-foreground ring-2 ring-primary"
              >
                <Star className="size-3.5 fill-current" />
              </span>
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold tracking-tight">{name}</h1>
                <Pill
                  size="sm"
                  icon={Crown}
                  className="bg-warning-strong font-bold uppercase tracking-wide text-foreground"
                >
                  Free Plan
                </Pill>
              </div>
              <p className="truncate text-sm text-primary-foreground/80">{email}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Pill
                  icon={GraduationCap}
                  className="bg-primary-foreground/15 text-primary-foreground"
                >
                  Nível Iniciante
                </Pill>
                {memberSince && (
                  <Pill
                    icon={CalendarDays}
                    className="bg-primary-foreground/15 text-primary-foreground"
                  >
                    Membro desde {memberSince}
                  </Pill>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => signout()}
            className="h-10 shrink-0 rounded-lg px-4 font-semibold shadow-card"
          >
            <LogOut className="size-4" />
            Sair da Conta
          </Button>
        </div>
      </section>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          eyebrow="Vocabulário Ativo"
          value={wordCount === null ? "—" : wordCount}
          unit={wordCount === null ? undefined : "palavras"}
          icon={BookMarked}
          iconTone="primary"
          subtitle={<><Library />Palavras no seu caderninho</>}
          subtitleTone="success"
        />
        <StatCard
          eyebrow="Sequência Diária"
          value={streak === null ? "—" : streak}
          unit={streak === null ? undefined : streak === 1 ? "dia consecutivo" : "dias consecutivos"}
          icon={Flame}
          iconTone="warning"
          surface="warning"
          subtitle={<><Zap />Pratique amanhã para manter a chama!</>}
          subtitleTone="warning"
        />
      </div>

      {/* ── Duas colunas (~62% / ~38%) ── */}
      <div className="grid items-stretch gap-6 lg:grid-cols-8">
        {/* Vocabulário Geral */}
        <section className="flex flex-col rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <TonalIcon icon={BookOpen} size="sm" />
              <div>
                <h2 className="text-lg font-bold leading-tight">Vocabulário Geral</h2>
                <p className="text-sm text-muted-foreground">
                  Acompanhe seu progresso rumo ao próximo nível.
                </p>
              </div>
            </div>
            <Pill size="sm" className="font-bold">{progressLabel}</Pill>
          </div>

          <div className="mt-5 flex flex-1 flex-col justify-center rounded-xl border border-border bg-muted/60 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <GraduationCap className="size-4 text-primary" />
                Rumo ao próximo nível
              </span>
              <span className="font-bold text-primary">{progressLabel}</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-primary-soft">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.min(wordCount ?? 0, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {wordCount === null ? "" : `${wordCount} de 100 palavras para o próximo nível`}
            </p>
          </div>
        </section>

        {/* Segurança da Conta */}
        <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card lg:col-span-3">
          <div className="flex items-start gap-3 border-b border-border pb-4">
            <TonalIcon icon={ShieldCheck} size="sm" />
            <div>
              <h2 className="text-lg font-bold leading-tight">Segurança da Conta</h2>
              <p className="text-sm text-muted-foreground">
                Proteja sua conta alterando sua senha regularmente.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Label htmlFor="password" className="font-semibold">Nova Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite sua nova senha..."
                className="h-11 rounded-lg border-input bg-card pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
              >
                {showPassword
                  ? <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
          </div>

          <Button
            onClick={() => updatePassword(password)}
            disabled={password.length < 6}
            className="mt-5 h-11 w-full rounded-lg font-bold"
          >
            <KeyRound className="size-4" />
            Atualizar Senha
          </Button>
        </section>
      </div>
    </PageContainer>
  )
}
