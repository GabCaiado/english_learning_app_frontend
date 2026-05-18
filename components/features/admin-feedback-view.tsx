"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Loader2, ShieldCheck, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  approveTranslationFeedback,
  getPendingTranslationFeedback,
  rejectTranslationFeedback,
} from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type FeedbackRow = {
  id: string
  input_text: string
  model_normalized?: string | null
  model_translation?: string | null
  model_is_slang?: boolean | null
  model_metadata?: Record<string, unknown>
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

function makeDraft(row: FeedbackRow): Draft {
  return {
    expected_normalized: row.model_normalized || row.input_text,
    expected_translation: row.model_translation || "",
    expected_is_slang: row.model_is_slang ?? true,
    failure_type: row.model_is_slang ? "wrong_slang_sense" : "missed_slang",
  }
}

export function AdminFeedbackView() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRows = async () => {
    setLoading(true)
    try {
      const data = await getPendingTranslationFeedback()
      setRows(data)
      setDrafts(Object.fromEntries(data.map((row: FeedbackRow) => [row.id, makeDraft(row)])))
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar feedbacks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
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
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar")
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
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">ADMIN</p>
            <h2 className="text-3xl font-bold text-foreground">Feedback Review</h2>
          </div>
        </div>
        <p className="text-muted-foreground">
          Review user-reported failures before they become eval or training data.
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline" className="px-3 py-1">
          {rows.length} pending
        </Badge>
        <Button variant="outline" onClick={loadRows} disabled={loading}>
          Reload
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading feedback...</p>
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pending feedback.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const draft = drafts[row.id] || makeDraft(row)
            const disabled = busyId === row.id

            return (
              <Card key={row.id} className="border-border/70">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{row.input_text}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{row.source}</Badge>
                        <Badge variant="outline">{row.user_feedback}</Badge>
                        <Badge variant={row.model_is_slang ? "default" : "outline"}>
                          model slang: {String(row.model_is_slang)}
                        </Badge>
                      </div>
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
                        onChange={(event) => updateDraft(row.id, { expected_normalized: event.target.value })}
                        className="min-h-20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Expected Portuguese</label>
                      <Textarea
                        value={draft.expected_translation}
                        onChange={(event) => updateDraft(row.id, { expected_translation: event.target.value })}
                        className="min-h-20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Failure type</label>
                      <Input
                        value={draft.failure_type}
                        onChange={(event) => updateDraft(row.id, { failure_type: event.target.value })}
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
  )
}
