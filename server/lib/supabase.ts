import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

// Cliente com service role key para operações do servidor (bypass RLS)
// Usando cliente sem tipagem estrita para evitar erros de compilação
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente com anon key para operações que respeitam RLS
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || supabaseServiceKey
);

export type SupabaseClient = SupabaseClientType;
