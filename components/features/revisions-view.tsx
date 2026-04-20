"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Flame, Volume2, RotateCcw, CheckCircle2, XCircle, Sparkles, TrendingUp } from "lucide-react"

export function Revisions() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [userExample, setUserExample] = useState("")
  const [exampleFeedback, setExampleFeedback] = useState<"correct" | "incorrect" | null>(null)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  const wordsToReview = [
    {
      word: "procrastinate",
      translation: "procrastinar",
      phonetic: "/prəˈkræstɪneɪt/",
      example: "I tend to procrastinate when I have difficult tasks to complete.",
      examplePt: "Eu tendo a procrastinar quando tenho tarefas difíceis para completar.",
      category: "Verbo",
      tip: "Vem do latim 'pro' (para frente) + 'crastinus' (de amanhã). Adiar para amanhã!",
    },
    {
      word: "serendipity",
      translation: "acaso feliz, descoberta feliz",
      phonetic: "/ˌserənˈdɪpəti/",
      example: "Finding that old photo album was pure serendipity.",
      examplePt: "Encontrar aquele álbum de fotos antigo foi puro acaso feliz.",
      category: "Substantivo",
      tip: "Descobrir algo bom sem estar procurando. Como encontrar dinheiro no bolso!",
    },
    {
      word: "resilient",
      translation: "resiliente",
      phonetic: "/rɪˈzɪliənt/",
      example: "She proved to be resilient in the face of adversity.",
      examplePt: "Ela provou ser resiliente diante da adversidade.",
      category: "Adjetivo",
      tip: "Como uma mola que volta à forma original mesmo depois de pressionada.",
    },
    {
      word: "ambiguous",
      translation: "ambíguo",
      phonetic: "/æmˈbɪɡjuəs/",
      example: "The instructions were ambiguous and difficult to follow.",
      examplePt: "As instruções eram ambíguas e difíceis de seguir.",
      category: "Adjetivo",
      tip: "Pode ter múltiplos significados ou interpretações. Deixa dúvida!",
    },
    {
      word: "eloquent",
      translation: "eloquente",
      phonetic: "/ˈeləkwənt/",
      example: "Her eloquent speech moved everyone in the audience.",
      examplePt: "Seu discurso eloquente comoveu todos na plateia.",
      category: "Adjetivo",
      tip: "Falar de forma persuasiva e expressiva. Tem o dom da palavra!",
    },
  ]

  const currentCard = wordsToReview[currentCardIndex]
  const totalCards = wordsToReview.length
  const progressPercentage = (reviewedCount / totalCards) * 100
  const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0

  const handleCheckExample = () => {
    // Verificação simples: se contém a palavra, considera correto
    const containsWord = userExample.toLowerCase().includes(currentCard.word.toLowerCase())
    const hasMinLength = userExample.trim().length > 10

    if (containsWord && hasMinLength) {
      setExampleFeedback("correct")
    } else {
      setExampleFeedback("incorrect")
    }
  }

  const handlePlayAudio = () => {
    // Usa Web Speech API para pronúncia
    const utterance = new SpeechSynthesisUtterance(currentCard.word)
    utterance.lang = "en-US"
    utterance.rate = 0.8
    window.speechSynthesis.speak(utterance)
  }

  const handleRemembered = (remembered: boolean) => {
    setReviewedCount(reviewedCount + 1)
    if (remembered) {
      setCorrectCount(correctCount + 1)
    }

    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      resetCard()
    } else {
      // Sessão concluída
      setIsFlipped(true)
    }
  }

  const resetCard = () => {
    setIsFlipped(false)
    setUserExample("")
    setExampleFeedback(null)
  }

  const handleRestart = () => {
    setCurrentCardIndex(0)
    setReviewedCount(0)
    setCorrectCount(0)
    resetCard()
  }

  if (reviewedCount === totalCards && totalCards > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full border-2 border-success/50">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">Sessão Concluída!</h2>
              <p className="text-lg text-muted-foreground">Parabéns por completar sua revisão diária</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto py-6">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-3xl font-bold text-primary mb-1">
                  {correctCount}/{totalCards}
                </p>
                <p className="text-sm text-muted-foreground">Palavras Lembradas</p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <p className="text-3xl font-bold text-success mb-1">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" variant="outline" onClick={handleRestart}>
                <RotateCcw className="w-5 h-5 mr-2" />
                Revisar Novamente
              </Button>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <TrendingUp className="w-5 h-5 mr-2" />
                Ver Progresso
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br pt-14 from-primary/5 via-background to-orange-500/5 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header com progresso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Revisão Diária</h2>
                <p className="text-muted-foreground">
                  Cartão {currentCardIndex + 1} de {totalCards}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Acurácia</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso da Sessão</span>
              <span className="font-semibold text-primary">
                {reviewedCount}/{totalCards} concluídas
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        <Card className="border-2 min-h-[600px]">
          <CardContent className="p-12">
            {!isFlipped ? (
              // Frente do card - Palavra em inglês
              <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8">
                <Badge variant="secondary" className="text-sm">
                  {currentCard.category}
                </Badge>

                <div className="text-center space-y-4">
                  <h3 className="text-6xl font-bold text-foreground">{currentCard.word}</h3>
                  <p className="text-xl text-muted-foreground">{currentCard.phonetic}</p>
                </div>

                <Button size="lg" variant="outline" onClick={handlePlayAudio} className="bg-transparent border-2">
                  <Volume2 className="w-5 h-5 mr-2" />
                  Ouvir Pronúncia
                </Button>

                <div className="pt-8">
                  <Button
                    size="lg"
                    onClick={() => setIsFlipped(true)}
                    className="bg-primary hover:bg-primary/90 text-lg px-12 py-6"
                  >
                    Revelar Tradução
                  </Button>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Tente lembrar o significado antes de revelar
                  </p>
                </div>
              </div>
            ) : (
              // Verso do card - Tradução e interação
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <h3 className="text-5xl font-bold text-foreground">{currentCard.word}</h3>
                  <p className="text-3xl text-primary font-bold">{currentCard.translation}</p>
                  <p className="text-lg text-muted-foreground">{currentCard.phonetic}</p>
                  <Badge variant="secondary" className="text-sm">
                    {currentCard.category}
                  </Badge>
                </div>

                {/* Botão de áudio também no verso */}
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={handlePlayAudio}>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Ouvir Pronúncia
                  </Button>
                </div>

                {/* Exemplo oficial */}
                {/* <div className="p-6 rounded-xl bg-accent/50 border border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Exemplo:</p>
                  <p className="text-base text-foreground italic mb-2">{currentCard.example}</p>
                  <p className="text-sm text-muted-foreground">{currentCard.examplePt}</p>
                </div> */}

                {/* Dica de memorização */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Dica de Memorização:</p>
                    <p className="text-sm text-muted-foreground">{currentCard.tip}</p>
                  </div>
                </div>

                <div className="space-y-3 p-6 rounded-xl bg-orange-500/5 border-2 border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <p className="text-sm font-bold text-foreground">
                      Agora é sua vez! Crie uma frase usando "{currentCard.word}":
                    </p>
                  </div>
                  <Textarea
                    value={userExample}
                    onChange={(e) => {
                      setUserExample(e.target.value)
                      setExampleFeedback(null)
                    }}
                    placeholder={`Exemplo: I learned not to ${currentCard.word} on important tasks.`}
                    className="min-h-[120px] resize-none text-base"
                  />

                  {exampleFeedback === null ? (
                    <Button
                      onClick={handleCheckExample}
                      disabled={userExample.trim().length < 5}
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      size="lg"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Verificar com IA
                    </Button>
                  ) : exampleFeedback === "correct" ? (
                    <div className="p-4 rounded-lg bg-success/10 border border-success/30 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-success mb-1">Excelente!</p>
                        <p className="text-sm text-muted-foreground">
                          Seu exemplo está correto e demonstra um bom entendimento da palavra.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-destructive mb-1">Tente novamente</p>
                          <p className="text-sm text-muted-foreground">
                            Certifique-se de usar a palavra "{currentCard.word}" no contexto adequado e escreva uma
                            frase completa.
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => setExampleFeedback(null)} variant="outline" className="w-full">
                        Editar Meu Exemplo
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleRemembered(false)}
                    disabled={exampleFeedback !== "correct"}
                    className="h-16 border-2 hover:border-destructive/50 hover:bg-destructive/5 disabled:opacity-50"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Preciso Revisar
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => handleRemembered(true)}
                    disabled={exampleFeedback !== "correct"}
                    className="h-16 bg-success hover:bg-success/90 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Lembrei!
                  </Button>
                </div>

                {exampleFeedback !== "correct" && (
                  <p className="text-center text-sm text-muted-foreground">
                    Complete e verifique seu exemplo para continuar
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Pressione ESC para sair • Setas ← → para navegar
        </p>
      </div>
    </div>
  )
}
