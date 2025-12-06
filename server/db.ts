import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import * as schema from "@shared/schema";

// Cliente Supabase para operações específicas (auth, realtime, storage)
export function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Conexão Drizzle para operações de banco de dados
export function createDrizzleClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL é obrigatória");
  }

  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

// Tipos exportados
export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;

// Singleton instances
let drizzleInstance: DrizzleClient | null = null;
let supabaseInstance: SupabaseClient | null = null;

export function getDb(): DrizzleClient {
  if (!drizzleInstance) {
    drizzleInstance = createDrizzleClient();
  }
  return drizzleInstance;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// Verifica se as configurações do banco estão disponíveis
export function isDatabaseConfigured(): boolean {
  return !!(
    process.env.DATABASE_URL &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY
  );
}

