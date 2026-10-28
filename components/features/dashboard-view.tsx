"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Flame,
  Sparkles,
  Trophy,
  Search,
  Zap,
  CalendarCheck,
  CheckCircle2,
  Star,
  Bookmark,
  RotateCw,
  BrainCircuit,
} from "lucide-react"
import { EyebrowLabel, Pill, StatCard } from "@/components/shared"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { addWord, getWordsForReview, getWordOfTheDay, getWeeklyProgress, type WordOfTheDay, type DailyWordCount } from "@/lib/api"
import { getLevelProgress } from "@/lib/leveling"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"

interface DashboardProps {
  onNavigateToRevisions: () => void
}

interface ReviewItem {
  word: string
  translation: string
  mastery_level: "new" | "familiar" | "mastered"
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
}

// Highlights the first case-insensitive occurrence of `term` inside `sentence`.
function highlightTerm(sentence: string, term: string) {
  if (!term) return sentence
  const idx = sentence.toLowerCase().indexOf(term.toLowerCase())
  if (idx < 0) return sentence
  return (
    <>
      {sentence.slice(0, idx)}
      <mark className="rounded-md bg-primary-soft px-1 font-semibold text-primary-soft-foreground">
        {sentence.slice(idx, idx + term.length)}
      </mark>
      {sentence.slice(idx + term.length)}
    </>
  )
}

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

  const currentStreak = user?.current_streak ?? 0
  const dailyGoal = user?.daily_goal ?? 10
  // weekly endpoint returns a rolling 7-day window ending today (word_service.get_weekly_progress)
  const todayCount = weeklyProgress.length > 0 ? weeklyProgress[weeklyProgress.length - 1].count : 0
  const dailyGoalPercentage = dailyGoal > 0 ? Math.min(100, Math.round((todayCount / dailyGoal) * 100)) : 0
  const xpRemaining = Math.max(0, levelProgress.xpToNextLevel - levelProgress.currentLevelXp)
  const levelLabel = user?.learning_level
    ? (LEVEL_LABELS[user.learning_level.toLowerCase()] ?? user.learning_level)
    : null

  const weeklyGoalCurrent = weeklyProgress.reduce((sum, d) => sum + d.count, 0)
  const weeklyGoalTarget = user?.daily_goal ?? 10
  const weeklyGoalPercentage = weeklyGoalTarget > 0
    ? Math.min(100, Math.round((weeklyGoalCurrent / weeklyGoalTarget) * 100))
    : 0
  const weeklyRemaining = Math.max(0, weeklyGoalTarget - weeklyGoalCurrent)
  const maxProgress = Math.max(1, ...progressData.map((d) => d.words))

  return (
    <PageContainer>
      {/* Header */}
      <header className="mb-6">
        <EyebrowLabel tone="primary">Dashboard</EyebrowLabel>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight text-foreground">
          Olá, {userName}! 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vamos expandir seu vocabulário e dominar novas gírias hoje!
        </p>
      </header>

      {/* Stats Cards */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard
          className="rounded-panel"
          eyebrow="Nível"
          value={`Nível ${levelProgress.level}`}
          subtitle={levelLabel ?? undefined}
          icon={Trophy}
          iconTone="primary"
          divider={false}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Progresso de XP</span>
            <span className="font-bold text-foreground">
              {levelProgress.currentLevelXp} / {levelProgress.xpToNextLevel} XP
            </span>
          </div>
          <Progress value={levelProgress.progressPercent} className="mt-2 h-2 bg-primary-soft" />
          <p className="mt-2 text-xs text-muted-foreground">
            Faltam {xpRemaining} XP para o Nível {levelProgress.level + 1}
          </p>
        </StatCard>

        <StatCard
          className="rounded-panel"
          eyebrow="Sequência Diária"
          value={`${currentStreak} ${currentStreak === 1 ? "dia" : "dias"}`}
          subtitle={currentStreak > 0 ? <Pill variant="warning" size="sm">Streak ativo!</Pill> : undefined}
          icon={Flame}
          iconTone="warning"
        >
          <p className="flex items-start gap-2 text-sm text-foreground">
            <Zap className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            {currentStreak > 0
              ? `Em chamas hoje! Complete uma lição para garantir o ${currentStreak + 1}º dia.`
              : "Adicione uma palavra hoje para começar sua sequência."}
          </p>
        </StatCard>

        <StatCard
          className="rounded-panel"
          eyebrow="Meta Diária"
          value={`${dailyGoal} palavras`}
          subtitle="Meta de Vocabulário"
          subtitleTone="success"
          icon={CalendarCheck}
          iconTone="success"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
              {todayCount} de {dailyGoal} concluídas hoje
            </span>
            <span className="font-bold text-success">{dailyGoalPercentage}%</span>
          </div>
        </StatCard>
      </div>

      {/* Add New Word */}
      <section className="mb-6 rounded-panel border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Digite uma palavra ou gíria em inglês..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
              className="h-11 rounded-xl border-border bg-muted/40 pl-10 text-sm shadow-none"
              disabled={loading}
              aria-label="Nova palavra em inglês"
            />
          </div>
          <Button
            className="h-11 rounded-xl px-6 font-semibold"
            onClick={handleAddWord}
            disabled={loading}
          >
            <Plus className="size-4" />
            {loading ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          A IA busca traduções, contexto de formalidade e pronúncia automaticamente.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_2fr]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Palavra do Dia */}
          <section className="relative overflow-hidden rounded-panel border border-border bg-card p-6 shadow-card">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-warning-strong"
            />
            <EyebrowLabel tone="primary" icon={Star}>
              Palavra do Dia
            </EyebrowLabel>
            {wordOfTheDay ? (
              <div className="mt-4">
                <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
                  {wordOfTheDay.word}
                </h2>
                <p className="mt-1 text-lg font-semibold text-warning-strong">
                  {wordOfTheDay.translation_pt}
                </p>
                {wordOfTheDay.meaning_pt && (
                  <p className="mt-1 text-sm text-muted-foreground">{wordOfTheDay.meaning_pt}</p>
                )}
                {wordOfTheDay.example && (
                  <div className="mt-4 space-y-2 rounded-xl border border-border bg-primary-soft/40 p-4 text-sm">
                    <p className="flex gap-2 text-foreground">
                      <span className="shrink-0 pt-0.5 text-xs font-bold text-muted-foreground">EN</span>
                      <span>&ldquo;{highlightTerm(wordOfTheDay.example, wordOfTheDay.word)}&rdquo;</span>
                    </p>
                    {wordOfTheDay.example_pt && (
                      <p className="flex gap-2 border-t border-border pt-2 text-muted-foreground">
                        <span className="shrink-0 pt-0.5 text-xs font-bold">PT</span>
                        <span>&ldquo;{wordOfTheDay.example_pt}&rdquo;</span>
                      </p>
                    )}
                  </div>
                )}
                <Button
                  className="mt-5 h-12 w-full rounded-xl font-semibold"
                  onClick={handleAddWordOfTheDay}
                  disabled={addingWordOfDay}
                >
                  <Bookmark className="size-4" />
                  {addingWordOfDay ? "Adicionando..." : "Adicionar ao meu caderninho"}
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {wordOfTheDayError
                  ? "Não foi possível buscar uma palavra do dia agora. Tente novamente mais tarde."
                  : "Carregando..."}
              </div>
            )}
          </section>

          {/* Seu Progresso */}
          <section className="flex flex-1 flex-col rounded-panel border border-border bg-card p-6 shadow-card">
            <EyebrowLabel>Consistência</EyebrowLabel>
            <h2 className="mt-1.5 text-xl font-bold text-foreground">Seu Progresso</h2>
            <div className="mt-4 flex flex-1 flex-col justify-end rounded-xl bg-primary-soft/40 px-4 pb-3 pt-4">
              {progressData.length > 0 ? (
                <>
                  <div className="flex h-[150px] items-end gap-2 sm:gap-3">
                    {progressData.map((d, i) => {
                      const isToday = i === progressData.length - 1
                      return (
                        <div
                          key={`${d.day}-${i}`}
                          className="flex flex-1 flex-col items-center justify-end gap-1.5"
                        >
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isToday ? "text-primary" : "text-foreground",
                            )}
                          >
                            {d.words}
                          </span>
                          <div
                            className={cn("w-full rounded-t-lg", isToday ? "bg-primary" : "bg-primary-soft")}
                            style={{ height: `${Math.max(6, Math.round((d.words / maxProgress) * 120))}px` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex gap-2 sm:gap-3">
                    {progressData.map((d, i) => (
                      <span
                        key={`${d.day}-l-${i}`}
                        className={cn(
                          "flex-1 text-center text-xs font-medium",
                          i === progressData.length - 1 ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {d.day}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem dados de progresso ainda.
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Total de {weeklyGoalCurrent} novas palavras assimiladas nos últimos 7 dias
            </p>
          </section>
        </div>

        {/* Right column */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Meta Semanal */}
          <section className="rounded-panel border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <EyebrowLabel>Próximo Objetivo</EyebrowLabel>
              {weeklyRemaining > 0 ? (
                <Pill variant="destructive" size="sm">
                  Faltam {weeklyRemaining} palavras
                </Pill>
              ) : (
                <Pill variant="success" size="sm">
                  Meta atingida! 🎉
                </Pill>
              )}
            </div>
            <h2 className="mt-3 text-lg font-bold text-foreground">Meta Semanal de Vocabulário</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {weeklyGoalCurrent} / {weeklyGoalTarget} palavras aprendidas esta semana
            </p>
            <Progress
              value={weeklyGoalPercentage}
              className="mt-4 h-2 bg-primary-soft"
              aria-label="Progresso da meta semanal"
            />
          </section>

          {/* Revisão Inteligente */}
          <section className="flex flex-1 flex-col rounded-panel border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <BrainCircuit className="size-5 text-primary" aria-hidden="true" />
                Revisão Inteligente
              </h2>
              {reviewList.length > 0 && (
                <Pill variant="primary" size="sm">
                  {reviewList.length} pendentes
                </Pill>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Palavras prestes a sumir da sua memória de longo prazo segundo o algoritmo de repetição espaçada.
            </p>
            <div className="mb-4 mt-4 space-y-3">
              {reviewList.length > 0 ? (
                reviewList.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-primary-soft/40 p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{item.word}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.translation}</p>
                      <Pill
                        variant={item.mastery_level === "new" ? "destructive" : "warning"}
                        size="sm"
                        className="mt-2 uppercase"
                      >
                        {item.mastery_level === "new" ? "Urgente" : "Revisar"}
                      </Pill>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 rounded-lg px-4 font-semibold"
                      onClick={onNavigateToRevisions}
                    >
                      Revisar
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma palavra para revisar hoje! 🎉
                </div>
              )}
            </div>
            <Button className="mt-auto h-12 w-full rounded-xl font-semibold" onClick={onNavigateToRevisions}>
              <RotateCw className="size-4" />
              Ver todas as revisões{reviewList.length > 0 ? ` (${reviewList.length} pendentes)` : ""}
            </Button>
          </section>
        </div>
      </div>
    </PageContainer>
  )
}
