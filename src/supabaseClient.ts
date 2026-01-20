import { createClient } from '@supabase/supabase-js';

// URL e Chave do seu projeto Supabase
// NOTA: Em produção, é ideal usar variáveis de ambiente (import.meta.env.VITE_SUPABASE_URL)
export const supabaseUrl = "https://gbnfoigyzcoccfdbgzmk.supabase.co";
export const supabaseKey = "sb_publishable_ZfZzn4PP-ajJ6S5c9JVrAg_4Tvvc8i4";

// Cria e exporta a instância do cliente para ser usada em todo o app
export const supabase = createClient(supabaseUrl, supabaseKey);