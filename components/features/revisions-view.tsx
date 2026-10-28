"use client"

import { useState, useEffect, useRef, type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Pill, EyebrowLabel, KbdHint, TonalIcon } from "@/components/shared"
import { cn } from "@/lib/utils"
import {
  Volume2, RotateCcw, CheckCircle2, XCircle,
  Sparkles, TrendingUp, BookOpen, AlertCircle, Keyboard, Eye, Dumbbell, Lock,
  Clock, Target, TriangleAlert, X, Info, PenLine, Zap, Lightbulb, Loader2,
  type LucideIcon,
} from "lucide-react"
import { getWordsForReview, getUserWords, reviewWord } from "@/lib/api"
import { PageContainer } from "@/components/layout/page-container"

const DAILY_KEY = "daily_review_done"
function todayStr() { return new Date().toISOString().split("T")[0] }
function isDoneToday() { return localStorage.getItem(DAILY_KEY) === todayStr() }
function markDoneToday() { localStorage.setItem(DAILY_KEY, todayStr()) }


// Types
interface ReviewWord {
  id: string
  word: string
  normalized_form?: string | null
  translation?: string | null
  is_slang: boolean
  formality_level: string
  category?: string | null
  mastery_level: string
  repetitions: number
  times_correct: number
  times_incorrect: number
  word_examples?: Array<{ example_en: string }>
}


const MASTERY_LABEL: Record<string, string> = {
  new: "Nova",
  learning: "Aprendendo",
  reviewing: "Revisando",
  mastered: "Dominada",
}

const FORMALITY_LABEL: Record<string, string> = {
  neutral: "Uso comum / Neutro",
  informal: "Informal",
  casual: "Casual",
  slang: "Gíria",
  formal: "Formal",
}

function formalityLabel(v?: string | null): string | null {
  return v ? (FORMALITY_LABEL[v] ?? v) : null
}

/** Underline occurrences of `term` inside `sentence` (case-insensitive). */
function highlightTerm(sentence: string, term: string): ReactNode {
  if (!term) return sentence
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = sentence.split(new RegExp(`(${esc})`, "gi"))
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase() ? (
      <span
        key={i}
        className="font-semibold not-italic text-primary underline decoration-primary/60 decoration-2 underline-offset-4"
      >
        {p}
      </span>
    ) : (
      p
    )
  )
}

const RATING_TONE = {
  destructive:
    "border-destructive/20 bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive-soft/70 hover:border-destructive/40 hover:text-destructive-soft-foreground",
  warning:
    "border-warning-strong/30 bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft/70 hover:border-warning-strong/50 hover:text-warning-soft-foreground",
  success:
    "border-success/20 bg-success-soft text-success-soft-foreground hover:bg-success-soft/70 hover:border-success/40 hover:text-success-soft-foreground",
} as const

const RATING_RING = {
  destructive: "ring-2 ring-destructive/40",
  warning: "ring-2 ring-warning-strong/50",
  success: "ring-2 ring-success/40",
} as const

function RatingButton({
  tone,
  icon: Icon,
  label,
  hint,
  highlighted,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  tone: keyof typeof RATING_TONE
  icon: LucideIcon
  label: string
  hint?: string
  highlighted?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      className={cn(
        "h-auto min-w-0 flex-col gap-1 whitespace-normal rounded-xl border px-3 py-3 shadow-none",
        RATING_TONE[tone],
        highlighted && RATING_RING[tone],
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-bold">
        <Icon className="size-4" />
        {label}
      </span>
      {hint ? <span className="text-[11px] font-medium opacity-80">{hint}</span> : null}
    </Button>
  )
}

/** Words in "reviewing" or "mastered" require typing — the user should know them by now */
function isTypeMode(card: ReviewWord): boolean {
  return card.mastery_level === "reviewing" || card.mastery_level === "mastered"
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  const m = na.length
  const n = nb.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        na[i - 1] === nb[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return 1 - dp[m][n] / Math.max(m, n)
}

type AutoResult = "correct" | "close" | "wrong"

function getAutoResult(input: string, reference: string): AutoResult {
  const sim = similarity(input, reference)
  if (sim >= 0.82) return "correct"
  if (sim >= 0.55) return "close"
  return "wrong"
}

// Component
export function Revisions() {
  const [words, setWords] = useState<ReviewWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isFreePractice, setIsFreePractice] = useState(false)

  // Flip-card mode state
  const [isFlipped, setIsFlipped] = useState(false)

  // Type mode state
  const [userInput, setUserInput] = useState("")
  const [showResult, setShowResult] = useState(false)
  const [autoResult, setAutoResult] = useState<AutoResult | null>(null)
  const [hasSeenTypeMode, setHasSeenTypeMode] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isDoneToday()) {
      setSessionDone(true)
      setLoading(false)
    } else {
      loadWords()
    }
  }, [])

  // Auto-focus textarea
  useEffect(() => {
    if (!loading && words.length > 0 && isTypeMode(words[currentIndex]) && !showResult) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [currentIndex, loading, words, showResult])

  async function loadWords({ freePractice = false } = {}) {
    try {
      setLoading(true)
      setError(null)
      setCurrentIndex(0)
      setReviewedCount(0)
      setCorrectCount(0)
      setSessionDone(false)
      setIsFreePractice(freePractice)
      resetCard()
      const data = await getWordsForReview()
      setWords(data)
    } catch {
      setError("Não foi possível carregar as revisões. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function startFreePractice() {
    if (words.length === 0) {
      // No due words loaded — fetch all user words for a free session
      try {
        setLoading(true)
        setError(null)
        setCurrentIndex(0)
        setReviewedCount(0)
        setCorrectCount(0)
        setSessionDone(false)
        setIsFreePractice(true)
        resetCard()
        const data = await getUserWords()
        setWords(data.items)
      } catch {
        setError("Não foi possível carregar as palavras. Tente novamente.")
      } finally {
        setLoading(false)
      }
    } else {
      setCurrentIndex(0)
      setReviewedCount(0)
      setCorrectCount(0)
      setSessionDone(false)
      setIsFreePractice(true)
      resetCard()
    }
  }

  function resetCard() {
    setIsFlipped(false)
    setUserInput("")
    setShowResult(false)
    setAutoResult(null)
  }

  function handleCheckAnswer() {
    const ref = words[currentIndex]?.translation || ""
    setAutoResult(getAutoResult(userInput, ref))
    setShowResult(true)
    if (!hasSeenTypeMode) setHasSeenTypeMode(true)
  }

  async function handleReview(quality: number) {
    const card = words[currentIndex]
    if (!card || submitting) return
    setSubmitting(true)

    if (!isFreePractice) {
      try {
        await reviewWord(card.id, quality)
      } catch {
        console.error("Failed to save review result")
      }
    }

    if (quality >= 3) setCorrectCount(c => c + 1)
    setReviewedCount(c => c + 1)

    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1)
      resetCard()
    } else {
      if (!isFreePractice) markDoneToday()
      setSessionDone(true)
    }
    setSubmitting(false)
  }

  function playAudio(word: string) {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = "en-US"
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md rounded-panel border border-border bg-card p-8 text-center shadow-card sm:p-10">
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
            <TonalIcon icon={Loader2} size="lg" iconClassName="animate-spin" />
            <EyebrowLabel tone="primary">Revisão Diária</EyebrowLabel>
            <p className="text-xl font-bold text-foreground">Carregando revisões...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md rounded-panel border border-border bg-card p-8 text-center shadow-card sm:p-10">
          <div className="flex flex-col items-center gap-4">
            <TonalIcon icon={AlertCircle} tone="destructive" size="lg" />
            <EyebrowLabel>Algo deu errado</EyebrowLabel>
            <p className="text-lg font-bold text-foreground">{error}</p>
            <Button className="h-11 rounded-xl px-6 font-semibold" onClick={() => loadWords()}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (sessionDone) {
    const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-primary-soft/40 via-background to-success-soft/40 p-6 sm:p-8">
        <div className="w-full max-w-2xl space-y-6 rounded-panel border border-border bg-card p-8 text-center shadow-card sm:p-12">
          <TonalIcon icon={CheckCircle2} tone="success" size="lg" className="mx-auto size-16 rounded-full [&_svg]:size-8" />
          <div>
            <EyebrowLabel tone="primary">{isFreePractice ? "Prática Livre" : "Revisão Diária"}</EyebrowLabel>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
              {isFreePractice ? "Prática Concluída!" : "Revisão Diária Concluída!"}
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              {isFreePractice
                ? "Bom treino! Lembre-se que esta prática não afeta seu progresso."
                : "Parabéns! Volte amanhã para a próxima revisão."}
            </p>
          </div>
          {reviewedCount > 0 && (
            <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-xl border border-primary/15 bg-primary-soft/60 p-4">
                <p className="text-3xl font-extrabold text-primary">{correctCount}/{reviewedCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Palavras Lembradas</p>
              </div>
              <div className="rounded-xl border border-success/20 bg-success-soft p-4">
                <p className="text-3xl font-extrabold text-success">{accuracy}%</p>
                <p className="mt-1 text-sm text-muted-foreground">Taxa de Acerto</p>
              </div>
            </div>
          )}

          {/* Daily review locked notice */}
          {!isFreePractice && (
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-muted p-4">
              <Lock className="size-5 shrink-0 text-muted-foreground" />
              <p className="text-left text-sm text-muted-foreground">
                A revisão diária já foi concluída. Suas palavras foram agendadas para os próximos dias.
              </p>
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            {/* Free practice option — always visible, but label changes */}
            <Button size="lg" className="h-11 rounded-xl px-6 font-semibold" onClick={startFreePractice}>
              <Dumbbell />
              {isFreePractice ? "Praticar de Novo" : "Praticar Mais"}
              <span className="text-xs font-normal text-primary-foreground/75">(sem pontos)</span>
            </Button>
            <Button size="lg" variant="outline"
              className="h-11 rounded-xl border-border px-6 font-semibold shadow-none"
              onClick={() => (window.location.href = "/words")}>
              <TrendingUp />
              Ver Progresso
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md space-y-6 rounded-panel border border-border bg-card p-8 text-center shadow-card sm:p-10">
          <TonalIcon icon={CheckCircle2} tone="success" size="lg" className="mx-auto size-16 rounded-full [&_svg]:size-8" />
          <div>
            <EyebrowLabel tone="primary">Revisão Diária</EyebrowLabel>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">Tudo em dia!</h2>
            <p className="mt-2 text-muted-foreground">
              Nenhuma palavra para revisar hoje. Volte amanhã ou adicione novas palavras.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="h-11 rounded-xl px-6 font-semibold" onClick={startFreePractice}>
              <Dumbbell />
              Praticar Mais
              <span className="text-xs font-normal text-primary-foreground/75">(sem pontos)</span>
            </Button>
            <Button variant="outline" className="h-11 rounded-xl border-border font-semibold shadow-none"
              onClick={() => (window.location.href = "/words")}>
              <BookOpen />
              Ver Minhas Palavras
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main flashcard

  const currentCard = words[currentIndex]
  const totalCards = words.length
  const progress = (reviewedCount / totalCards) * 100
  const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0
  const examples = currentCard.word_examples?.map(e => e.example_en).filter(Boolean) ?? []
  const masteryLabel = MASTERY_LABEL[currentCard.mastery_level] ?? "Nova"
  const typeMode = isTypeMode(currentCard)
  const formality = formalityLabel(currentCard.formality_level)
  const upcoming = words.slice(currentIndex + 1, currentIndex + 4)

  const translationBlock = (
    <div className="rounded-xl border border-primary-soft bg-muted p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <EyebrowLabel tone="primary">Tradução direta</EyebrowLabel>
          <p className="mt-2 break-words text-xl font-bold leading-snug text-foreground">
            {currentCard.translation || "—"}
          </p>
        </div>
        {formality && (
          <Pill variant="outline" icon={Info} size="sm" className="font-medium text-muted-foreground">
            {formality}
          </Pill>
        )}
      </div>
      {examples.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <EyebrowLabel className="text-foreground/80">Exemplo no dia a dia:</EyebrowLabel>
          <p className="mt-2 text-base italic leading-relaxed text-foreground">
            “{highlightTerm(examples[0], currentCard.word)}”
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-full bg-background">
      {/* ── Session bar ── */}
      <div className="border-b border-border bg-card/60">
        <PageContainer className="py-3">
        <Progress value={progress} aria-label="Progresso da sessão" className="h-1.5 bg-primary-soft" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Pill variant="primary" icon={Clock}>Revisão Diária</Pill>
            {isFreePractice && <Pill variant="warning" icon={Dumbbell}>Prática Livre</Pill>}
            <span className="text-lg font-bold text-foreground">
              Cartão {currentIndex + 1} de {totalCards}
            </span>
            <span className="text-sm text-muted-foreground">
              • {reviewedCount}/{totalCards} concluídas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Pill variant="outline" icon={typeMode ? Keyboard : Eye} className="font-medium text-muted-foreground">
              {typeMode ? "Recall Ativo" : "Reconhecimento"}
            </Pill>
            <Pill variant="outline" icon={Target} className="font-medium text-muted-foreground">
              <span className="font-bold text-foreground">{accuracy}%</span> Acurácia
            </Pill>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Reiniciar sessão"
              title="Reiniciar sessão"
              onClick={() => loadWords()}
              className="text-muted-foreground hover:text-primary"
            >
              <RotateCcw />
            </Button>
          </div>
        </div>
        </PageContainer>
      </div>

      <PageContainer className="py-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:items-stretch">
          <section className="flex w-full min-w-0 flex-col gap-4">

            {/* ── Free practice banner ── */}
            {isFreePractice && (
              <div className="flex items-center gap-3 rounded-xl border border-warning-strong/30 bg-warning-soft p-3">
                <Dumbbell className="size-5 shrink-0 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-warning-soft-foreground">Modo Prática Livre</p>
                  <p className="text-sm text-warning-soft-foreground/80">
                    Sem efeito no progresso — suas palavras e intervalos de revisão não serão alterados.
                  </p>
                </div>
              </div>
            )}

            {/* ── First-time type mode warning ── */}
            {typeMode && !hasSeenTypeMode && (
              <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-soft/60 p-4">
                <Keyboard className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-primary-soft-foreground">Modo Recall Ativo</p>
                  <p className="text-sm text-muted-foreground">
                    Esta palavra já é familiar! Agora você precisa escrever a tradução de memória.
                    O app vai comparar sua resposta, mas <strong>você decide</strong> se estava certo —
                    outras traduções válidas são aceitas.
                  </p>
                </div>
              </div>
            )}

            {/* ── Flashcard ── */}
            <div className="flex flex-1 flex-col justify-center rounded-panel border border-border bg-card p-6 shadow-card sm:p-8 lg:min-h-[520px]">
              {/* Header row */}
              <div className="flex min-h-6 flex-wrap items-center gap-2">
                {currentCard.category && <Pill variant="warning" icon={Sparkles}>{currentCard.category}</Pill>}
                {currentCard.is_slang && <Pill variant="primary">Slang</Pill>}
              </div>

              {/* Headline (shared by both modes) */}
              <div className="mt-4 flex flex-col items-center text-center">
                <EyebrowLabel>{masteryLabel}</EyebrowLabel>
                <h3 className="mt-3 text-balance break-words text-[40px] font-extrabold leading-[1.1] tracking-tight text-foreground">
                  {currentCard.word}
                </h3>
                {currentCard.is_slang && currentCard.normalized_form &&
                  currentCard.normalized_form !== currentCard.word && (
                    <p className="mt-2 text-base italic text-muted-foreground">→ {currentCard.normalized_form}</p>
                  )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(currentCard.word)}
                  className="mt-4 rounded-full border-primary-soft bg-primary-soft/50 px-4 font-semibold text-primary shadow-none hover:bg-primary-soft hover:text-primary"
                >
                  <Volume2 /> Ouvir Pronúncia
                </Button>
              </div>

              <div className="mt-6">
                {/* FLIP MODE */}
                {!typeMode && (
                  !isFlipped ? (
                    // Front
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary/25 bg-muted px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">Tente lembrar o significado antes de revelar</p>
                      <Button size="lg" onClick={() => setIsFlipped(true)} className="h-11 rounded-xl px-8 font-semibold">
                        <Eye /> Revelar Tradução
                      </Button>
                    </div>
                  ) : (
                    // Back
                    <div>
                      {translationBlock}
                      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-6">
                        <RatingButton tone="destructive" icon={X} label="Não Lembrei" hint="Repetir amanhã"
                          disabled={submitting} onClick={() => handleReview(1)} />
                        <RatingButton tone="warning" icon={TriangleAlert} label="Foi Difícil" hint="Intervalo curto"
                          disabled={submitting} onClick={() => handleReview(3)} />
                        <RatingButton tone="success" icon={CheckCircle2} label="Lembrei Fácil" hint="Intervalo aumenta"
                          disabled={submitting} onClick={() => handleReview(5)} />
                      </div>
                    </div>
                  )
                )}

                {/* TYPE MODE */}
                {typeMode && (
                  !showResult ? (
                    /* Input phase */
                    <div className="space-y-3 rounded-xl border border-primary-soft bg-muted p-5">
                      <EyebrowLabel tone="primary" icon={Keyboard}>Escreva a tradução em português</EyebrowLabel>
                      <div className="relative">
                        <PenLine
                          className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <Textarea
                          ref={inputRef}
                          value={userInput}
                          onChange={e => setUserInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey && userInput.trim().length >= 2) {
                              e.preventDefault()
                              handleCheckAnswer()
                            }
                          }}
                          placeholder="Digite a tradução..."
                          className="min-h-[96px] resize-none rounded-xl border-border bg-card pl-10 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/20"
                        />
                      </div>
                      <Button
                        size="lg"
                        className="h-11 w-full rounded-xl font-semibold"
                        disabled={userInput.trim().length < 2}
                        onClick={handleCheckAnswer}
                      >
                        <CheckCircle2 /> Verificar
                      </Button>
                    </div>
                  ) : (
                    /* Result phase */
                    <div className="space-y-4">
                      {/* Auto-suggestion banner */}
                      {autoResult === "correct" && (
                        <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-soft p-3">
                          <CheckCircle2 className="size-5 shrink-0 text-success" />
                          <p className="text-sm font-semibold text-success-soft-foreground">Muito parecido com a referência!</p>
                        </div>
                      )}
                      {autoResult === "close" && (
                        <div className="flex items-center gap-2 rounded-xl border border-warning-strong/30 bg-warning-soft p-3">
                          <Sparkles className="size-5 shrink-0 text-warning" />
                          <p className="text-sm font-semibold text-warning-soft-foreground">Parcialmente correto — compare abaixo</p>
                        </div>
                      )}
                      {autoResult === "wrong" && (
                        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive-soft p-3">
                          <XCircle className="size-5 shrink-0 text-destructive" />
                          <p className="text-sm font-semibold text-destructive-soft-foreground">Bem diferente da referência — veja abaixo</p>
                        </div>
                      )}

                      {/* User answer */}
                      <div className="rounded-xl border border-border bg-card p-4">
                        <EyebrowLabel>Sua resposta</EyebrowLabel>
                        <p className="mt-1.5 break-words text-base text-foreground">{userInput || "—"}</p>
                      </div>

                      {/* Reference translation */}
                      {translationBlock}

                      {/* Slang note */}
                      {currentCard.is_slang && (
                        <div className="flex items-start gap-2 px-1">
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-primary">Slang:</span>{" "}
                            outras traduções podem ser válidas. Você decide se sua resposta está certa.
                          </p>
                        </div>
                      )}

                      {/* Self-grade buttons — so the user can review it before marking it as correct */}
                      <div className="space-y-2 border-t border-border pt-6">
                        <p className="text-center text-xs font-medium text-muted-foreground">
                          Como você avalia sua resposta?
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <RatingButton tone="destructive" icon={X} label="Errei" hint="Repetir amanhã"
                            highlighted={autoResult === "wrong"}
                            disabled={submitting} onClick={() => handleReview(1)} />
                          <RatingButton tone="warning" icon={TriangleAlert} label="Quase" hint="Intervalo curto"
                            highlighted={autoResult === "close"}
                            disabled={submitting} onClick={() => handleReview(3)} />
                          <RatingButton tone="success" icon={CheckCircle2} label="Acertei!" hint="Intervalo aumenta"
                            highlighted={autoResult === "correct"}
                            disabled={submitting} onClick={() => handleReview(5)} />
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          O botão sugerido está destacado — mas a decisão é sua
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ── Shortcut bar: only shortcuts that actually work (typing mode input) ── */}
            {typeMode && !showResult && (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-border bg-muted px-4 py-2.5">
                <KbdHint label="Verificar">Enter</KbdHint>
                <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/40" />
                <KbdHint label="Nova linha">Shift + Enter</KbdHint>
              </div>
            )}
          </section>
          {/* ── Side column ── */}
          <aside className="min-w-0 space-y-4" aria-label="Resumo da sessão">
            {/* Resumo da Sessão */}
            <div className="space-y-4 rounded-panel border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <Zap className="size-5 shrink-0 fill-current text-primary" aria-hidden="true" />
                <h2 className="text-base font-bold text-foreground">Resumo da Sessão</h2>
                <Pill variant="success" size="sm">Ao Vivo</Pill>
              </div>

              {/* Acertos (points tile omitted per spec → full width) */}
              <div className="rounded-xl border border-border bg-muted p-4">
                <div className="flex items-start justify-between gap-2">
                  <EyebrowLabel>Acertos</EyebrowLabel>
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                </div>
                <p className="mt-2 text-3xl font-extrabold leading-none tracking-tight text-foreground">{correctCount}</p>
                <p className="mt-1.5 text-xs font-medium text-primary">de {reviewedCount} tentados</p>
              </div>

              {/* Taxa de acerto */}
              <div className="rounded-xl border border-border bg-muted p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">Taxa de Acerto</p>
                  <p className="text-xl font-extrabold text-primary">{accuracy}%</p>
                </div>
                <Progress value={accuracy} aria-label="Taxa de acerto" className="mt-3 h-2 bg-primary-soft" />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {reviewedCount > 0
                    ? `Você lembrou ${correctCount} de ${reviewedCount} cartões nesta sessão.`
                    : "Avalie o primeiro cartão para ver sua taxa de acerto."}
                </p>
              </div>

              {/* Próximos da fila */}
              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <EyebrowLabel>Próximos da fila</EyebrowLabel>
                  <ul className="space-y-2">
                    {upcoming.map(w => {
                      const type = w.category || (w.is_slang ? "Gíria" : null)
                      return (
                        <li key={w.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
                          <span
                            aria-hidden="true"
                            className={cn("size-1.5 shrink-0 rounded-full", w.is_slang ? "bg-warning-strong" : "bg-primary")}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{w.word}</span>
                          {type && <Pill variant="neutral" size="sm">{type}</Pill>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Actions — reuse existing handlers; "Praticar Mais" only in free practice so it never interrupts a daily review */}
              <div className="space-y-2.5 pt-1">
                {isFreePractice && (
                  <Button className="h-11 w-full rounded-xl font-semibold" onClick={startFreePractice}>
                    <Dumbbell /> Praticar Mais
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl border-border font-semibold shadow-none"
                  onClick={() => (window.location.href = "/words")}
                >
                  <TrendingUp /> Ver Meu Progresso
                </Button>
              </div>
            </div>

            {/* Dica de Aprendizagem */}
            <div className="flex items-start gap-3 rounded-panel border border-primary/15 bg-primary-soft/60 p-5">
              <TonalIcon icon={Lightbulb} tone="solid" size="sm" className="shrink-0 rounded-full" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Dica de Aprendizagem</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Revise em voz alta para ativar a memória motora e associar o som em inglês ao significado.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </PageContainer>
    </div>
  )
}
