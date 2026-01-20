import { createClient } from "@supabase/supabase-js";

// URL e Chave do projeto UX Vision no Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria e exporta a instância do cliente para ser usada em todo o app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
