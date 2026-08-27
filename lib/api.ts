/**
 * lib/api.ts
 * API wrappers for all domain endpoints.
 * Uses authFetch (credentials: include, CSRF token injected automatically).
 * On 401 responses the wrapper automatically attempts one token refresh before failing.
 */

import { authFetch, refreshTokens } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auto-refresh interceptor

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let res = await authFetch(path, options);

  // If the access token expired, try refreshing once and retry
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await authFetch(path, options);
    }
  }

  return res;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

// Translate

export async function analyzeWord(word: string) {
  const res = await apiFetch(`/translate/word/${encodeURIComponent(word)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(err.detail || 'Erro ao analisar palavra');
  }
  return res.json();
}

export async function translateSentence(sentence: string) {
  const res = await apiFetch('/translate/sentence', {
    method: 'POST',
    body: JSON.stringify({ sentence }),
  });
  if (!res.ok) throw new Error('Erro ao traduzir frase');
  return res.json();
}

// Words / Vocabulary

export async function addWord(word: string, contextSentence?: string) {
  const res = await apiFetch('/words/', {
    method: 'POST',
    body: JSON.stringify({ word, source: 'manual', context_sentence: contextSentence }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao salvar' }));
    throw new Error(err.detail || 'Erro ao salvar palavra');
  }
  return res.json();
}

export type WordListResult = {
  items: any[];
  total: number;
};

export async function getUserWords(limit = 50, offset = 0, signal?: AbortSignal): Promise<WordListResult> {
  const res = await apiFetch(`/words/?limit=${limit}&offset=${offset}`, { signal });
  if (!res.ok) throw new Error('Erro ao buscar palavras');
  return res.json();
}

export async function getWordsForReview() {
  const res = await apiFetch('/words/review');
  if (!res.ok) throw new Error('Erro ao buscar revisões');
  return res.json();
}

export async function reviewWord(wordId: string, quality: number) {
  const res = await apiFetch(`/words/${wordId}/review`, {
    method: 'POST',
    body: JSON.stringify({ quality }),
  });
  if (!res.ok) throw new Error('Erro ao salvar revisão');
  return res.json();
}

export async function deleteWord(wordId: string) {
  const res = await apiFetch(`/words/${wordId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao excluir palavra');
  return res.json();
}

export type WordOfTheDay = {
  word: string;
  translation_pt: string;
  meaning_pt: string | null;
  example: string | null;
  example_pt: string | null;
};

export async function getWordOfTheDay(): Promise<WordOfTheDay> {
  const res = await apiFetch('/words/word-of-the-day');
  if (!res.ok) throw new Error('Erro ao buscar palavra do dia');
  return res.json();
}

export type DailyWordCount = {
  date: string;
  count: number;
};

export async function getWeeklyProgress(): Promise<DailyWordCount[]> {
  const res = await apiFetch('/words/progress/weekly');
  if (!res.ok) throw new Error('Erro ao buscar progresso semanal');
  return res.json();
}

// User Profile

export async function getUserProfile() {
  const res = await apiFetch('/users/me');
  if (!res.ok) throw new Error('Erro ao buscar perfil');
  return res.json();
}

export async function updateUserProfile(data: Record<string, unknown>) {
  const res = await apiFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao atualizar perfil' }));
    throw new Error(err.detail || 'Erro ao atualizar perfil');
  }
  return res.json();
}

// Translation Feedback

export type TranslationFeedbackPayload = {
  input_text: string;
  model_normalized?: string | null;
  model_translation?: string | null;
  model_is_slang?: boolean | null;
  model_metadata?: Record<string, unknown>;
  user_feedback?: string;
  source?: string;
  user_word_id?: string | null;
};

export async function submitTranslationFeedback(payload: TranslationFeedbackPayload) {
  const res = await apiFetch('/translation-feedback/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao enviar feedback' }));
    throw new Error(err.detail || 'Erro ao enviar feedback');
  }
  return res.json();
}

export type TranslationFeedbackReviewPayload = {
  expected_normalized: string;
  expected_translation?: string | null;
  expected_is_slang?: boolean | null;
  failure_type?: string;
};

export type TranslationFeedbackListResult = {
  items: any[];
  total: number;
};

export async function getPendingTranslationFeedback(
  limit = 50,
  offset = 0,
  signal?: AbortSignal,
  sources?: string[],
): Promise<TranslationFeedbackListResult> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (sources && sources.length > 0) params.set('sources', sources.join(','));
  const res = await apiFetch(`/translation-feedback/pending?${params.toString()}`, { signal });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao buscar feedbacks' }));
    throw new Error(err.detail || 'Erro ao buscar feedbacks');
  }
  return res.json();
}

export async function approveTranslationFeedback(id: string, payload: TranslationFeedbackReviewPayload) {
  const res = await apiFetch(`/translation-feedback/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao aprovar feedback' }));
    throw new Error(err.detail || 'Erro ao aprovar feedback');
  }
  return res.json();
}

export async function rejectTranslationFeedback(id: string, status: 'rejected' | 'duplicate' = 'rejected') {
  const res = await apiFetch(`/translation-feedback/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao rejeitar feedback' }));
    throw new Error(err.detail || 'Erro ao rejeitar feedback');
  }
  return res.json();
}

// Admin — Dataset Generation

export type GenerateBatchParams = {
  count: number;
  categories: string[];
  context_style: string;
  slang_mix: number;
  target_word?: string;
  avoid_overrepresented?: boolean;
};

export type GenerateBatchResult = {
  generated: number;
  auto_approved: number;
  queued_for_review: number;
  avoided_words: string[];
  message: string;
};

export type MilestoneInfo = {
  count: number;
  label: string;
  emoji: string;
  reached: boolean;
};

export type DatasetStats = {
  total_approved: number;
  slang_count: number;
  neutral_count: number;
  pending_review: number;
  by_source: Record<string, number>;
  milestones: MilestoneInfo[];
  next_milestone: MilestoneInfo | null;
  balance_ok: boolean;
  distilbert_ready: boolean;
  byt5_ready: boolean;
};

export async function generateDatasetBatch(params: GenerateBatchParams): Promise<GenerateBatchResult> {
  const res = await apiFetch('/admin/dataset/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao gerar batch' }));
    throw new Error(err.detail || 'Erro ao gerar batch');
  }
  return res.json();
}

export async function getDatasetStats(): Promise<DatasetStats> {
  const res = await apiFetch('/admin/dataset/stats');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao buscar stats' }));
    throw new Error(err.detail || 'Erro ao buscar stats');
  }
  return res.json();
}

export type VocabularyInfo = {
  unique_words: number;
  words: string[];
  word_counts: Record<string, number>;
  overrepresented_words: string[];
};

export type AmplifyVocabularyParams = {
  words?: string[] | null;
};

export type AmplifyVocabularyResult = {
  words_processed: number;
  words_skipped: number;
  generated: number;
  auto_approved: number;
  queued_for_review: number;
  message: string;
};

export async function getVocabulary(): Promise<VocabularyInfo> {
  const res = await apiFetch('/admin/dataset/vocabulary');
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao buscar vocabulario' }));
    throw new Error(err.detail || 'Erro ao buscar vocabulario');
  }
  return res.json();
}

export async function amplifyVocabulary(params: AmplifyVocabularyParams): Promise<AmplifyVocabularyResult> {
  const res = await apiFetch('/admin/dataset/amplify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro ao amplificar vocabulario' }));
    throw new Error(err.detail || 'Erro ao amplificar vocabulario');
  }
  return res.json();
}
