import { createClient } from './supabase/client'

// Criamos uma única instância (Singleton) para todo o projeto
// Isso garante que quando você loga em uma página, todas as outras 
// saibam que você está logado.
export const supabase = createClient()
