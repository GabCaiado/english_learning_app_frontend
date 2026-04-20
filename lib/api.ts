import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Busca o token da sessão ativa do Supabase
 */
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[API] Get Session:', session ? '✅ Token found' : '❌ No session found');

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

export async function deleteWord(wordId: string) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/words/${wordId}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Erro ao excluir palavra');
  return response.json();
}
