import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import type { Database } from '../../../shared/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica se o Supabase está configurado
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables not configured. Authentication will be disabled.');
}

export const supabase = isSupabaseConfigured 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null as unknown as SupabaseClientType<Database>;

export type SupabaseClient = typeof supabase;
