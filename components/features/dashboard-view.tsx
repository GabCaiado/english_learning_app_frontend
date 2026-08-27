"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, BookMarked, Target, Flame, Calendar, Sparkles, TrendingUp, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { addWord, getWordsForReview, getWordOfTheDay, getWeeklyProgress, type WordOfTheDay, type DailyWordCount } from "@/lib/api"
import { getLevelProgress } from "@/lib/leveling"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

interface DashboardProps {
  onNavigateToRevisions: () => void
}

interface ReviewItem {
  word: string
  translation: string
  mastery_level: "new" | "familiar" | "mastered"
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function Dashboard({ onNavigateToRevisions }: DashboardProps) {
  const { user } = useAuth()
  const [newWord, setNewWord] = useState("")
  const [loading, setLoading] = useState(false)
  const [reviewList, setReviewList] = useState<ReviewItem[]>([])
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay | null>(null)
  const [wordOfTheDayError, setWordOfTheDayError] = useState(false)
  const [addingWordOfDay, setAddingWordOfDay] = useState(false)
  const [weeklyProgress, setWeeklyProgress] = useState<DailyWordCount[]>([])

  const userName = user?.full_name || user?.username || user?.email?.split("@")[0] || "..."

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getWordsForReview()
        setReviewList(data.slice(0, 3))
      } catch (err) {
        console.error("Erro ao carregar dados:", err)
      }

      try {
        const word = await getWordOfTheDay()
        setWordOfTheDay(word)
      } catch (err) {
        console.error("Erro ao carregar palavra do dia:", err)
        setWordOfTheDayError(true)
      }

      try {
        const progress = await getWeeklyProgress()
        setWeeklyProgress(progress)
      } catch (err) {
        console.error("Erro ao carregar progresso semanal:", err)
      }
    }
    loadData()
  }, [])

  const handleAddWord = async () => {
    if (!newWord.trim()) return

    setLoading(true)
    try {
      await addWord(newWord)
      toast.success(`"${newWord}" adicionada com sucesso!`)
      setNewWord("")
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar palavra")
    } finally {
      setLoading(false)
    }
  }

  const handleAddWordOfTheDay = async () => {
    if (!wordOfTheDay) return

    setAddingWordOfDay(true)
    try {
      await addWord(wordOfTheDay.word, wordOfTheDay.example ?? undefined)
      toast.success(`"${wordOfTheDay.word}" adicionada com sucesso!`)
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar palavra")
    } finally {
      setAddingWordOfDay(false)
    }
  }

  const progressData = weeklyProgress.map((d) => {
    const weekday = WEEKDAY_LABELS[new Date(`${d.date}T00:00:00`).getDay()]
    return { day: weekday, words: d.count }
  })

  const levelProgress = getLevelProgress(user?.total_xp ?? 0)

  const stats = [
    { label: "Sequência Diária", value: String(user?.current_streak ?? 0), icon: Flame, color: "text-orange-500" },
    { label: "Meta Diária", value: String(user?.daily_goal ?? 10), icon: Calendar, color: "text-blue-500" },
  ]

  const weeklyGoalCurrent = weeklyProgress.reduce((sum, d) => sum + d.count, 0)
  const weeklyGoalTarget = user?.daily_goal ?? 10
  const weeklyGoalPercentage = weeklyGoalTarget > 0
    ? Math.min(100, Math.round((weeklyGoalCurrent / weeklyGoalTarget) * 100))
    : 0

  return (
    <div className="p-8 max-w-10/12 mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookMarked className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">DASHBOARD</p>
            <h2 className="text-3xl font-bold text-foreground">Olá, {userName}</h2>
          </div>
        </div>
        <p className="text-xl text-primary font-medium">Vamos aprender novas palavras hoje!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-border/50 hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nível</p>
                <p className="text-3xl font-bold text-foreground">{levelProgress.level}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-primary">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            <Progress value={levelProgress.progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {levelProgress.currentLevelXp} / {levelProgress.xpToNextLevel} XP
            </p>
          </CardContent>
        </Card>
        {stats.map((stat, index) => (
          <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-accent flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Word */}
      <Card className="border-primary/20 bg-accent/30 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Adicionar Nova Palavra
          </CardTitle>
          <p className="text-sm text-muted-foreground">Descubriu uma palavra nova? Adicione ao seu dicionário!</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite a palavra em inglês..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
              className="flex-1"
              disabled={loading}
            />
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleAddWord}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A IA irá buscar traduções, exemplos e pronúncia automaticamente
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Palavra do Dia
            </CardTitle>
            <p className="text-sm text-muted-foreground">Uma palavra nova para você aprender</p>
          </CardHeader>
          <CardContent>
            {wordOfTheDay ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{wordOfTheDay.word}</h3>
                  <p className="text-lg text-muted-foreground">{wordOfTheDay.translation_pt}</p>
                </div>
                {wordOfTheDay.example && (
                  <div className="p-3 rounded-lg bg-background/50 border border-border">
                    <p className="text-sm text-foreground italic mb-1">{wordOfTheDay.example}</p>
                    {wordOfTheDay.example_pt && (
                      <p className="text-xs text-muted-foreground">{wordOfTheDay.example_pt}</p>
                    )}
                  </div>
                )}
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleAddWordOfTheDay}
                  disabled={addingWordOfDay}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addingWordOfDay ? "Adicionando..." : "Adicionar ao meu dicionário"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {wordOfTheDayError
                  ? "Não foi possível buscar uma palavra do dia agora. Tente novamente mais tarde."
                  : "Carregando..."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-success" />
              Próximo Objetivo
            </CardTitle>
            <p className="text-sm text-muted-foreground">Meta semanal de aprendizado</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-foreground mb-2">
                  {weeklyGoalCurrent}
                  <span className="text-2xl text-muted-foreground">/{weeklyGoalTarget}</span>
                </p>
                <p className="text-sm text-muted-foreground">palavras esta semana</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold text-success">{weeklyGoalPercentage}%</span>
                </div>
                <Progress value={weeklyGoalPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground text-center">
                  {weeklyGoalCurrent >= weeklyGoalTarget
                    ? "Meta semanal atingida! 🎉"
                    : `Faltam apenas ${weeklyGoalTarget - weeklyGoalCurrent} palavras para atingir sua meta!`}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-success text-success hover:bg-success/10 bg-transparent"
              >
                Ver todas as metas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Seu Progresso
            </CardTitle>
            <p className="text-sm text-muted-foreground">Palavras aprendidas nos últimos 7 dias</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                words: {
                  label: "Palavras",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[260px] w-full"
            >
              <AreaChart data={progressData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillWords" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-words)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-words)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "hsl(var(--border))" }} />
                <Area
                  type="monotone"
                  dataKey="words"
                  stroke="var(--color-words)"
                  strokeWidth={3}
                  fill="url(#fillWords)"
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Revisão Inteligente
            </CardTitle>
            <p className="text-sm text-muted-foreground">Palavras que precisam ser revisadas hoje</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reviewList.length > 0 ? (
                reviewList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-orange-500/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{item.word}</p>
                        <Badge
                          variant={
                            item.mastery_level === "new" ? "destructive" : "default"
                          }
                          className="text-xs"
                        >
                          {item.mastery_level === "new" ? "Urgente" : "Revisão"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.translation}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                      onClick={onNavigateToRevisions}
                    >
                      Revisar
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nenhuma palavra para revisar hoje! 🎉
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 border-orange-500 text-orange-500 hover:bg-orange-500/10 bg-transparent"
              onClick={onNavigateToRevisions}
            >
              Ver todas as revisões
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
