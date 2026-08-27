"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { PaginationControls } from "@/components/pagination-controls"
import { Search, Volume2, Trash2, X, BookOpen, MessageSquare, Sparkles, Loader2, Flag } from "lucide-react"
import { WordDetailModal } from "@/components/word-detail-modal"
import { getUserWords, deleteWord, submitTranslationFeedback, isAbortError } from "@/lib/api"
import { toast } from "sonner"

const DEFAULT_PAGE_SIZE = 50

export function WordsBook() {
  const router = useRouter()
  const searchParams = useSearchParams()

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
    if (!confirm(`Tem certeza que deseja excluir "${word}"?`)) return

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
    const confirmed = window.confirm(
      `Marcar a tradução de "${word.word}" como errada? Isso envia o caso para revisão.`
    )
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Básico":
        return "bg-success/10 text-success p-1 px-3 border-success/20"
      case "Intermediário":
        return "bg-orange-500/10 p-1 px-3 text-orange-600 border-orange-500/20"
      case "Avançado":
        return "bg-destructive/10 p-1 px-3 text-destructive border-destructive/20"
      default:
        return "bg-muted p-1 px-3 text-muted-foreground"
    }
  }

  return (
    <>
      <div className="p-8 max-w-9/12 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WORDS BOOK</p>
              <h2 className="text-3xl font-bold text-foreground">Seu Caderninho Digital</h2>
            </div>
          </div>
          <p className="text-muted-foreground">Todas as palavras que você salvou, organizadas e prontas para revisar</p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6 border-border/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar palavra ou tradução..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" onClick={() => setSearchQuery("")}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Words List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredWords.map((word, index) => (
                <Card
                  key={index}
                  className="p-4 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedWord(word.word)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center gap-4">
                      {/* Word & Translation */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-foreground">{word.word}</h3>
                          {word.is_slang && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Gíria
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{word.translation || "Sem tradução"}</p>
                      </div>

                      {/* Category & Difficulty */}
                      <div className="hidden md:flex items-center gap-2">
                        {word.category && (
                          <Badge variant="outline" className="text-xs p-1 px-3">
                            {word.category}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs border ${getDifficultyColor(word.mastery_level || "new")}`}>
                          {word.mastery_level === "new" ? "Novo" : "Em estudo"}
                        </Badge>
                      </div>

                      {/* Info Icons */}
                      <div className="hidden lg:flex items-center gap-3 text-muted-foreground">
                        <div className="flex items-center gap-1 text-xs">
                          <MessageSquare className="w-4 h-4" />
                          <span>{word.examples?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReportWrong(word)
                        }}
                        title="Marcar traduÃ§Ã£o como errada"
                      >
                        <Flag className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="group-hover:bg-accent"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Future: Play pronunciation
                        }}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(word.id, word.word)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredWords.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma palavra encontrada</h3>
                <p className="text-muted-foreground">Tente buscar por outro termo ou adicione novas palavras</p>
              </div>
            )}

            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(p) => updateParams({ page: p })}
              onPageSizeChange={(s) => updateParams({ page: 1, pageSize: s })}
            />
          </>
        )}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordDetailModal word={selectedWord} isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </>
  )
}
