"use client"

import { useState, useEffect } from "react"
import { X, Volume2, BookOpen, MessageSquare, Video, Sparkles, Copy, ExternalLink, Loader2, Flag, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EyebrowLabel, Pill, TonalIcon, useConfirm } from "@/components/shared"
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
  const { confirm, dialog: confirmDialog } = useConfirm()

  const isSentence = word.includes(" ")

  const handleReportWrong = async () => {
    if (!data) return
    const term = data.original || word
    const confirmed = await confirm({
      title: "Marcar tradução como errada?",
      description: `A tradução de "${term}" será enviada para revisão.`,
      confirmLabel: "Marcar como errada",
      tone: "warning",
    })
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
      toast.success("Feedback salvo para revisão")
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      {confirmDialog}
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-auto rounded-panel border border-border bg-card shadow-card">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 p-6 backdrop-blur-sm">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-warning-strong" />
          <div className="flex min-w-0 items-start gap-4">
            <TonalIcon icon={BookOpen} tone="primary" size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
                  {data ? (data.original || word) : word}
                </h2>
                {data?.phonetic && (
                  <span className="text-sm text-muted-foreground">{data.phonetic}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Ouvir"
                  title="Ouvir"
                  className="rounded-full bg-primary-soft text-primary hover:bg-primary-soft/70 hover:text-primary"
                >
                  <Volume2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {data?.is_slang && (
                  <Pill variant="primary" icon={Sparkles} size="sm">
                    Gíria
                  </Pill>
                )}
                {data?.formality && (
                  <Pill variant="outline" icon={Info} size="sm" className="font-medium text-muted-foreground">
                    {data.formality}
                  </Pill>
                )}
                {data && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-muted-foreground hover:text-destructive"
                    onClick={handleReportWrong}
                  >
                    <Flag className="size-3.5" />
                    Errado
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            className="shrink-0 text-muted-foreground hover:text-primary"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="space-y-5 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 size-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Analisando...</p>
            </div>
          ) : (
            <>
              {/* Translations (Always Show) */}
              <section className="rounded-xl border border-primary-soft bg-muted p-5">
                <EyebrowLabel tone="primary" icon={Sparkles}>
                  Traduções Contextuais
                </EyebrowLabel>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  A IA detectou diferentes significados baseados no contexto
                </p>
                <div className="mt-4 space-y-3">
                  {data?.contextual_translations && data.contextual_translations.length > 0 ? (
                    data.contextual_translations.map((translation: any, index: number) => (
                      <div key={index} className="rounded-xl border border-border bg-card p-4">
                        <Pill variant="outline" size="sm" className="font-medium text-muted-foreground">
                          {translation.context}
                        </Pill>
                        <p className="mt-2 break-words text-xl font-bold leading-snug text-foreground">
                          {translation.meaning}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <Pill variant="outline" size="sm" className="font-medium text-muted-foreground">
                        Principal
                      </Pill>
                      <p className="mt-2 break-words text-xl font-bold leading-snug text-foreground">
                        {data?.translation_pt || data?.meaning_pt || "Tradução não encontrada"}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Examples (Only for single words) */}
              {!isSentence && (
                <section className="rounded-xl border border-border bg-card p-5">
                  <EyebrowLabel className="text-foreground/80" icon={MessageSquare}>
                    Exemplos de Uso
                  </EyebrowLabel>
                  <p className="mt-1.5 text-sm text-muted-foreground">Frases reais para você entender como usar a palavra</p>
                  <div className="mt-4 space-y-3">
                    {data?.examples && data.examples.length > 0 ? (
                      data.examples.map((example: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-xl border border-border bg-primary-soft/40 p-4"
                        >
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {index + 1}
                          </div>
                          <p className="flex-1 text-base italic leading-relaxed text-foreground">
                            “{example}”
                          </p>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Copiar exemplo"
                            className="shrink-0 text-muted-foreground hover:text-primary"
                            onClick={() => navigator.clipboard.writeText(example)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Nenhum exemplo cadastrado no banco de dados para esta palavra.</p>
                    )}
                  </div>
                </section>
              )}

              {/* Video Section (Always Show, Not integrated YET) */}
              <section className="rounded-xl border border-border bg-card p-5">
                <EyebrowLabel className="text-foreground/80" icon={Video}>
                  Pronúncia em Vídeo
                </EyebrowLabel>
                <p className="mt-1.5 text-sm text-muted-foreground">Veja nativos usando esta palavra em contextos reais</p>
                <div className="relative mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                  <div className="space-y-3 text-center">
                    <TonalIcon icon={Video} tone="primary" size="lg" className="mx-auto rounded-full" />
                    <p className="text-sm text-muted-foreground">Integração com YouTube em breve.</p>
                    <Button variant="outline" size="sm" className="rounded-full" disabled>
                      <ExternalLink className="size-4" />
                      Ver no YouTube
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

