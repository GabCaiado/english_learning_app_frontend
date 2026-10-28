"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationControls } from "@/components/pagination-controls"
import {
  Search,
  Volume2,
  Trash2,
  X,
  BookOpen,
  Flag,
  BookOpenText,
  CalendarDays,
  Repeat,
  AlarmClock,
  ChevronLeft,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Pill, TonalIcon, useConfirm } from "@/components/shared"
import { WordDetailModal } from "@/components/word-detail-modal"
import { getUserWords, deleteWord, submitTranslationFeedback, isAbortError } from "@/lib/api"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"

const DEFAULT_PAGE_SIZE = 50

export function WordsBook() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm, dialog: confirmDialog } = useConfirm()

  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [words, setWords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const abortRef = useRef<AbortController | null>(null)

  const updateParams = useCallback(
    (next: { page?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.page !== undefined) params.set("page", String(next.page))
      if (next.pageSize !== undefined) params.set("pageSize", String(next.pageSize))
      router.push(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  const fetchWords = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const offset = (page - 1) * pageSize
      const data = await getUserWords(pageSize, offset, controller.signal)
      setWords(data.items)
      setTotal(data.total)
    } catch (err) {
      if (isAbortError(err)) return
      console.error("Erro ao buscar palavras:", err)
      toast.error("Não foi possível carregar seu caderninho")
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchWords()
    return () => abortRef.current?.abort()
  }, [fetchWords])

  // If the current page becomes out of range (e.g. after deleting the last
  // word on the last page), snap back to the last valid page.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (page > totalPages) {
      updateParams({ page: totalPages })
    }
  }, [page, pageSize, total, updateParams])

  const handleDelete = async (id: string, word: string) => {
    const confirmed = await confirm({
      title: "Excluir palavra?",
      description: `"${word}" será removida do seu caderninho. Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      tone: "destructive",
    })
    if (!confirmed) return

    try {
      await deleteWord(id)
      toast.success("Palavra removida")
      setWords((current) => current.filter((w) => w.id !== id))
      setTotal((current) => Math.max(0, current - 1))
    } catch (err) {
      toast.error("Erro ao excluir")
    }
  }

  const filteredWords = words.filter(
    (w) =>
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.translation || "").toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleReportWrong = async (word: any) => {
    const confirmed = await confirm({
      title: "Marcar tradução como errada?",
      description: `A tradução de "${word.word}" será enviada para revisão.`,
      confirmLabel: "Marcar como errada",
      tone: "warning",
    })
    if (!confirmed) return

    try {
      await submitTranslationFeedback({
        input_text: word.word,
        model_normalized: word.normalized_form,
        model_translation: word.translation,
        model_is_slang: word.is_slang,
        model_metadata: {
          category: word.category,
          formality_level: word.formality_level,
          mastery_level: word.mastery_level,
        },
        user_feedback: "wrong",
        source: "word_book",
        user_word_id: word.id,
      })
      toast.success("Feedback salvo para revisão")
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar feedback")
    }
  }

  const getStatus = (
    word: any,
  ): { label: string; variant: "info" | "success" | "destructive" | "neutral" } => {
    if (word.mastery_level === "mastered") return { label: "Aprendido", variant: "success" }
    if (word.mastery_level === "new" || !word.mastery_level) return { label: "Novo", variant: "info" }
    const due = word.next_review_date && new Date(word.next_review_date) <= new Date()
    if (due) return { label: "Revisar Hoje", variant: "destructive" }
    return { label: "Em Revisão", variant: "neutral" }
  }

  return (
    <>
      <PageContainer>
        {/* Header */}
        <header className="mb-5 border-b border-border pb-5">
          <Pill
            variant="primary"
            size="sm"
            icon={BookOpenText}
            className="rounded-md uppercase tracking-[0.08em]"
          >
            Caderninho Digital
          </Pill>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
            Seu Caderninho de Vocabulário
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {loading && total === 0
              ? "Todas as palavras e gírias salvas por você, prontas para revisão."
              : `Todas as ${total} ${total === 1 ? "palavra e gíria salva" : "palavras e gírias salvas"} por você, prontas para revisão.`}
          </p>
        </header>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar palavra, gíria ou tradução em português..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-border bg-card pl-11 pr-12 text-sm shadow-card"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* Filter chips */}
        <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Filtros">
          <Pill variant="solid" className="h-7 px-3.5" aria-current="true">
            Todas ({total})
          </Pill>
        </div>

        {/* Words List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="gap-0 rounded-panel px-5 py-5 shadow-card">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredWords.map((word, index) => {
                const status = getStatus(word)
                const savedLabel = word.created_at
                  ? `Salva há ${formatDistanceToNow(new Date(word.created_at), { locale: ptBR })}`
                  : null
                const reviews = (word.times_correct ?? 0) + (word.times_incorrect ?? 0)
                const pending = status.variant === "destructive"

                return (
                  <Card
                    key={index}
                    className="group cursor-pointer gap-0 rounded-panel border-border px-5 py-5 shadow-card transition-colors hover:border-primary/40"
                    onClick={() => setSelectedWord(word.word)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Audio */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ouvir pronúncia"
                        className="size-10 shrink-0 self-start rounded-xl bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Future: Play pronunciation
                        }}
                      >
                        <Volume2 className="size-4" />
                      </Button>

                      {/* Word, translation & meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[17px] font-semibold leading-snug text-foreground">{word.word}</h3>
                          {word.is_slang && (
                            <Pill variant="primary" size="sm" icon={ChevronLeft}>
                              Gíria
                            </Pill>
                          )}
                          {word.category && (
                            <Pill variant="neutral" size="sm">
                              {word.category}
                            </Pill>
                          )}
                          <Pill variant={status.variant} size="sm">
                            {status.label}
                          </Pill>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {word.translation ? `"${word.translation}"` : "Sem tradução"}
                        </p>
                        {(savedLabel || reviews > 0 || pending) && (
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground [&_svg]:size-3.5">
                            {savedLabel && (
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays />
                                {savedLabel}
                              </span>
                            )}
                            {pending ? (
                              <span className="inline-flex items-center gap-1.5 text-destructive">
                                <AlarmClock />
                                Repetição pendente
                              </span>
                            ) : (
                              reviews > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Repeat />
                                  Revisada {reviews}x
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar tradução como errada"
                          aria-label="Marcar tradução como errada"
                          className="size-8 text-muted-foreground hover:bg-primary-soft hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReportWrong(word)
                          }}
                        >
                          <Flag className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          aria-label="Excluir palavra"
                          className="size-8 text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(word.id, word.word)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {filteredWords.length === 0 && (
              <div className="rounded-panel border border-dashed border-border bg-card py-16 text-center">
                <TonalIcon icon={BookOpen} size="lg" className="mx-auto mb-4" />
                <h3 className="mb-2 text-lg font-bold text-foreground">Nenhuma palavra encontrada</h3>
                <p className="text-sm text-muted-foreground">Tente buscar por outro termo ou adicione novas palavras</p>
              </div>
            )}

            <div className="mt-8 border-t border-border pt-5">
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                itemLabel="palavras"
                onPageChange={(p) => updateParams({ page: p })}
                onPageSizeChange={(s) => updateParams({ page: 1, pageSize: s })}
              />
            </div>
          </>
        )}
      </PageContainer>

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordDetailModal word={selectedWord} isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} />
      )}

      {confirmDialog}
    </>
  )
}
