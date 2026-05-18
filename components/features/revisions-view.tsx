"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Flame, Volume2, RotateCcw, CheckCircle2, XCircle,
  Sparkles, TrendingUp, BookOpen, AlertCircle, Keyboard, Eye,
} from "lucide-react"
import { getWordsForReview, reviewWord } from "@/lib/api"


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
  new:       "Nova",
  learning:  "Aprendendo",
  reviewing: "Revisando",
  mastered:  "Dominada",
}

const MASTERY_CLASS: Record<string, string> = {
  new:       "bg-gray-100 text-gray-600 border-gray-200",
  learning:  "bg-blue-100 text-blue-600 border-blue-200",
  reviewing: "bg-orange-100 text-orange-600 border-orange-200",
  mastered:  "bg-green-100 text-green-600 border-green-200",
}

/** Words in "reviewing" or "mastered" require typing — the user should know them by now */
function isTypeMode(card: ReviewWord): boolean {
  return card.mastery_level === "reviewing" || card.mastery_level === "mastered"
}

/** Normalize a string for comparison: lowercase, no accents, no punctuation */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip accents
    .replace(/[^a-z0-9 ]/g, "")        // strip punctuation
    .replace(/\s+/g, " ")
}

/** Levenshtein-based similarity score 0.0 → 1.0 */
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
  const [words, setWords]                       = useState<ReviewWord[]>([])
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState<string | null>(null)
  const [currentIndex, setCurrentIndex]         = useState(0)
  const [reviewedCount, setReviewedCount]       = useState(0)
  const [correctCount, setCorrectCount]         = useState(0)
  const [sessionDone, setSessionDone]           = useState(false)
  const [submitting, setSubmitting]             = useState(false)

  // Flip-card mode state
  const [isFlipped, setIsFlipped]               = useState(false)

  // Type mode state
  const [userInput, setUserInput]               = useState("")
  const [showResult, setShowResult]             = useState(false)
  const [autoResult, setAutoResult]             = useState<AutoResult | null>(null)
  const [hasSeenTypeMode, setHasSeenTypeMode]   = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadWords() }, [])

  // Auto-focus textarea
  useEffect(() => {
    if (!loading && words.length > 0 && isTypeMode(words[currentIndex]) && !showResult) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [currentIndex, loading, words, showResult])

  async function loadWords() {
    try {
      setLoading(true)
      setError(null)
      setCurrentIndex(0)
      setReviewedCount(0)
      setCorrectCount(0)
      setSessionDone(false)
      resetCard()
      const data = await getWordsForReview()
      setWords(data)
    } catch {
      setError("Não foi possível carregar as revisões. Tente novamente.")
    } finally {
      setLoading(false)
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

    try {
      await reviewWord(card.id, quality)
    } catch {
      console.error("Failed to save review result")
    }

    if (quality >= 3) setCorrectCount(c => c + 1)
    setReviewedCount(c => c + 1)

    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1)
      resetCard()
    } else {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando revisões...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="text-foreground font-medium">{error}</p>
            <Button onClick={loadWords}>Tentar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Tudo em dia!</h2>
              <p className="text-muted-foreground">
                Nenhuma palavra para revisar hoje. Volte amanhã ou adicione novas palavras.
              </p>
            </div>
            <Button variant="outline" onClick={() => (window.location.href = "/words")}>
              <BookOpen className="w-4 h-4 mr-2" />
              Ver Minhas Palavras
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sessionDone) {
    const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-green-500/5 p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full border-2 border-green-200">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">Sessão Concluída!</h2>
              <p className="text-lg text-muted-foreground">Parabéns por completar sua revisão diária</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto py-6">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-3xl font-bold text-primary mb-1">{correctCount}/{reviewedCount}</p>
                <p className="text-sm text-muted-foreground">Palavras Lembradas</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-3xl font-bold text-green-600 mb-1">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
              </div>
            </div>
            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" variant="outline" onClick={loadWords}>
                <RotateCcw className="w-5 h-5 mr-2" />
                Nova Sessão
              </Button>
              <Button size="lg" className="bg-primary hover:bg-primary/90"
                onClick={() => (window.location.href = "/words")}>
                <TrendingUp className="w-5 h-5 mr-2" />
                Ver Progresso
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main flashcard

  const currentCard  = words[currentIndex]
  const totalCards   = words.length
  const progress     = (reviewedCount / totalCards) * 100
  const accuracy     = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0
  const examples     = currentCard.word_examples?.map(e => e.example_en).filter(Boolean) ?? []
  const masteryClass = MASTERY_CLASS[currentCard.mastery_level] ?? MASTERY_CLASS.new
  const masteryLabel = MASTERY_LABEL[currentCard.mastery_level] ?? "Nova"
  const typeMode     = isTypeMode(currentCard)

  return (
    <div className="min-h-screen bg-gradient-to-br pt-14 from-primary/5 via-background to-orange-500/5 p-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Revisão Diária</h2>
                <p className="text-muted-foreground">Cartão {currentIndex + 1} de {totalCards}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Mode badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                typeMode
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-sky-50 text-sky-700 border-sky-200"
              }`}>
                {typeMode
                  ? <><Keyboard className="w-3.5 h-3.5" /> Recall Ativo</>
                  : <><Eye className="w-3.5 h-3.5" /> Reconhecimento</>
                }
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Acurácia</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadWords}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso da Sessão</span>
              <span className="font-semibold text-primary">{reviewedCount}/{totalCards} concluídas</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* ── First-time type mode warning ── */}
        {typeMode && !hasSeenTypeMode && (
          <div className="mb-4 p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
            <Keyboard className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-800">Modo Recall Ativo</p>
              <p className="text-sm text-purple-700">
                Esta palavra já é familiar! Agora você precisa escrever a tradução de memória.
                O app vai comparar sua resposta, mas <strong>você decide</strong> se estava certo —
                outras traduções válidas são aceitas.
              </p>
            </div>
          </div>
        )}

        {/* Card */}
        <Card className="border-2 min-h-[480px]">
          <CardContent className="p-10">

            {/* FLIP MODE */}
            {!typeMode && (
              !isFlipped ? (
                // Front
                <div className="flex flex-col items-center justify-center min-h-[380px] space-y-8">
                  <div className="flex gap-2 flex-wrap justify-center">
                    <Badge className={`${masteryClass} border`}>{masteryLabel}</Badge>
                    {currentCard.is_slang && <Badge variant="secondary">Slang</Badge>}
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-6xl font-bold text-foreground">{currentCard.word}</h3>
                    {currentCard.is_slang && currentCard.normalized_form &&
                      currentCard.normalized_form !== currentCard.word && (
                      <p className="text-lg text-muted-foreground italic">
                        → {currentCard.normalized_form}
                      </p>
                    )}
                  </div>
                  <Button size="lg" variant="outline" onClick={() => playAudio(currentCard.word)}
                    className="bg-transparent border-2">
                    <Volume2 className="w-5 h-5 mr-2" />
                    Ouvir Pronúncia
                  </Button>
                  <div className="pt-2 text-center">
                    <Button size="lg" onClick={() => setIsFlipped(true)}
                      className="bg-primary hover:bg-primary/90 text-lg px-12 py-6">
                      Revelar Tradução
                    </Button>
                    <p className="text-sm text-muted-foreground mt-3">
                      Tente lembrar o significado antes de revelar
                    </p>
                  </div>
                </div>
              ) : (
                // Back
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <h3 className="text-5xl font-bold text-foreground">{currentCard.word}</h3>
                    <p className="text-3xl text-primary font-bold">{currentCard.translation || "—"}</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <Badge className={`${masteryClass} border`}>{masteryLabel}</Badge>
                      {currentCard.is_slang && <Badge variant="secondary">Slang</Badge>}
                      {currentCard.category && <Badge variant="outline">{currentCard.category}</Badge>}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => playAudio(currentCard.word)}>
                      <Volume2 className="w-4 h-4 mr-2" />Ouvir Pronúncia
                    </Button>
                  </div>
                  {examples.length > 0 && (
                    <div className="p-4 rounded-xl bg-accent/50 border border-border space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemplo</p>
                      <p className="text-base text-foreground italic">{examples[0]}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <Button size="lg" variant="outline" disabled={submitting}
                      onClick={() => handleReview(1)}
                      className="h-16 border-2 flex-col gap-1 hover:border-red-300 hover:bg-red-50">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-xs font-medium">Não Lembrei</span>
                    </Button>
                    <Button size="lg" variant="outline" disabled={submitting}
                      onClick={() => handleReview(3)}
                      className="h-16 border-2 flex-col gap-1 hover:border-amber-300 hover:bg-amber-50">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-medium">Foi Difícil</span>
                    </Button>
                    <Button size="lg" disabled={submitting}
                      onClick={() => handleReview(5)}
                      className="h-16 bg-green-500 hover:bg-green-600 flex-col gap-1">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-xs font-medium">Lembrei!</span>
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Não Lembrei: repetir amanhã · Foi Difícil: intervalo curto · Lembrei: intervalo aumenta
                  </p>
                </div>
              )
            )}

            {/* TYPE MODE */}
            {typeMode && (
              <div className="space-y-6">
                {/* Word */}
                <div className="text-center space-y-2">
                  <div className="flex gap-2 flex-wrap justify-center">
                    <Badge className={`${masteryClass} border`}>{masteryLabel}</Badge>
                    {currentCard.is_slang && <Badge variant="secondary">Slang</Badge>}
                    {currentCard.category && <Badge variant="outline">{currentCard.category}</Badge>}
                  </div>
                  <h3 className="text-6xl font-bold text-foreground pt-2">{currentCard.word}</h3>
                  {currentCard.is_slang && currentCard.normalized_form &&
                    currentCard.normalized_form !== currentCard.word && (
                    <p className="text-base text-muted-foreground italic">→ {currentCard.normalized_form}</p>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => playAudio(currentCard.word)}>
                    <Volume2 className="w-4 h-4 mr-1.5" />Ouvir
                  </Button>
                </div>

                {!showResult ? (
                  /* Input phase */
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground text-center">
                      Escreva a tradução em português:
                    </p>
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
                      className="min-h-[100px] resize-none text-base text-center"
                    />
                    <Button
                      size="lg"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={userInput.trim().length < 2}
                      onClick={handleCheckAnswer}
                    >
                      <Keyboard className="w-4 h-4 mr-2" />
                      Verificar
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Enter para verificar · Shift+Enter para nova linha
                    </p>
                  </div>
                ) : (
                  /* Result phase */
                  <div className="space-y-4">
                    {/* Auto-suggestion banner */}
                    {autoResult === "correct" && (
                      <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-green-800">Muito parecido com a referência!</p>
                      </div>
                    )}
                    {autoResult === "close" && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-amber-800">Parcialmente correto — compare abaixo</p>
                      </div>
                    )}
                    {autoResult === "wrong" && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm font-semibold text-red-800">Bem diferente da referência — veja abaixo</p>
                      </div>
                    )}

                    {/* Answer comparison */}
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      <div className="p-3 bg-background">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Sua resposta
                        </p>
                        <p className="text-base text-foreground">{userInput || "—"}</p>
                      </div>
                      <div className="p-3 bg-accent/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Referência
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          {currentCard.translation || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Slang note */}
                    {currentCard.is_slang && (
                      <div className="flex items-start gap-2 px-1">
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-purple-700">Slang:</span>{" "}
                          outras traduções podem ser válidas. Você decide se sua resposta está certa.
                        </p>
                      </div>
                    )}

                    {examples.length > 0 && (
                      <div className="p-3 rounded-xl bg-accent/50 border border-border space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Exemplo</p>
                        <p className="text-sm text-foreground italic">{examples[0]}</p>
                      </div>
                    )}

                    {/* Self-grade buttons — so the user can review it before marking it as correct*/}
                    <div className="space-y-2">
                      <p className="text-xs text-center text-muted-foreground font-medium">
                        Como você avalia sua resposta?
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <Button size="lg" variant="outline" disabled={submitting}
                          onClick={() => handleReview(1)}
                          className={`h-16 border-2 flex-col gap-1 hover:border-red-300 hover:bg-red-50 ${
                            autoResult === "wrong" ? "border-red-300 bg-red-50" : ""
                          }`}>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <span className="text-xs font-medium">Errei</span>
                        </Button>
                        <Button size="lg" variant="outline" disabled={submitting}
                          onClick={() => handleReview(3)}
                          className={`h-16 border-2 flex-col gap-1 hover:border-amber-300 hover:bg-amber-50 ${
                            autoResult === "close" ? "border-amber-300 bg-amber-50" : ""
                          }`}>
                          <Sparkles className="w-5 h-5 text-amber-500" />
                          <span className="text-xs font-medium">Quase</span>
                        </Button>
                        <Button size="lg" disabled={submitting}
                          onClick={() => handleReview(5)}
                          className={`h-16 flex-col gap-1 ${
                            autoResult === "correct"
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-green-500 hover:bg-green-600"
                          }`}>
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xs font-medium">Acertei!</span>
                        </Button>
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        O botão sugerido está destacado — mas a decisão é sua
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Pressione ESC para sair
        </p>
      </div>
    </div>
  )
}
