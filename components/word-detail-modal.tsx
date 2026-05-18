"use client"

import { useState, useEffect } from "react"
import { X, Volume2, BookOpen, MessageSquare, Video, Sparkles, Copy, ExternalLink, Loader2, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyzeWord, translateSentence, submitTranslationFeedback } from "@/lib/api"
import { toast } from "sonner"

interface WordDetailModalProps {
  word: string
  isOpen: boolean
  onClose: () => void
}

export function WordDetailModal({ word, isOpen, onClose }: WordDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const isSentence = word.includes(" ")

  const handleReportWrong = async () => {
    if (!data) return
    const term = data.original || word
    const confirmed = window.confirm(
      `Marcar a traduÃ§Ã£o de "${term}" como errada? Isso envia o caso para revisÃ£o.`
    )
    if (!confirmed) return

    try {
      await submitTranslationFeedback({
        input_text: term,
        model_normalized: data.normalized || data.normalized_english || null,
        model_translation: data.translation_pt || data.meaning_pt || null,
        model_is_slang: data.is_slang ?? (data.slangs_detected?.length > 0),
        model_metadata: {
          formality: data.formality,
          category: data.category,
          slangs_detected: data.slangs_detected || [],
          contextual_translations: data.contextual_translations || [],
        },
        user_feedback: "wrong",
        source: isSentence ? "word_detail_sentence" : "word_detail_word",
      })
      toast.success("Feedback salvo para revisÃ£o")
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar feedback")
    }
  }

  useEffect(() => {
    if (!isOpen || !word) return

    setLoading(true)
    const fetchDados = async () => {
      try {
        if (isSentence) {
          // No backend atual, translateSentence usa query string. Vamos tentar as duas formas.
          const res = await translateSentence(word)
          setData(res)
        } else {
          const res = await analyzeWord(word)
          setData(res)
        }
      } catch (err) {
        console.error(err)
        toast.error("Erro ao analisar termo.")
        onClose()
      } finally {
        setLoading(false)
      }
    }
    
    fetchDados()
  }, [word, isOpen, isSentence])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl border border-border flex flex-col relative">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {data ? (data.original || word) : word}
                </h2>
                {data?.is_slang && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Gíria
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Volume2 className="w-4 h-4 mr-1" />
                  Ouvir
                </Button>
                {data && (
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleReportWrong}>
                    <Flag className="w-4 h-4 mr-1" />
                    Errado
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Analisando...</p>
            </div>
          ) : (
            <>
              {/* Translations (Always Show) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Traduções Contextuais
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A IA detectou diferentes significados baseados no contexto
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data?.contextual_translations && data.contextual_translations.length > 0 ? (
                    data.contextual_translations.map((translation: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border border-border bg-accent/30">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {translation.context}
                          </Badge>
                        </div>
                        <p className="font-semibold text-foreground">{translation.meaning}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-lg border border-border bg-accent/30">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            Principal
                          </Badge>
                        </div>
                        <p className="font-semibold text-foreground">
                          {data?.translation_pt || data?.meaning_pt || "Tradução não encontrada"}
                        </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Examples (Only for single words) */}
              {!isSentence && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Exemplos de Uso
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Frases reais para você entender como usar a palavra</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data?.examples && data.examples.length > 0 ? (
                      data.examples.map((example: string, index: number) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/30">
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-foreground font-medium">{example}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={() => navigator.clipboard.writeText(example)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm italic">Nenhum exemplo cadastrado no banco de dados para esta palavra.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Video Section (Always Show, Not integrated) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Video className="w-5 h-5 text-primary" />
                    Pronúncia em Vídeo
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Veja nativos usando esta palavra em contextos reais</p>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center relative overflow-hidden border border-border">
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Video className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">Integração com YouTube em breve.</p>
                      <Button variant="outline" size="sm" disabled>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no YouTube
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

