"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Mail, Lock, LogOut, Award, BookOpen, Settings, Eye, EyeOff, Flame } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getUserWords } from "@/lib/api"

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

  const today     = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0]

  // Streak must be active (word added today or yesterday)
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00")
    const curr = new Date(sorted[i]     + "T12:00:00")
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

  const [password,     setPassword]     = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [name,         setName]         = useState("")
  const [email,        setEmail]        = useState("")
  const [wordCount,    setWordCount]    = useState<number | null>(null)
  const [streak,       setStreak]       = useState<number | null>(null)

  // Populate from auth session
  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário")
      setEmail(user.email || "")
    }
  }, [user])

  // Fetch real stats
  useEffect(() => {
    if (!user) return
    getUserWords()
      .then((words) => {
        setWordCount(words.length)
        setStreak(calculateStreak(words))
      })
      .catch(() => {
        setWordCount(0)
        setStreak(0)
      })
  }, [user])

  const initials = name
    ? name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top banner */}
      <div className="h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-background border-b" />

      <div className="container max-w-5xl -mt-24 pb-12 px-4 mx-auto">
        <div className="grid gap-8 lg:grid-cols-12">

          {/* ── Left column ── */}
          <div className="lg:col-span-4 h-full">
            <Card className="shadow-xl bg-card border border-border h-full flex flex-col">
              <CardHeader className="items-center pt-8 pb-4">

                {/* Avatar */}
                <div className="relative w-fit mx-auto">
                  <Avatar className="w-28 h-28 ring-4 ring-background shadow-xl">
                    <AvatarImage
                      src={user?.user_metadata?.avatar_url}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="text-center mt-4 space-y-1">
                  <CardTitle className="text-xl font-bold">{name}</CardTitle>
                  <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3" />
                    {email}
                  </p>
                  <div className="flex gap-2 justify-center mt-3 flex-wrap">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                      Nível Iniciante
                    </Badge>
                    <Badge variant="outline">Free Plan</Badge>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              {/* Stats — real data */}
              <CardContent className="grid grid-cols-2 gap-3 p-5">
                <div className="p-3 rounded-xl bg-accent/50 border border-border text-center">
                  <p className="text-2xl font-black text-primary">
                    {wordCount === null ? "—" : wordCount}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
                    Palavras
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-accent/50 border border-border text-center">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-black text-orange-500">
                      {streak === null ? "—" : streak}
                    </p>
                    {streak !== null && streak > 0 && (
                      <Flame className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
                    Streak
                  </p>
                </div>
              </CardContent>

              <div className="flex-1" />
              <CardFooter className="p-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signout()}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair da Conta
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* ── Right column ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Security */}
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold tracking-tight">Configurações da Conta</h2>
                </div>
                <CardTitle className="text-base flex items-center gap-2 font-bold">
                  <Lock className="w-4 h-4 text-primary" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Proteja sua conta alterando sua senha regularmente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha..."
                      className="bg-accent/30 border-none h-11 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Mínimo de 6 caracteres.</p>
                </div>
              </CardContent>
              <CardFooter className="bg-accent/10 border-t flex justify-end p-4">
                <Button
                  onClick={() => updatePassword(password)}
                  className="px-8 font-bold"
                  disabled={password.length < 6}
                >
                  Atualizar Senha
                </Button>
              </CardFooter>
            </Card>

            {/* Achievements */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 font-bold">
                  <Award className="w-4 h-4 text-primary" />
                  Conquistas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Vocabulário Geral</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {wordCount === null ? "—" : `${Math.min(wordCount, 100)}%`}
                    </Badge>
                  </div>
                  <div className="h-3 w-full bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(wordCount ?? 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {wordCount === null ? "" : `${wordCount} de 100 palavras para o próximo nível`}
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-3 pt-1">
                  {[
                    { label: "1ª Palavra",  unlocked: (wordCount ?? 0) >= 1  },
                    { label: "10 Palavras", unlocked: (wordCount ?? 0) >= 10 },
                    { label: "3 Dias",      unlocked: (streak    ?? 0) >= 3  },
                    { label: "7 Dias",      unlocked: (streak    ?? 0) >= 7  },
                  ].map((badge) => (
                    <div
                      key={badge.label}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-colors ${
                        badge.unlocked
                          ? "bg-primary/10 border-primary/30"
                          : "bg-accent/30 border-dashed border-muted-foreground/10"
                      }`}
                    >
                      <Award className={`w-7 h-7 ${badge.unlocked ? "text-primary" : "text-muted-foreground/20"}`} />
                      <p className={`text-[9px] font-bold text-center leading-tight px-1 ${
                        badge.unlocked ? "text-primary" : "text-muted-foreground/30"
                      }`}>
                        {badge.label}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
