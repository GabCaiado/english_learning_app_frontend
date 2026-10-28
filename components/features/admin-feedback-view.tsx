"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Cpu,
  Flag,
  Hash,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Rocket,
  Share2,
  SkipForward,
  SlidersHorizontal,
  Trash2,
  User,
  X,
  Zap,
  Keyboard,
  Search,
  Sparkles,
  ListChecks,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  amplifyVocabulary,
  approveTranslationFeedback,
  generateDatasetBatch,
  getDatasetStats,
  getPendingTranslationFeedback,
  getVocabulary,
  isAbortError,
  rejectTranslationFeedback,
  translateSentence,
  type DatasetStats,
  type GenerateBatchParams,
  type VocabularyInfo,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PaginationControls } from "@/components/pagination-controls"
import { EyebrowLabel, KbdHint, Pill, TonalIcon, useConfirm } from "@/components/shared"
import { cn } from "@/lib/utils"
import { PageContainer } from "@/components/layout/page-container"


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
    llm_suggested_is_slang?: boolean
    llm_suggested_normalized?: string
    llm_suggested_translation?: string | null
    translation_warnings?: { llm_suggested?: string[]; model?: string[] }
    was_edited?: boolean
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

function seedValues(row: FeedbackRow) {
  if (AI_SOURCES.includes(row.source)) {
    return {
      normalized: row.model_metadata?.llm_suggested_normalized ?? (row.model_normalized || row.input_text),
      translation: row.model_metadata?.llm_suggested_translation ?? (row.model_translation || ""),
      isSlang: row.model_metadata?.llm_suggested_is_slang ?? (row.model_is_slang ?? true),
    }
  }
  return {
    normalized: row.model_normalized || row.input_text,
    translation: row.model_translation || "",
    isSlang: row.model_is_slang ?? true,
  }
}

function normText(value?: string | null) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ")
}

function draftWasEdited(row: FeedbackRow, draft: Draft): boolean {
  const seed = seedValues(row)
  return (
    normText(draft.expected_normalized) !== normText(seed.normalized) ||
    normText(draft.expected_translation) !== normText(seed.translation) ||
    draft.expected_is_slang !== seed.isSlang
  )
}

const FAILURE_TYPES = [
  { value: "correct", label: "Correct", desc: "Model got it right — just flagged for review (e.g. low confidence)" },
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
            className={isNew ? "rounded bg-destructive-soft px-0.5 text-destructive line-through decoration-destructive/70" : ""}
          >
            {word}
          </span>
        )
      })}
    </span>
  )
}


const CATEGORY_OPTIONS = [
  { value: "gen_z", label: "TikTok & Gen Z" },
  { value: "internet", label: "Internet & Memes" },
  { value: "dating", label: "Relacionamentos" },
  { value: "sports", label: "Esportes" },
  { value: "work", label: "Trabalho & Tech" },
  { value: "general", label: "Conversa Diária" },
]

const CONTEXT_OPTIONS = [
  { value: "text_message", label: "Mensagens de texto (DM / WhatsApp)" },
  { value: "social_media", label: "Redes sociais" },
  { value: "group_chat", label: "Chat em grupo" },
  { value: "casual_speech", label: "Fala casual" },
  { value: "reaction", label: "Reação / resposta" },
]

const COUNT_OPTIONS = [10, 25, 50, 100]

// Helpers
function makeDraft(row: FeedbackRow): Draft {
  // For AI-generated/amplified rows, model_* now holds the REAL pipeline
  // output (SlangDetector + SlangNormalizer + Translator), while GPT's
  // generation-time guess lives in model_metadata as a suggestion — seed the
  // reviewer's draft from that suggestion instead of the model's own output,
  // so "Model" (what the app actually does) and "Expected" (what a human
  // confirms) stay independent signals. User-report rows have no GPT
  // suggestion, so they keep seeding from model_* as before.
  const isAiSourced = AI_SOURCES.includes(row.source)
  const suggestedNormalized = row.model_metadata?.llm_suggested_normalized
  const suggestedTranslation = row.model_metadata?.llm_suggested_translation
  const suggestedIsSlang = row.model_metadata?.llm_suggested_is_slang

  const expectedNormalized = isAiSourced && suggestedNormalized ? suggestedNormalized : (row.model_normalized || row.input_text)
  const expectedTranslation = isAiSourced && suggestedTranslation ? suggestedTranslation : (row.model_translation || "")
  const expectedIsSlang = isAiSourced && suggestedIsSlang !== undefined ? suggestedIsSlang : (row.model_is_slang ?? true)

  return {
    expected_normalized: expectedNormalized,
    expected_translation: expectedTranslation,
    expected_is_slang: expectedIsSlang,
    failure_type: expectedIsSlang ? "wrong_slang_sense" : "missed_slang",
  }
}

function getConfidenceBadge(row: FeedbackRow): { label: string; variant: "warning" | "destructive" } | null {
  const conf = row.model_metadata?.agreement_confidence
  if (conf === undefined || conf === null) return null
  const pct = Math.round(conf * 100)
  if (pct >= 70) return { label: `${pct}% (Confiante)`, variant: "warning" }
  if (pct >= 50) return { label: `${pct}% (Incerto)`, variant: "warning" }
  return { label: `${pct}% (Muito incerto)`, variant: "destructive" }
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
function HealthMiniCard({
  eyebrow,
  icon,
  children,
  note,
}: {
  eyebrow: string
  icon: LucideIcon
  children: ReactNode
  note?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <EyebrowLabel className="leading-snug">{eyebrow}</EyebrowLabel>
        <TonalIcon icon={icon} tone="primary" size="sm" />
      </div>
      <div className="flex-1 space-y-1">{children}</div>
      {note ? (
        <Pill
          variant="warning"
          size="sm"
          icon={AlertTriangle}
          className="h-auto whitespace-normal py-1 leading-snug"
        >
          {note}
        </Pill>
      ) : null}
    </div>
  )
}

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
      <section className="rounded-panel border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Carregando estatísticas do dataset…
        </div>
      </section>
    )
  }

  if (!stats) return null

  const { next } = getProgressToNextMilestone(stats)
  const slangPct = stats.total_approved > 0
    ? Math.round((stats.slang_count / stats.total_approved) * 100)
    : 0
  const neutralPct = stats.total_approved > 0 ? 100 - slangPct : 0
  const aiCount = AI_SOURCES.reduce((sum, s) => sum + (stats.by_source[s] ?? 0), 0)
  const userCount = USER_SOURCES.reduce((sum, s) => sum + (stats.by_source[s] ?? 0), 0)
  const sourceTotal = aiCount + userCount
  const aiPct = sourceTotal > 0 ? Math.round((aiCount / sourceTotal) * 1000) / 10 : 0
  const userPct = sourceTotal > 0 ? Math.round((100 - aiPct) * 10) / 10 : 0
  const target = stats.milestones.length
    ? stats.milestones[stats.milestones.length - 1].count
    : stats.total_approved
  const overallPct = target > 0 ? Math.min(100, (stats.total_approved / target) * 100) : 100

  return (
    <section className="space-y-6 rounded-panel border border-border bg-card p-6 shadow-card">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Saúde Geral do Dataset</h3>
            {stats.balance_ok && (
              <Pill variant="success" size="sm" className="uppercase tracking-[0.06em]">
                Alta integridade
              </Pill>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Acompanhe o volume acumulado para disparo automático das rodadas de pesos de fine-tune.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          aria-label="Atualizar estatísticas"
          className="shrink-0 text-muted-foreground hover:text-primary"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {/* Overall progress */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="text-[40px] font-extrabold leading-none tracking-tight text-foreground">
              {stats.total_approved.toLocaleString()}
            </span>
            <span className="text-base font-semibold text-muted-foreground">
              / {target.toLocaleString()} frases
            </span>
          </p>
          <Pill variant="primary">{overallPct.toFixed(1)}% Completo</Pill>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso do dataset"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(overallPct)}
          className="h-3 w-full overflow-hidden rounded-full bg-primary-soft"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-primary to-success transition-[width]"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.milestones.map((m) => (
          <div
            key={m.count}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2.5",
              m.reached ? "border-success/30 bg-success-soft" : "border-primary/20 bg-primary-soft",
            )}
          >
            {m.reached ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Flag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-semibold",
                  m.reached ? "text-success-soft-foreground" : "text-primary-soft-foreground",
                )}
              >
                {m.label} ({m.count.toLocaleString()})
              </p>
              <p className="text-[11px] text-muted-foreground">
                {m.reached
                  ? "Atingido"
                  : next && next.count === m.count
                    ? `Próximo · faltam ${(m.count - stats.total_approved).toLocaleString()} frases`
                    : `Faltam ${(m.count - stats.total_approved).toLocaleString()} frases`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini-cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthMiniCard
          eyebrow="Balanço de Classes"
          icon={SlidersHorizontal}
          note={!stats.balance_ok ? "Desbalanceado — gere mais exemplos da classe menor" : undefined}
        >
          <p className="text-lg font-extrabold text-foreground">
            {slangPct}% Slang{" "}
            <span className="text-xs font-medium text-muted-foreground">/ {neutralPct}% Neutro</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.slang_count.toLocaleString()} gírias · {stats.neutral_count.toLocaleString()} neutras
          </p>
          {stats.balance_ok && (
            <p className="flex items-center gap-1 text-xs font-semibold text-success">
              <CheckCircle2 className="size-3" aria-hidden="true" /> Mix equilibrado
            </p>
          )}
        </HealthMiniCard>

        <HealthMiniCard eyebrow="Proporção de Fontes" icon={Share2}>
          <p className="text-lg font-extrabold text-foreground">
            {aiPct}% IA{" "}
            <span className="text-xs font-medium text-muted-foreground">/ {userPct}%</span>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Bot className="size-3" aria-hidden="true" /> {aiCount.toLocaleString()} Sintéticas
          </p>
          <p className="flex items-center gap-1 text-xs font-semibold text-primary">
            <User className="size-3" aria-hidden="true" /> {userCount.toLocaleString()} Relatórios Reais
          </p>
        </HealthMiniCard>

        <HealthMiniCard eyebrow="Prontidão dos Modelos" icon={Cpu}>
          <p className="flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">DistilBERT (500+)</span>
            <span className={cn("font-semibold", stats.distilbert_ready ? "text-success" : "text-muted-foreground")}>
              {stats.distilbert_ready ? "Pronto" : "Pendente"}
            </span>
          </p>
          <p className="flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">ByT5 (2,000+)</span>
            <span className={cn("font-semibold", stats.byt5_ready ? "text-success" : "text-muted-foreground")}>
              {stats.byt5_ready ? "Pronto" : "Pendente"}
            </span>
          </p>
        </HealthMiniCard>

        <HealthMiniCard
          eyebrow="Fila de Curadoria"
          icon={ClipboardList}
          note={stats.pending_review > 0 ? "Aguardando sua revisão abaixo" : undefined}
        >
          <p className="text-lg font-extrabold text-foreground">
            {stats.pending_review.toLocaleString()} Pendentes
          </p>
        </HealthMiniCard>
      </div>
    </section>
  )
}

// ─── Generate Batch Section ───────────────────────────────────────────────────

function GenerateBatchSection({ onGenerated }: { onGenerated: () => void }) {
  const [params, setParams] = useState<GenerateBatchParams>({
    count: 25,
    categories: ["gen_z", "internet"],
    context_style: "text_message",
    slang_mix: 0.6,
    avoid_overrepresented: true,
  })
  const [generating, setGenerating] = useState(false)
  const [targetWord, setTargetWord] = useState("")
  const { confirm, dialog: confirmDialog } = useConfirm()

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
      toast.error("Selecione ao menos uma categoria")
      return
    }
    const slangPct = Math.round(params.slang_mix * 100)
    const confirmed = await confirm({
      title: `Gerar lote de ${params.count} sentenças?`,
      description: `A IA vai gerar ${params.count} sentenças sintéticas (${slangPct}% gírias, ${100 - slangPct}% neutras) em ${params.categories.length} categoria(s)${targetWord.trim() ? `, focadas no termo "${targetWord.trim()}"` : ""}. O modelo BERT local pontua a confiança e os itens incertos entram na fila de curadoria. Isso consome créditos da OpenAI.`,
      confirmLabel: "Gerar lote",
    })
    if (!confirmed) return
    setGenerating(true)
    try {
      const result = await generateDatasetBatch({
        ...params,
        ...(targetWord.trim() ? { target_word: targetWord.trim() } : {}),
      })
      toast.success(result.message)
      if (result.avoided_words.length > 0) {
        toast.info(`Termos evitados: ${result.avoided_words.join(", ")}`)
      }
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
    <section className="space-y-5 rounded-panel border border-border bg-card p-6 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3">
        <TonalIcon icon={Zap} tone="primary" size="md" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-bold text-foreground">Gerador Sintético de Lotes (AI Batch)</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            OpenAI sintetiza cenários e expressões → Modelo BERT local pontua confiança → Itens incertos entram na fila de curadoria.
          </p>
        </div>
      </div>

      {/* Count selector */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-sm font-semibold text-foreground">Quantidade de sentenças</label>
          <span className="text-xs font-medium text-primary">
            ~{slangCount} gírias + ~{neutralCount} frases neutras
          </span>
        </div>
        <div role="group" aria-label="Quantidade de sentenças" className="grid grid-cols-4 gap-2">
          {COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={params.count === n}
              onClick={() => setParams((p) => ({ ...p, count: n }))}
              className={cn(
                "h-10 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                params.count === n
                  ? "border-primary bg-primary text-primary-foreground shadow-card"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft/40"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Categorias temáticas</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const selected = params.categories.includes(cat.value)
            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCategory(cat.value)}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70"
                )}
              >
                {cat.label}
                {selected && <Check className="size-3.5" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Context + slang mix */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="context-style" className="text-sm font-semibold text-foreground">Estilo de contexto</label>
          <select
            id="context-style"
            value={params.context_style}
            onChange={(e) => setParams((p) => ({ ...p, context_style: e.target.value }))}
            className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CONTEXT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="slang-mix" className="text-sm font-semibold text-primary">
              Mix: {Math.round(params.slang_mix * 100)}% Slang
            </label>
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round((1 - params.slang_mix) * 100)}% Neutro
            </span>
          </div>
          <input
            id="slang-mix"
            type="range"
            min={0.2}
            max={0.9}
            step={0.1}
            value={params.slang_mix}
            onChange={(e) => setParams((p) => ({ ...p, slang_mix: parseFloat(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Mais balanceado</span>
            <span>Mais focado em gírias</span>
          </div>
        </div>
      </div>

      {/* Target word */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="target-word" className="text-sm font-semibold text-foreground">
              Foco em termo específico (opcional)
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Força todas as sentenças a incluírem esta palavra. Use para corrigir falhas do modelo em palavras ambíguas (ex.: &quot;fire&quot;, &quot;sick&quot;). Gera uma mistura de usos gírias e literais para o modelo aprender pelo contexto.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-xs text-muted-foreground">Ex: fire, cap, delulu</span>
        </div>
        <input
          id="target-word"
          type="text"
          placeholder="Digite apenas uma palavra em inglês…"
          value={targetWord}
          onChange={(e) => setTargetWord(e.target.value.split(/[\s,]+/)[0])}
          className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Avoid overrepresented words toggle */}
      <div className="flex items-start gap-3 rounded-xl bg-primary-soft/60 p-3">
        <input
          type="checkbox"
          id="avoid-overrepresented"
          checked={params.avoid_overrepresented ?? true}
          onChange={(e) => setParams((p) => ({ ...p, avoid_overrepresented: e.target.checked }))}
          className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="avoid-overrepresented" className="cursor-pointer text-sm font-semibold text-foreground">
              Evitar termos já saturados no dataset
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3.5 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Afasta o prompt de palavras que já têm 50+ exemplos gírias e 30+ neutros no dataset, para o lote não continuar acumulando sentenças em palavras já bem cobertas.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">Prioriza variedade lexical e vocabulário sobressalente</p>
        </div>
      </div>

      {confirmDialog}
      <Button onClick={handleGenerate} disabled={generating} className="h-12 w-full rounded-xl text-sm font-semibold shadow-card">
        {generating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Gerando… (leva ~10s)
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            Gerar Lote de {params.count} Sentenças Sintéticas{targetWord.trim() ? ` para "${targetWord.trim()}"` : ""}
          </>
        )}
      </Button>
    </section>
  )
}

// ─── Vocabulary Amplification Section ─────────────────────────────────────────

function VocabularyAmplifySection({ onAmplified }: { onAmplified: () => void }) {
  const [vocab, setVocab] = useState<VocabularyInfo | null>(null)
  const [vocabLoading, setVocabLoading] = useState(true)
  const [amplifying, setAmplifying] = useState(false)
  const { confirm, dialog: confirmDialog } = useConfirm()

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
    const confirmed = await confirm({
      title: `Amplificar ${wordsBelowTarget.length} termos?`,
      description: `A IA vai gerar novas sentenças para ${wordsBelowTarget.length} termos com pouca cobertura no dataset, equilibrando exemplos literais e informais. Termos já bem cobertos são ignorados e os novos itens entram na fila de curadoria. Isso pode demorar.`,
      confirmLabel: "Amplificar",
    })
    if (!confirmed) return
    setAmplifying(true)
    try {
      const result = await amplifyVocabulary({})
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

  const wordsBelowTarget = vocab
    ? vocab.words.filter((w) => !vocab.overrepresented_words.includes(w))
    : []

  const uniqueWords = vocab?.unique_words ?? 0
  const gapPct = uniqueWords > 0 ? Math.min(100, (wordsBelowTarget.length / uniqueWords) * 100) : 0
  const countOf = (w: string) => vocab?.word_counts?.[w] ?? 0
  const priorityTerms = [...wordsBelowTarget].sort((a, b) => countOf(a) - countOf(b)).slice(0, 6)
  const hiddenTerms = wordsBelowTarget.length - priorityTerms.length

  return (
    <section className="flex flex-col gap-5 rounded-panel border border-border bg-card p-6 shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3">
        <TonalIcon icon={Layers} tone="success" size="md" />
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Amplify Vocabulary</h3>
            <Pill variant="primary" size="sm">Auto Top-Up</Pill>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Identifica termos escassos ou com ambiguidade semântica e gera sentenças com cobertura equilibrada.
          </p>
        </div>
      </div>

      {vocabLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando vocabulário…
        </div>
      ) : (
        <>
          {/* Gap diagnosis */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <EyebrowLabel className="text-foreground">Diagnóstico de lacunas</EyebrowLabel>
              {wordsBelowTarget.length > 0 && (
                <Pill variant="warning" size="sm">Atenção Prioritária</Pill>
              )}
            </div>
            <div className="flex items-end gap-3">
              <p className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-extrabold leading-none tracking-tight text-foreground">
                  {wordsBelowTarget.length}
                </span>
                <span className="text-base font-bold text-foreground">termos</span>
              </p>
              <p className="text-xs leading-snug text-muted-foreground">abaixo da meta de cobertura do dataset</p>
            </div>
            <div
              role="progressbar"
              aria-label="Termos abaixo da meta"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(gapPct)}
              className="h-2 w-full overflow-hidden rounded-full bg-warning-soft"
            >
              <div
                className="h-full rounded-full bg-warning-strong transition-[width]"
                style={{ width: `${gapPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {uniqueWords.toLocaleString()} palavras indexadas no dicionário ativo
            </p>
          </div>

          {/* Priority terms */}
          {priorityTerms.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Termos prioritários na fila de reforço:</p>
                <span className="text-xs font-semibold text-primary">{wordsBelowTarget.length} no total</span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {priorityTerms.map((w) => (
                  <li
                    key={w}
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-semibold text-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        countOf(w) <= 2 ? "bg-destructive" : "bg-warning-strong"
                      )}
                    />
                    &quot;{w}&quot;
                    <span className="font-normal text-muted-foreground">({countOf(w)} ex.)</span>
                  </li>
                ))}
                {hiddenTerms > 0 && (
                  <li className="inline-flex items-center">
                    <Pill variant="neutral" size="sm">+{hiddenTerms}</Pill>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Note */}
          <div className="flex items-start gap-2 rounded-xl bg-primary-soft/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p>
              Palavras com ambiguidade literal (&quot;chill&quot;, &quot;fire&quot;) recebem proporção 50/50 de
              exemplos literais e informais; termos já bem cobertos são ignorados.
            </p>
          </div>
        </>
      )}

      {confirmDialog}
      <Button
        variant="outline"
        onClick={handleAmplify}
        disabled={amplifying || vocabLoading || wordsBelowTarget.length === 0}
        className="mt-auto h-11 w-full rounded-xl border-2 border-primary bg-card text-sm font-semibold text-primary hover:bg-primary-soft hover:text-primary"
      >
        {amplifying ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Amplificando… (pode demorar)
          </>
        ) : (
          <>
            <Rocket className="size-4" />
            Amplificar {wordsBelowTarget.length} Termo{wordsBelowTarget.length === 1 ? "" : "s"} em 1-Clique
          </>
        )}
      </Button>
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 50

// Sources written by the synthetic dataset generator (app/services/dataset_generator.py) —
// these never had a real translation attempt, so they're not real translation-quality signal.
const AI_SOURCES = ["ai_generated", "ai_amplified"]
// Sources written by actual users reporting a bad result in the app.
const USER_SOURCES = ["word_book", "word_detail_sentence", "word_detail_word"]

// Display-only labels for the review queue (values sent to the API are unchanged).
const SOURCE_TABS = [
  { value: "all", label: "Todos os Casos" },
  { value: "user", label: "Relatórios de Usuário" },
  { value: "ai", label: "Gerados por IA" },
] as const
const CONFIDENCE_TABS = [
  { value: "all", label: "Qualquer Confiança" },
  { value: "low", label: "Baixa Confiança IA" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
] as const
const SOURCE_LABELS: Record<string, string> = {
  word_book: "Caderno",
  word_detail_sentence: "Frase",
  word_detail_word: "Palavra",
  ai_generated: "IA · Gerado",
  ai_amplified: "IA · Amplificado",
}
const FAILURE_TYPE_LABELS: Record<string, string> = {
  correct: "Correto",
  wrong_slang_sense: "Sentido Errado",
  missed_slang: "Gíria Não Detectada",
  false_positive: "Falso Positivo",
  literal_guard: "Sentido Literal",
  poor_translation: "Tradução Ruim",
  bad_generation: "Geração Ruim",
}

export function AdminFeedbackView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE

  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [total, setTotal] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [stats, setStats] = useState<DatasetStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Advanced Review Panel States
  const [activeIdx, setActiveIdx] = useState<number>(-1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  // Defaults to real user reports — the synthetic dataset-generator rows
  // (ai_generated/ai_amplified) outnumber real reports ~150:1 in needs_review,
  // so "all" buries the reports admins actually care about here.
  const [sourceFilter, setSourceFilter] = useState<string>("user")
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all")
  const [isSuggesting, setIsSuggesting] = useState<Record<string, boolean>>({})

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
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const offset = (page - 1) * pageSize
      const sources = sourceFilter === "ai" ? AI_SOURCES : sourceFilter === "user" ? USER_SOURCES : undefined
      const data = await getPendingTranslationFeedback(pageSize, offset, controller.signal, sources)
      // Sort: lowest agreement_confidence first (most uncertain = most valuable to review)
      const sorted = [...data.items].sort((a: FeedbackRow, b: FeedbackRow) => {
        const aConf = a.model_metadata?.agreement_confidence ?? 1
        const bConf = b.model_metadata?.agreement_confidence ?? 1
        return aConf - bConf
      })
      setRows(sorted)
      setTotal(data.total)
      setDrafts(Object.fromEntries(sorted.map((row: FeedbackRow) => [row.id, makeDraft(row)])))
    } catch (err: unknown) {
      if (isAbortError(err)) return
      const message = err instanceof Error ? err.message : "Erro ao carregar feedbacks"
      toast.error(message)
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [page, pageSize, sourceFilter])

  const refreshAll = useCallback(() => {
    loadRows()
    loadStats()
  }, [loadRows, loadStats])

  useEffect(() => {
    loadRows()
    loadStats()
    return () => abortRef.current?.abort()
  }, [loadRows, loadStats])

  // If the current page becomes out of range (e.g. after clearing the last
  // page's items), snap back to the last valid page.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (page > totalPages) {
      updateParams({ page: totalPages })
    }
  }, [page, pageSize, total, updateParams])

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
    if (!draft.failure_type.trim()) {
      toast.error("Select a failure type (or \"Correct\" if the model got it right)")
      return
    }
    if (AI_SOURCES.includes(row.source) && !draftWasEdited(row, draft) && draft.failure_type !== "correct") {
      toast.error("This still matches GPT's draft — edit it, or set failure type to \"Correct\" if it's actually fine")
      return
    }
    const confirmed = await confirm({
      title: "Aprovar correção e treinar?",
      description: `"${row.input_text}" será salvo com a correção informada e entrará no dataset de treinamento do modelo. O item sai da fila de curadoria.`,
      confirmLabel: "Aprovar e treinar",
    })
    if (!confirmed) return
    setBusyId(row.id)
    try {
      await approveTranslationFeedback(row.id, {
        expected_normalized: draft.expected_normalized,
        expected_translation: draft.expected_translation || null,
        expected_is_slang: draft.expected_is_slang,
        failure_type: draft.failure_type,
      })
      removeRow(row.id)
      setTotal((current) => Math.max(0, current - 1))
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
    const isDuplicate = status === "duplicate"
    const confirmed = await confirm({
      title: isDuplicate ? "Marcar como duplicada?" : "Descartar item?",
      description: isDuplicate
        ? `"${row.input_text}" será marcado como amostra duplicada e removido da fila de curadoria, sem entrar no treinamento.`
        : `"${row.input_text}" será rejeitado e removido da fila de curadoria, sem entrar no treinamento.`,
      confirmLabel: isDuplicate ? "Marcar duplicada" : "Descartar",
      tone: isDuplicate ? "warning" : "destructive",
      icon: isDuplicate ? Copy : Trash2,
    })
    if (!confirmed) return
    setBusyId(row.id)
    try {
      await rejectTranslationFeedback(row.id, status)
      removeRow(row.id)
      setTotal((current) => Math.max(0, current - 1))
      toast.success(status === "duplicate" ? "Marcado como duplicado" : "Feedback rejeitado")
      loadStats()
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
    let failed = 0
    let skippedUnreviewed = 0
    const approvedIds: string[] = []

    for (const id of selectedIds) {
      const row = rows.find((r) => r.id === id)
      const draft = drafts[id]
      if (!row || !draft || !draft.expected_normalized.trim() || !draft.failure_type.trim()) {
        failed++
        continue
      }
      // Bulk-approve must not let untouched GPT drafts sail through unread —
      // skip these individually so the reviewer has to open and confirm/edit
      // each one instead of rubber-stamping a whole page at once. Skipped
      // rows stay in the list/selection so nothing silently disappears.
      if (AI_SOURCES.includes(row.source) && !draftWasEdited(row, draft) && draft.failure_type !== "correct") {
        skippedUnreviewed++
        continue
      }
      try {
        await approveTranslationFeedback(row.id, {
          expected_normalized: draft.expected_normalized,
          expected_translation: draft.expected_translation || null,
          expected_is_slang: draft.expected_is_slang,
          failure_type: draft.failure_type,
        })
        approvedIds.push(id)
      } catch {
        failed++
      }
    }

    toast.dismiss(loadingToastId)
    const skippedNote = skippedUnreviewed > 0 ? ` Skipped ${skippedUnreviewed} unreviewed GPT draft(s) — open each one, edit it, or mark it "Correct" individually.` : ""
    toast.success(`Successfully approved ${approvedIds.length} items.${failed > 0 ? ` Failed: ${failed}` : ""}${skippedNote}`)

    setRows((current) => current.filter((row) => !approvedIds.includes(row.id)))
    setTotal((current) => Math.max(0, current - approvedIds.length))
    setDrafts((current) => {
      const next = { ...current }
      approvedIds.forEach((id) => delete next[id])
      return next
    })
    setSelectedIds((current) => current.filter((id) => !approvedIds.includes(id)))
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
    setTotal((current) => Math.max(0, current - processed))
    setDrafts((current) => {
      const next = { ...current }
      selectedIds.forEach((id) => delete next[id])
      return next
    })
    setSelectedIds([])
    setBusyId(null)
    loadStats()
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

    // Source filtering happens server-side via the `sources` param (see loadRows) —
    // it has to, since it changes which rows exist across pages, not just which
    // of the current page's rows are shown.

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
    <PageContainer className="space-y-6">

      {/* Header */}
      {confirmDialog}
      <header className="flex items-start gap-4">
        <TonalIcon icon={BrainCircuit} tone="primary" size="lg" />
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant="primary" size="sm" icon={Sparkles} className="uppercase tracking-[0.06em]">
              Console de IA &amp; Curadoria
            </Pill>
          </div>
          <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
            Dataset &amp; Feedback Engine
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Geração sintética supervisionada, telemetria de saúde de corpus e pipeline de
            fine-tuning humano (HITL) para modelos ByT5 e DistilBERT.
          </p>
        </div>
      </header>

      {/* Dataset health dashboard */}
      <DatasetHealthSection stats={stats} loading={statsLoading} onRefresh={loadStats} />

      {/* Generator + Amplify */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <GenerateBatchSection onGenerated={refreshAll} />
        <VocabularyAmplifySection onAmplified={refreshAll} />
      </div>

      {/* Review queue */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
              Fila de Curadoria Ativa (HITL)
            </h3>
            <Pill variant="primary" size="sm" dot>
              {total} {total === 1 ? "item requer decisão imediata" : "itens requerem decisão imediata"}
            </Pill>
          </div>
          <Button variant="outline" size="sm" onClick={loadRows} disabled={loading} className="rounded-lg bg-card">
            <RefreshCw className="size-3.5" />
            Recarregar Fila
          </Button>
        </div>

        {/* Filters as tabs + search */}
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Origem" className="flex flex-wrap items-center gap-1">
            {SOURCE_TABS.map((t) => {
              const active = sourceFilter === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSourceFilter(t.value)
                    updateParams({ page: 1 })
                  }}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground",
                  )}
                >
                  {t.label}
                  {active && !loading ? (
                    <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] leading-4">{total}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <div role="tablist" aria-label="Confiança" className="flex flex-wrap items-center gap-1">
            {CONFIDENCE_TABS.map((t) => {
              const active = confidenceFilter === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setConfidenceFilter(t.value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:bg-primary-soft hover:text-primary-soft-foreground",
                  )}
                >
                  {t.label}
                  {active && t.value !== "all" && !loading ? (
                    <span title="nesta página" className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] leading-4">
                      {filteredRows.length}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por entrada ou tradução…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-full bg-card pl-9 text-xs"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Helper & Selection Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft/60 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Keyboard className="size-4 text-primary" />
              Atalhos de produtividade:
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <KbdHint>J</KbdHint>/<KbdHint label="navegar">K</KbdHint>
            </span>
            <span aria-hidden className="text-muted-foreground/50">•</span>
            <KbdHint label="aprovar">A</KbdHint>
            <span aria-hidden className="text-muted-foreground/50">•</span>
            <KbdHint label="rejeitar">R</KbdHint>
            <span aria-hidden className="text-muted-foreground/50">•</span>
            <KbdHint label="duplicar">D</KbdHint>
            <span aria-hidden className="text-muted-foreground/50">•</span>
            <KbdHint label="editar texto esperado">E</KbdHint>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {filteredRows.length !== rows.length
              ? `Exibindo ${filteredRows.length} de ${rows.length} itens nesta página`
              : `Item ${activeIdx >= 0 ? activeIdx + 1 : 0} de ${rows.length} na página atual`}
          </span>
        </div>

        {/* Bulk Action Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-border bg-card px-6 py-3 text-foreground shadow-card animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 border-r border-border pr-4 text-sm font-medium">
              <ListChecks className="size-4 text-primary" />
              <span>{selectedIds.length} {selectedIds.length === 1 ? "item selecionado" : "itens selecionados"}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject("duplicate")}
                disabled={busyId !== null}
                className="h-8 rounded-full"
              >
                <Copy className="size-3.5" />
                Duplicar em lote
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject("rejected")}
                disabled={busyId !== null}
                className="h-8 rounded-full border-destructive/30 text-destructive hover:bg-destructive-soft hover:text-destructive"
              >
                <X className="size-3.5" />
                Rejeitar em lote
              </Button>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={busyId !== null}
                className="h-8 rounded-full"
              >
                <Check className="size-3.5" />
                Aprovar em lote
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedIds([])}
              aria-label="Limpar seleção"
              className="ml-1 size-7 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-panel border border-border bg-card p-6 shadow-card">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-panel border border-border bg-card py-12 text-sm text-muted-foreground shadow-card">
            <CheckCircle2 className="size-4 text-success" /> Nenhum item correspondente na fila.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            <label className="flex w-fit cursor-pointer select-none items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={selectedIds.length === filteredRows.length && filteredRows.length > 0}
                onChange={toggleSelectAll}
                className="size-4 rounded border-border accent-primary"
              />
              Selecionar todos visíveis ({filteredRows.length})
            </label>

            {filteredRows.map((row, index) => {
              const draft = drafts[row.id] || makeDraft(row)
              const disabled = busyId === row.id || busyId === "bulk"
              const confidenceBadge = getConfidenceBadge(row)
              const isAiGenerated = AI_SOURCES.includes(row.source)
              const isFocused = activeIdx === index
              const isSelected = selectedIds.includes(row.id)
              const modelWarnings = row.model_metadata?.translation_warnings?.model ?? []
              const normalizationChanged =
                !!row.model_normalized && normText(row.model_normalized) !== normText(row.input_text)

              return (
                <article
                  key={row.id}
                  id={`card-${row.id}`}
                  onClick={() => setActiveIdx(index)}
                  className={cn(
                    "cursor-pointer space-y-5 rounded-[20px] border bg-card p-6 shadow-card transition-all duration-200",
                    isFocused ? "border-primary ring-2 ring-primary/25" : "border-primary/30 hover:border-primary/60",
                    isSelected && "bg-primary-soft/20",
                  )}
                >
                  {/* Top row: selection + pills + actions */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRow(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Selecionar item"
                      className="mt-1 size-4 rounded border-border accent-primary"
                    />
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {isAiGenerated ? (
                        <Pill variant="info" icon={Bot}>Gerado por IA</Pill>
                      ) : (
                        <Pill variant="destructive" icon={Flag}>Reportado por Usuário</Pill>
                      )}

                      {isAiGenerated && row.model_metadata?.category && (
                        <Pill variant="primary" icon={Hash}>{row.model_metadata.category}</Pill>
                      )}

                      <Pill variant={row.model_is_slang ? "primary" : "neutral"}>
                        Modelo: {row.model_is_slang ? "Gíria" : "Neutro"}
                      </Pill>

                      {confidenceBadge && (
                        <Pill variant={confidenceBadge.variant} dot>
                          Confiança do Modelo: {confidenceBadge.label}
                        </Pill>
                      )}

                      {row.user_feedback !== "ai_generated" && (
                        <Pill variant="outline">{row.user_feedback}</Pill>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copiar entrada"
                      className="size-8 text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(row.input_text)
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>

                  <div className="space-y-5" onClick={(e) => e.stopPropagation()}>
                    {/* Input under review */}
                    <div className="space-y-2">
                      <EyebrowLabel>Entrada em análise</EyebrowLabel>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft/50 px-5 py-4">
                        <p className="text-xl font-extrabold tracking-tight text-foreground">
                          &ldquo;{row.input_text}&rdquo;
                        </p>
                        <Pill variant="primary" size="sm">
                          Fonte: {SOURCE_LABELS[row.source] ?? row.source}
                        </Pill>
                      </div>
                      {isAiGenerated &&
                        row.model_metadata?.slang_words &&
                        row.model_metadata.slang_words.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Gírias: {row.model_metadata.slang_words.join(", ")}
                          </p>
                        )}
                    </div>

                    {/* Model output panels */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive-soft/40 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <EyebrowLabel className="text-destructive-soft-foreground">
                            Saída do modelo (normalização)
                          </EyebrowLabel>
                          <Pill variant="destructive" size="sm">
                            {normalizationChanged ? "Substituição" : "Sem alteração"}
                          </Pill>
                        </div>
                        <div className="text-base font-semibold text-foreground">
                          <DiffHighlight original={row.input_text} revised={row.model_normalized || ""} />
                        </div>
                      </div>
                      <div className="space-y-2 rounded-xl border border-warning-strong/25 bg-warning-soft/40 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <EyebrowLabel className="text-warning-soft-foreground">
                            Tradução atual do modelo
                          </EyebrowLabel>
                          {modelWarnings.length > 0 && (
                            <Pill variant="warning" size="sm">
                              {modelWarnings.length} {modelWarnings.length === 1 ? "alerta" : "alertas"}
                            </Pill>
                          )}
                        </div>
                        <p className="text-base font-semibold text-foreground">
                          &ldquo;{row.model_translation || "-"}&rdquo;
                        </p>
                        {modelWarnings.length > 0 && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertTriangle className="size-3" /> {modelWarnings.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expected values */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex min-h-7 items-end justify-between gap-2">
                          <label htmlFor={`normalized-${row.id}`} className="text-sm font-bold text-foreground">
                            Inglês Normalizado Esperado
                          </label>
                          <span className="text-[11px] text-muted-foreground">Equivalente neutro</span>
                        </div>
                        <Textarea
                          id={`normalized-${row.id}`}
                          value={draft.expected_normalized}
                          onChange={(e) => updateDraft(row.id, { expected_normalized: e.target.value })}
                          className="min-h-20 rounded-xl border-primary/40 bg-card focus-visible:border-primary focus-visible:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex min-h-7 items-end justify-between gap-2">
                          <label className="text-sm font-bold text-foreground">
                            Português Natural (Tradução Humana)
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isSuggesting[row.id] || disabled}
                            onClick={() => handleSuggestTranslation(row)}
                            className="h-7 gap-1 px-2 text-xs font-semibold text-primary hover:bg-primary-soft hover:text-primary"
                          >
                            {isSuggesting[row.id] ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="size-3.5" />
                            )}
                            Sugerir Tradução
                          </Button>
                        </div>
                        <Textarea
                          value={draft.expected_translation}
                          onChange={(e) => updateDraft(row.id, { expected_translation: e.target.value })}
                          className="min-h-20 rounded-xl border-primary/40 bg-card focus-visible:border-primary focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>

                    {/* Failure reason + slang toggle */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">Motivo da Falha (Taxonomia de Erro)</span>
                          <span className="text-[11px] text-muted-foreground">
                            Selecione uma categoria ou digite uma personalizada
                          </span>
                        </div>

                        {/* Predefined Failure Type Pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {FAILURE_TYPES.map((ft) => (
                            <button
                              key={ft.value}
                              type="button"
                              title={ft.desc}
                              onClick={() => updateDraft(row.id, { failure_type: ft.value })}
                              className={cn(
                                "h-7 rounded-full px-3 text-xs font-semibold transition-colors",
                                draft.failure_type === ft.value
                                  ? "bg-primary text-primary-foreground shadow-card"
                                  : "bg-primary-soft/60 text-primary-soft-foreground hover:bg-primary-soft",
                              )}
                            >
                              {FAILURE_TYPE_LABELS[ft.value] ?? ft.label}
                            </button>
                          ))}
                        </div>

                        <Input
                          value={draft.failure_type}
                          onChange={(e) => updateDraft(row.id, { failure_type: e.target.value })}
                          placeholder="Ou digite um motivo personalizado…"
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-sm font-bold text-foreground md:text-right">
                          Confirmação: É Gíria?
                        </span>
                        <div role="group" aria-label="É gíria?" className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                          <button
                            type="button"
                            aria-pressed={draft.expected_is_slang}
                            onClick={() => updateDraft(row.id, { expected_is_slang: true })}
                            className={cn(
                              "h-8 rounded-lg px-4 text-xs font-semibold transition-colors",
                              draft.expected_is_slang
                                ? "bg-primary text-primary-foreground shadow-card"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Sim (Slang)
                          </button>
                          <button
                            type="button"
                            aria-pressed={!draft.expected_is_slang}
                            onClick={() => updateDraft(row.id, { expected_is_slang: false })}
                            className={cn(
                              "h-8 rounded-lg px-4 text-xs font-semibold transition-colors",
                              !draft.expected_is_slang
                                ? "bg-primary text-primary-foreground shadow-card"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Não (Neutro)
                          </button>
                        </div>
                      </div>
                    </div>

                    {isAiGenerated && !draftWasEdited(row, draft) && draft.failure_type !== "correct" && (
                      <p className="flex items-center gap-1 text-xs text-warning-soft-foreground">
                        <AlertTriangle className="size-3" /> Ainda igual ao rascunho do GPT — edite, ou marque o motivo como &ldquo;Correto&rdquo; para aprovar como está.
                      </p>
                    )}

                    {/* Card footer actions */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(row, "duplicate")}
                        disabled={disabled}
                        className="text-muted-foreground"
                      >
                        <Copy className="size-3.5" />
                        Duplicar Amostra
                      </Button>
                      <div className="ml-auto flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setActiveIdx(index < filteredRows.length - 1 ? index + 1 : index)}
                          disabled={disabled}
                        >
                          <SkipForward className="size-4" />
                          Pular Item
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => handleReject(row, "rejected")}
                          disabled={disabled}
                        >
                          <Trash2 className="size-4" />
                          Descartar
                        </Button>
                        <Button
                          className="rounded-xl px-5 font-semibold shadow-card"
                          onClick={() => handleApprove(row)}
                          disabled={disabled}
                        >
                          {busyId === row.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          Aprovar Correção &amp; Treinar
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}

            <div className="border-t border-border pt-2">
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(p) => updateParams({ page: p })}
                onPageSizeChange={(s) => updateParams({ page: 1, pageSize: s })}
                itemLabel="itens da fila"
              />
            </div>
          </div>
        )}
      </section>
    </PageContainer>
  )
}
