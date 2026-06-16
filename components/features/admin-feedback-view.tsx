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
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Trophy,
  User,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import {
  approveTranslationFeedback,
  generateDatasetBatch,
  getDatasetStats,
  getPendingTranslationFeedback,
  rejectTranslationFeedback,
  type DatasetStats,
  type GenerateBatchParams,
} from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"


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
      const result = await generateDatasetBatch(params)
      toast.success(result.message)
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
              <span>20% slang</span>
              <span>90% slang</span>
            </div>
          </div>
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
              Generate {params.count} sentences
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading review queue…</p>
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> No pending items. Generate a batch to fill the queue!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const draft = drafts[row.id] || makeDraft(row)
              const disabled = busyId === row.id
              const confidenceBadge = getConfidenceBadge(row)
              const isAiGenerated = row.source === "ai_generated"

              return (
                <Card key={row.id} className="border-border/70">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
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
                        onClick={() => navigator.clipboard.writeText(row.input_text)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-md border bg-accent/20 p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Model normalized</p>
                        <p className="text-sm">{row.model_normalized || "-"}</p>
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
                          value={draft.expected_normalized}
                          onChange={(e) => updateDraft(row.id, { expected_normalized: e.target.value })}
                          className="min-h-20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expected Portuguese</label>
                        <Textarea
                          value={draft.expected_translation}
                          onChange={(e) => updateDraft(row.id, { expected_translation: e.target.value })}
                          className="min-h-20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Failure type</label>
                        <Input
                          value={draft.failure_type}
                          onChange={(e) => updateDraft(row.id, { failure_type: e.target.value })}
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
