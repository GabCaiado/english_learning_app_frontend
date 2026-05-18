import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Busca o token da sessão ativa do Supabase
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export async function analyzeWord(word: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/translate/word/${encodeURIComponent(word)}`, {
    headers
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || 'Erro ao analisar palavra');
  }
  return response.json();
}

export async function translateSentence(sentence: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/translate/sentence`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sentence }),
  });
  if (!response.ok) throw new Error('Erro ao traduzir frase');
  return response.json();
}

export async function addWord(word: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/words/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ word, source: "manual" }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao salvar' }));
    throw new Error(error.detail || 'Erro ao salvar palavra');
  }
  return response.json();
}

export async function getUserWords() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/words/`, {
    headers
  });
  if (!response.ok) throw new Error('Erro ao buscar palavras');
  return response.json();
}

export async function getWordsForReview() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/words/review`, {
    headers
  });
  if (!response.ok) throw new Error('Erro ao buscar revisões');
  return response.json();
}

export async function reviewWord(wordId: string, quality: number) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/words/${wordId}/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ quality }),
  });
  if (!response.ok) throw new Error('Erro ao salvar revisão');
  return response.json();
}

export async function deleteWord(wordId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/words/${wordId}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Erro ao excluir palavra');
  return response.json();
}

export async function getUserProfile() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/users/me`, {
    headers,
  });
  if (!response.ok) throw new Error('Erro ao buscar perfil');
  return response.json();
}

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
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/translation-feedback/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao enviar feedback' }));
    throw new Error(error.detail || 'Erro ao enviar feedback');
  }

  return response.json();
}

export type TranslationFeedbackReviewPayload = {
  expected_normalized: string;
  expected_translation?: string | null;
  expected_is_slang?: boolean | null;
  failure_type?: string;
};

export async function getPendingTranslationFeedback(limit = 50) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/translation-feedback/pending?limit=${limit}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao buscar feedbacks' }));
    throw new Error(error.detail || 'Erro ao buscar feedbacks');
  }

  return response.json();
}

export async function approveTranslationFeedback(id: string, payload: TranslationFeedbackReviewPayload) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/translation-feedback/${id}/approve`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao aprovar feedback' }));
    throw new Error(error.detail || 'Erro ao aprovar feedback');
  }

  return response.json();
}

export async function rejectTranslationFeedback(id: string, status: 'rejected' | 'duplicate' = 'rejected') {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/translation-feedback/${id}/reject`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro ao rejeitar feedback' }));
    throw new Error(error.detail || 'Erro ao rejeitar feedback');
  }

  return response.json();
}
