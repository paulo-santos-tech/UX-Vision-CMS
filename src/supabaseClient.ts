import { createClient } from '@supabase/supabase-js';

const supabaseUrlEnv = import.meta.env.VITE_SUPABASE_URL;
const supabaseKeyEnv = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (typeof supabaseUrlEnv !== 'string' || typeof supabaseKeyEnv !== 'string') {
  throw new Error('Supabase env vars ausentes: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}

export const supabaseUrl = supabaseUrlEnv;
export const supabaseKey = supabaseKeyEnv;

// Cria e exporta a instância do cliente para ser usada em todo o app
export const supabase = createClient(supabaseUrl, supabaseKey);
