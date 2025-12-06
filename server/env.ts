import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL deve ser uma URL válida"),
  SUPABASE_URL: z.string().url("SUPABASE_URL deve ser uma URL válida"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY é obrigatório"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Variáveis de ambiente inválidas:");
    console.error(parsed.error.flatten().fieldErrors);
    
    // Em desenvolvimento, permite continuar sem as variáveis (usa MemStorage)
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️ Usando armazenamento em memória (desenvolvimento)");
      return null;
    }
    
    throw new Error("Variáveis de ambiente inválidas");
  }

  return parsed.data;
}

export const env = validateEnv();

export function isSupabaseConfigured(): boolean {
  return env !== null && !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;
}

