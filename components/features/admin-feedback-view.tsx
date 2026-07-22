"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Flame,
  Info,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Trophy,
  User,
  X,
  Zap,
  Keyboard,
  Search,
  Sparkles,
  ListChecks,
} from "lucide-react"
import { toast } from "sonner"

import {
  amplifyVocabulary,
  approveTranslationFeedback,
  generateDatasetBatch,
  getDatasetStats,
  getPendingTranslationFeedback,
  getVocabulary,
  rejectTranslationFeedback,
  translateSentence,
  type DatasetStats,
  type GenerateBatchParams,
  type VocabularyInfo,
} from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


type FeedbackRow = {
  id: string
  input_text: string
  model_normalized?: string | null
  model_translation?: string | null
  model_is_slang?: boolean | null
  model_metadata?: {
    detector_score?: number
    agreement_confidence?: number
    category?: string
    context_style?: string
    formality?: string
    slang_words?: string[]
    auto_approved?: boolean
  }
  user_feedback: string
  source: string
  status: string
  created_at?: string
}

type Draft = {
  expected_normalized: string
  expected_translation: string
  expected_is_slang: boolean
  failure_type: string
}

const FAILURE_TYPES = [
  { value: "wrong_slang_sense", label: "Wrong Sense", desc: "Model translated slang with incorrect meaning" },
  { value: "missed_slang", label: "Missed Slang", desc: "Model missed the slang word and treated the sentence as literal" },
  { value: "false_positive", label: "False Positive", desc: "Model incorrectly identified standard English as slang" },
  { value: "literal_guard", label: "Literal Guard", desc: "Looks like slang, but literal meaning is expected" },
  { value: "poor_translation", label: "Poor Translation", desc: "Slang was normalized correctly, but translation is awkward/bad" },
  { value: "bad_generation", label: "Bad Gen", desc: "AI-generated sentence is unnatural or buggy" }
]

function DiffHighlight({ original, revised }: { original: string; revised: string }) {
  if (!revised) return <span className="text-muted-foreground">-</span>

  const origWords = original.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/)
  const revWords = revised.split(/\s+/)

  return (
    <span className="flex flex-wrap gap-x-1">
      {revWords.map((word, idx) => {
        const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        const isNew = !origWords.includes(cleanWord)

        return (
          <span
            key={idx}
            className={isNew ? "bg-green-500/15 text-green-700 font-semibold px-0.5 rounded border border-green-300/30 animate-pulse" : ""}
          >
            {word}
          </span>
        )
      })}
    </span>
  )
}


const CATEGORY_OPTIONS = [
  { value: "gen_z", label: "Gen Z / TikTok" },
  { value: "internet", label: "Internet" },
  { value: "dating", label: "Dating" },
  { value: "sports", label: "Sports" },
  { value: "work", label: "Work / Hustle" },
  { value: "general", label: "General casual" },
]

const CONTEXT_OPTIONS = [
  { value: "text_message", label: "Text messages" },
  { value: "social_media", label: "Social media" },
  { value: "group_chat", label: "Group chat" },
  { value: "casual_speech", label: "Casual speech" },
  { value: "reaction", label: "Reaction / reply" },
]

const COUNT_OPTIONS = [10, 25, 50, 100]

// Helpers
function makeDraft(row: FeedbackRow): Draft {
  return {
    expected_normalized: row.model_normalized || row.input_text,
    expected_translation: row.model_translation || "",
    expected_is_slang: row.model_is_slang ?? true,
    failure_type: row.model_is_slang ? "wrong_slang_sense" : "missed_slang",
  }
}

function getConfidenceBadge(row: FeedbackRow) {
  const conf = row.model_metadata?.agreement_confidence
  if (conf === undefined || conf === null) return null
  const pct = Math.round(conf * 100)
  if (pct >= 70) return { label: `${pct}% confident`, className: "bg-yellow-500/15 text-yellow-700 border-yellow-400" }
  if (pct >= 50) return { label: `${pct}% uncertain`, className: "bg-orange-500/15 text-orange-700 border-orange-400" }
  return { label: `${pct}% very uncertain`, className: "bg-red-500/15 text-red-700 border-red-400" }
}

function getProgressToNextMilestone(stats: DatasetStats) {
  const { milestones, total_approved } = stats
  const nextIdx = milestones.findIndex((m) => !m.reached)
  if (nextIdx === -1) return { pct: 100, next: null }
  const prevCount = nextIdx > 0 ? milestones[nextIdx - 1].count : 0
  const nextCount = milestones[nextIdx].count
  const pct = Math.min(100, ((total_approved - prevCount) / (nextCount - prevCount)) * 100)
  return { pct, next: milestones[nextIdx] }
}

// Dataset Health Section
function DatasetHealthSection({
  stats,
  loading,
  onRefresh,
}: {
  stats: DatasetStats | null
  loading: boolean
  onRefresh: () => void
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading dataset stats…
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  const { pct, next } = getProgressToNextMilestone(stats)
  const slangPct = stats.total_approved > 0
    ? Math.round((stats.slang_count / stats.total_approved) * 100)
    : 0

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Dataset Health</CardTitle>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Progress toward next milestone */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold">{stats.total_approved.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              {next
                ? `→ ${next.emoji} ${next.label} at ${next.count.toLocaleString()}`
                : <><Trophy className="w-4 h-4 text-yellow-500" /> All milestones reached!</>}
            </span>
          </div>
          <Progress value={pct} className="h-3" />
          <div className="flex gap-2 flex-wrap">
            {stats.milestones.map((m) => (
              <span
                key={m.count}
                className={`text-xs px-2 py-0.5 rounded-full border ${m.reached
                  ? "bg-green-500/15 text-green-700 border-green-400"
                  : "bg-muted text-muted-foreground border-border"
                  }`}
              >
                {m.emoji} {m.label} ({m.count.toLocaleString()})
              </span>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Balance</p>
            <p className="text-sm font-semibold">{slangPct}% slang</p>
            <p className={`text-xs flex items-center gap-1 ${stats.balance_ok ? "text-green-600" : "text-red-500"}`}>
              {stats.balance_ok
                ? <><CheckCircle2 className="w-3 h-3" /> Good mix</>
                : <><AlertTriangle className="w-3 h-3" /> Unbalanced</>}
            </p>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Breakdown</p>
            <p className="text-xs flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Slang: <span className="font-semibold">{stats.slang_count.toLocaleString()}</span></p>
            <p className="text-xs flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-500" /> Neutral: <span className="font-semibold">{stats.neutral_count.toLocaleString()}</span></p>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Sources</p>
            <p className="text-xs"><Bot className="inline w-3 h-3 mr-1" />AI: <span className="font-semibold">{(stats.by_source["ai_generated"] ?? 0).toLocaleString()}</span></p>
            <p className="text-xs"><User className="inline w-3 h-3 mr-1" />Users: <span className="font-semibold">{(stats.by_source["app"] ?? 0).toLocaleString()}</span></p>
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Model readiness</p>
            <p className={`text-xs flex items-center gap-1 ${stats.distilbert_ready ? "text-green-600" : "text-muted-foreground"}`}>
              {stats.distilbert_ready ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} DistilBERT (500+)
            </p>
            <p className={`text-xs flex items-center gap-1 ${stats.byt5_ready ? "text-green-600" : "text-muted-foreground"}`}>
              {stats.byt5_ready ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} ByT5 (2,000+)
            </p>
          </div>
        </div>

        {stats.pending_review > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ClipboardList className="w-3 h-3" /> <span className="font-semibold">{stats.pending_review}</span> items waiting for your review below
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Generate Batch Section ───────────────────────────────────────────────────

function GenerateBatchSection({ onGenerated }: { onGenerated: () => void }) {
  const [params, setParams] = useState<GenerateBatchParams>({
    count: 25,
    categories: ["gen_z", "internet"],
    context_style: "text_message",
    slang_mix: 0.6,
  })
  const [generating, setGenerating] = useState(false)
  const [targetWord, setTargetWord] = useState("")

  const toggleCategory = (value: string) => {
    setParams((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value],
    }))
  }

  const handleGenerate = async () => {
    if (params.categories.length === 0) {
      toast.error("Select at least one category")
      return
    }
    setGenerating(true)
    try {
      const result = await generateDatasetBatch({
        ...params,
        ...(targetWord.trim() ? { target_word: targetWord.trim() } : {}),
      })
      toast.success(result.message)
      setTargetWord("")
      onGenerated()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao gerar batch"
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  const slangCount = Math.round(params.count * params.slang_mix)
  const neutralCount = params.count - slangCount

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold">Generate Batch</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          OpenAI generates sentences → local model scores them → only uncertain ones need your review.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Count selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">How many sentences?</label>
          <div className="flex gap-2">
            {COUNT_OPTIONS.map((n) => (
              <Button
                key={n}
                variant={params.count === n ? "default" : "outline"}
                size="sm"
                onClick={() => setParams((p) => ({ ...p, count: n }))}
              >
                {n}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            ~{slangCount} slang + ~{neutralCount} neutral sentences
          </p>
        </div>

        {/* Category pills */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${params.categories.includes(cat.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context + slang mix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Context style</label>
            <select
              value={params.context_style}
              onChange={(e) => setParams((p) => ({ ...p, context_style: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CONTEXT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Slang mix:{" "}
              <span className="text-primary font-bold">{Math.round(params.slang_mix * 100)}%</span>
            </label>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.1}
              value={params.slang_mix}
              onChange={(e) => setParams((p) => ({ ...p, slang_mix: parseFloat(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round((1 - params.slang_mix) * 100)}% neutral</span>
              <span>{Math.round(params.slang_mix * 100)}% slang</span>
            </div>
          </div>
        </div>

        {/* Target word */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Target word</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Force every sentence to include this word. Use it to fix model failures on ambiguous words (e.g. &quot;fire&quot;, &quot;sick&quot;). Generates a mix of slang and literal usages so the model learns from context.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <input
            type="text"
            placeholder="One word only — e.g. fire (optional)"
            value={targetWord}
            onChange={(e) => setTargetWord(e.target.value.split(/[\s,]+/)[0])}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating… (this takes ~10s)
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate {params.count} sentences{targetWord.trim() ? ` for "${targetWord.trim()}"` : ""}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Vocabulary Amplification Section ─────────────────────────────────────────

function VocabularyAmplifySection({ onAmplified }: { onAmplified: () => void }) {
  const [vocab, setVocab] = useState<VocabularyInfo | null>(null)
  const [vocabLoading, setVocabLoading] = useState(true)
  const [variationsPerWord, setVariationsPerWord] = useState(10)
  const [amplifying, setAmplifying] = useState(false)

  const loadVocab = useCallback(async () => {
    setVocabLoading(true)
    try {
      const data = await getVocabulary()
      setVocab(data)
    } catch {
      // non-critical — fail silently
    } finally {
      setVocabLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVocab()
  }, [loadVocab])

  const handleAmplify = async () => {
    if (!vocab || vocab.unique_words === 0) {
      toast.error("Nenhuma palavra encontrada. Gere um batch primeiro.")
      return
    }
    setAmplifying(true)
    try {
      const result = await amplifyVocabulary({ variations_per_word: variationsPerWord })
      toast.success(result.message)
      onAmplified()
      loadVocab()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao amplificar vocabulario"
      toast.error(message)
    } finally {
      setAmplifying(false)
    }
  }

  const estimatedNew = vocab ? vocab.unique_words * variationsPerWord : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold">Amplify Vocabulary</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Generates fresh sentence variations for every slang word already known in your dataset —
          fixes "too few examples per word" instead of adding new random words.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {vocabLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading known vocabulary…
          </div>
        ) : (
          <div className="rounded-lg border bg-accent/20 p-3 text-sm">
            <span className="font-semibold">{vocab?.unique_words ?? 0}</span> unique slang words found in your dataset
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Variations per word: <span className="text-primary font-bold">{variationsPerWord}</span>
          </label>
          <input
            type="range"
            min={4}
            max={20}
            step={1}
            value={variationsPerWord}
            onChange={(e) => setVariationsPerWord(parseInt(e.target.value, 10))}
            className="w-full accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            Will generate ~{estimatedNew.toLocaleString()} new sentences
          </p>
        </div>

        <Button onClick={handleAmplify} disabled={amplifying || vocabLoading} className="w-full">
          {amplifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Amplifying… (this may take a while)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Amplify {vocab?.unique_words ?? 0} words
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminFeedbackView() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [stats, setStats] = useState<DatasetStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Advanced Review Panel States
  const [activeIdx, setActiveIdx] = useState<number>(-1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all")
  const [isSuggesting, setIsSuggesting] = useState<Record<string, boolean>>({})

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await getDatasetStats()
      setStats(data)
    } catch {
      // stats are non-critical — fail silently
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPendingTranslationFeedback()
      // Sort: lowest agreement_confidence first (most uncertain = most valuable to review)
      const sorted = [...data].sort((a: FeedbackRow, b: FeedbackRow) => {
        const aConf = a.model_metadata?.agreement_confidence ?? 1
        const bConf = b.model_metadata?.agreement_confidence ?? 1
        return aConf - bConf
      })
      setRows(sorted)
      setDrafts(Object.fromEntries(sorted.map((row: FeedbackRow) => [row.id, makeDraft(row)])))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar feedbacks"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAll = useCallback(() => {
    loadRows()
    loadStats()
  }, [loadRows, loadStats])

  useEffect(() => {
    loadRows()
    loadStats()
  }, [loadRows, loadStats])

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }))
  }

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id))
    setDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setSelectedIds((current) => current.filter((sid) => sid !== id))
  }

  const handleApprove = async (row: FeedbackRow) => {
    const draft = drafts[row.id]
    if (!draft?.expected_normalized.trim()) {
      toast.error("Preencha o normalized English")
      return
    }
    setBusyId(row.id)
    try {
      await approveTranslationFeedback(row.id, {
        expected_normalized: draft.expected_normalized,
        expected_translation: draft.expected_translation || null,
        expected_is_slang: draft.expected_is_slang,
        failure_type: draft.failure_type || "wrong_slang_sense",
      })
      removeRow(row.id)
      toast.success("Feedback aprovado")
      loadStats()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao aprovar"
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (row: FeedbackRow, status: "rejected" | "duplicate") => {
    setBusyId(row.id)
    try {
      await rejectTranslationFeedback(row.id, status)
      removeRow(row.id)
      toast.success(status === "duplicate" ? "Marcado como duplicado" : "Feedback rejeitado")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao rejeitar"
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  const handleSuggestTranslation = async (row: FeedbackRow) => {
    const draft = drafts[row.id]
    if (!draft) return
    const textToTranslate = draft.expected_normalized || row.input_text
    if (!textToTranslate.trim()) {
      toast.error("Please fill Expected normalized English first")
      return
    }

    setIsSuggesting((prev) => ({ ...prev, [row.id]: true }))
    try {
      const result = await translateSentence(textToTranslate)
      updateDraft(row.id, { expected_translation: result.translation_pt })
      toast.success("Translation suggested!")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error translating sentence"
      toast.error(message)
    } finally {
      setIsSuggesting((prev) => ({ ...prev, [row.id]: false }))
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    setBusyId("bulk")
    const loadingToastId = toast.loading(`Approving ${selectedIds.length} items...`)
    let approved = 0
    let failed = 0

    for (const id of selectedIds) {
      const row = rows.find((r) => r.id === id)
      const draft = drafts[id]
      if (!row || !draft || !draft.expected_normalized.trim()) {
        failed++
        continue
      }
      try {
        await approveTranslationFeedback(row.id, {
          expected_normalized: draft.expected_normalized,
          expected_translation: draft.expected_translation || null,
          expected_is_slang: draft.expected_is_slang,
          failure_type: draft.failure_type || "wrong_slang_sense",
        })
        approved++
      } catch {
        failed++
      }
    }

    toast.dismiss(loadingToastId)
    toast.success(`Successfully approved ${approved} items.${failed > 0 ? ` Failed: ${failed}` : ""}`)

    setRows((current) => current.filter((row) => !selectedIds.includes(row.id)))
    setDrafts((current) => {
      const next = { ...current }
      selectedIds.forEach((id) => delete next[id])
      return next
    })
    setSelectedIds([])
    setBusyId(null)
    loadStats()
  }

  const handleBulkReject = async (status: "rejected" | "duplicate") => {
    if (selectedIds.length === 0) return
    setBusyId("bulk")
    const loadingToastId = toast.loading(`Processing ${selectedIds.length} items...`)
    let processed = 0
    let failed = 0

    for (const id of selectedIds) {
      try {
        await rejectTranslationFeedback(id, status)
        processed++
      } catch {
        failed++
      }
    }

    toast.dismiss(loadingToastId)
    toast.success(`Successfully processed ${processed} items.${failed > 0 ? ` Failed: ${failed}` : ""}`)

    setRows((current) => current.filter((row) => !selectedIds.includes(row.id)))
    setDrafts((current) => {
      const next = { ...current }
      selectedIds.forEach((id) => delete next[id])
      return next
    })
    setSelectedIds([])
    setBusyId(null)
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRows.map((r) => r.id))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  // Filtered rows logic
  const filteredRows = rows.filter((row) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchInput = row.input_text.toLowerCase().includes(q)
      const matchNormalized = (row.model_normalized || "").toLowerCase().includes(q)
      const matchTranslation = (row.model_translation || "").toLowerCase().includes(q)
      if (!matchInput && !matchNormalized && !matchTranslation) return false
    }

    if (sourceFilter !== "all" && row.source !== sourceFilter) {
      return false
    }

    if (confidenceFilter !== "all") {
      const conf = row.model_metadata?.agreement_confidence
      if (conf === undefined || conf === null) {
        if (confidenceFilter !== "low") return false
      } else {
        const pct = Math.round(conf * 100)
        if (confidenceFilter === "high" && pct < 70) return false
        if (confidenceFilter === "medium" && (pct < 50 || pct >= 70)) return false
        if (confidenceFilter === "low" && pct >= 50) return false
      }
    }

    return true
  })

  // Reset active index when filtered rows change
  useEffect(() => {
    setActiveIdx((prev) => {
      if (filteredRows.length === 0) return -1
      if (prev >= filteredRows.length) return filteredRows.length - 1
      return prev
    })
  }, [filteredRows.length])

  // Scroll active card into view
  useEffect(() => {
    if (activeIdx >= 0 && activeIdx < filteredRows.length) {
      const activeRow = filteredRows[activeIdx]
      const el = document.getElementById(`card-${activeRow.id}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [activeIdx, filteredRows])

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        if (e.key === "Escape") {
          ; (activeEl as HTMLElement).blur()
        }
        return
      }

      if (filteredRows.length === 0) return

      if (e.key === "j" || e.key === "J") {
        setActiveIdx((prev) => (prev < filteredRows.length - 1 ? prev + 1 : prev))
      } else if (e.key === "k" || e.key === "K") {
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === "a" || e.key === "A") {
        if (activeIdx >= 0 && activeIdx < filteredRows.length) {
          handleApprove(filteredRows[activeIdx])
        }
      } else if (e.key === "r" || e.key === "R") {
        if (activeIdx >= 0 && activeIdx < filteredRows.length) {
          handleReject(filteredRows[activeIdx], "rejected")
        }
      } else if (e.key === "d" || e.key === "D") {
        if (activeIdx >= 0 && activeIdx < filteredRows.length) {
          handleReject(filteredRows[activeIdx], "duplicate")
        }
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault()
        if (activeIdx >= 0 && activeIdx < filteredRows.length) {
          const inputEl = document.getElementById(`normalized-${filteredRows[activeIdx].id}`)
          if (inputEl) {
            inputEl.focus()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [filteredRows, activeIdx, drafts, busyId])

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ADMIN</p>
            <h2 className="text-3xl font-bold text-foreground">Dataset & Feedback</h2>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Generate training data automatically, track dataset health, and review uncertain items.
        </p>
      </div>

      {/* Dataset health dashboard */}
      <DatasetHealthSection stats={stats} loading={statsLoading} onRefresh={loadStats} />

      {/* Generate batch */}
      <GenerateBatchSection onGenerated={refreshAll} />

      {/* Amplify vocabulary */}
      <VocabularyAmplifySection onAmplified={refreshAll} />

      {/* Review queue */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Review Queue</h3>
            <Badge variant="outline" className="px-3 py-1">
              {rows.length} pending
            </Badge>
          </div>
          <Button variant="outline" onClick={loadRows} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="bg-muted/30 border rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by input text, translation, or feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Sources</option>
              <option value="ai_generated">AI Generated Only</option>
              <option value="app">User Reports Only</option>
            </select>
          </div>

          <div>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Confidence</option>
              <option value="low">Low Confidence (Uncertain)</option>
              <option value="medium">Medium Confidence</option>
              <option value="high">High Confidence</option>
            </select>
          </div>
        </div>

        {/* Keyboard Shortcuts Helper & Selection Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs text-muted-foreground bg-muted/20 border border-dashed rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary/80" />
            <span className="font-semibold">Hotkeys:</span>
            <span><kbd className="px-1 border rounded bg-background">J</kbd>/<kbd className="px-1 border rounded bg-background">K</kbd> navigation</span>
            <span>•</span>
            <span><kbd className="px-1 border rounded bg-background">A</kbd> Approve</span>
            <span>•</span>
            <span><kbd className="px-1 border rounded bg-background">R</kbd> Reject</span>
            <span>•</span>
            <span><kbd className="px-1 border rounded bg-background">D</kbd> Duplicate</span>
            <span>•</span>
            <span><kbd className="px-1 border rounded bg-background">E</kbd> Focus expected text</span>
          </div>
          <div>
            {filteredRows.length !== rows.length ? (
              <span>Showing {filteredRows.length} of {rows.length} pending items</span>
            ) : (
              <span>{rows.length} pending items total</span>
            )}
          </div>
        </div>

        {/* Bulk Action Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-sm font-medium border-r pr-4 border-border">
              <ListChecks className="w-4 h-4 text-primary" />
              <span>{selectedIds.length} items selected</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject("duplicate")}
                disabled={busyId !== null}
                className="rounded-full h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Bulk Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject("rejected")}
                disabled={busyId !== null}
                className="rounded-full h-8 text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Bulk Reject
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={busyId !== null}
                className="rounded-full h-8"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Bulk Approve
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedIds([])}
              className="h-7 w-7 rounded-full ml-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading review queue…</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> No matching items in the queue.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/10 border rounded-lg">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredRows.length && filteredRows.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium select-none cursor-pointer" onClick={toggleSelectAll}>
                Select all visible ({filteredRows.length})
              </span>
            </div>

            {filteredRows.map((row, index) => {
              const draft = drafts[row.id] || makeDraft(row)
              const disabled = busyId === row.id || busyId === "bulk"
              const confidenceBadge = getConfidenceBadge(row)
              const isAiGenerated = row.source === "ai_generated"
              const isFocused = activeIdx === index
              const isSelected = selectedIds.includes(row.id)

              return (
                <Card
                  key={row.id}
                  id={`card-${row.id}`}
                  onClick={() => setActiveIdx(index)}
                  className={`border-border/70 transition-all duration-200 cursor-pointer ${isFocused ? "ring-2 ring-primary border-primary shadow-lg bg-primary/[0.01]" : ""
                    } ${isSelected ? "border-primary/40 bg-primary/[0.02]" : ""
                    }`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {/* Checkbox for selection */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 mt-1.5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{row.input_text}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {isAiGenerated ? (
                            <Badge variant="secondary" className="gap-1">
                              <Bot className="w-3 h-3" /> AI generated
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <User className="w-3 h-3" /> User report
                            </Badge>
                          )}

                          {isAiGenerated && row.model_metadata?.category && (
                            <Badge variant="outline" className="text-xs">
                              {row.model_metadata.category}
                            </Badge>
                          )}

                          {confidenceBadge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${confidenceBadge.className}`}>
                              <AlertTriangle className="w-3 h-3" /> {confidenceBadge.label}
                            </span>
                          )}

                          <Badge variant={row.model_is_slang ? "default" : "outline"}>
                            model: {row.model_is_slang ? "slang" : "not slang"}
                          </Badge>

                          {row.user_feedback !== "ai_generated" && (
                            <Badge variant="outline">{row.user_feedback}</Badge>
                          )}
                        </div>

                        {isAiGenerated &&
                          row.model_metadata?.slang_words &&
                          row.model_metadata.slang_words.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Slang words: {row.model_metadata.slang_words.join(", ")}
                            </p>
                          )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(row.input_text)
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-md border bg-accent/20 p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Model normalized (diff vs original)</p>
                        <div className="text-sm">
                          <DiffHighlight original={row.input_text} revised={row.model_normalized || ""} />
                        </div>
                      </div>
                      <div className="rounded-md border bg-accent/20 p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Model translation</p>
                        <p className="text-sm">{row.model_translation || "-"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expected normalized English</label>
                        <Textarea
                          id={`normalized-${row.id}`}
                          value={draft.expected_normalized}
                          onChange={(e) => updateDraft(row.id, { expected_normalized: e.target.value })}
                          className="min-h-20"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Expected Portuguese</label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSuggesting[row.id] || disabled}
                            onClick={() => handleSuggestTranslation(row)}
                            className="h-7 text-xs text-primary hover:text-primary gap-1 px-2"
                          >
                            {isSuggesting[row.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Suggest Translation
                          </Button>
                        </div>
                        <Textarea
                          value={draft.expected_translation}
                          onChange={(e) => updateDraft(row.id, { expected_translation: e.target.value })}
                          className="min-h-20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center justify-between">
                          <span>Failure type</span>
                          <span className="text-xs text-muted-foreground">Select a category below or type custom</span>
                        </label>

                        {/* Predefined Failure Type Pills */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {FAILURE_TYPES.map((ft) => (
                            <button
                              key={ft.value}
                              type="button"
                              title={ft.desc}
                              onClick={() => updateDraft(row.id, { failure_type: ft.value })}
                              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${draft.failure_type === ft.value
                                  ? "bg-primary text-primary-foreground border-primary font-medium"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                                }`}
                            >
                              {ft.label}
                            </button>
                          ))}
                        </div>

                        <Input
                          value={draft.failure_type}
                          onChange={(e) => updateDraft(row.id, { failure_type: e.target.value })}
                          placeholder="Or type a custom failure type..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expected slang?</label>
                        <Button
                          type="button"
                          variant={draft.expected_is_slang ? "default" : "outline"}
                          className="w-full"
                          onClick={() => updateDraft(row.id, { expected_is_slang: !draft.expected_is_slang })}
                        >
                          {draft.expected_is_slang ? "Yes" : "No"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => handleReject(row, "duplicate")}
                        disabled={disabled}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Duplicate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(row, "rejected")}
                        disabled={disabled}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button onClick={() => handleApprove(row)} disabled={disabled}>
                        {busyId === row.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
