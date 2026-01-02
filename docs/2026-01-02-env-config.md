# 2026-01-02 — Configuração de variáveis de ambiente (.env)

## Contexto
Após identificar que o deploy na Vercel não exibia dados do Supabase devido à falta das variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, foi necessário criar os arquivos de configuração de ambiente no projeto local.

## Alterações realizadas

### 1. Arquivo `.env` criado
Criado arquivo `.env` na raiz do projeto com todas as variáveis necessárias:

**Variáveis do Backend:**
- `DATABASE_URL` - URL de conexão do PostgreSQL
- `SUPABASE_URL` - URL base do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave pública do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (apenas backend)

**Variáveis do Frontend (Vite):**
- `VITE_SUPABASE_URL` - Mesma URL do `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` - Mesma chave do `SUPABASE_ANON_KEY`

**Variáveis do Servidor:**
- `NODE_ENV` - Ambiente de execução (development/production)
- `PORT` - Porta do servidor (padrão 5000)

**Variáveis opcionais:**
- `TRACKING_API_KEY` - Chave para API de rastreamento

### 2. Arquivo `.env.example` criado
Criado arquivo `.env.example` como template de referência para novos desenvolvedores ou ambientes.

## Importante
⚠️ **Atenção:** Os valores no `.env` estão como placeholders. Você deve substituir:
- `[PROJECT_REF]` pelo ID do seu projeto Supabase
- `[SENHA]` pela senha do banco de dados
- `eyJhbGciOiJI...` pelas chaves reais obtidas em **Project Settings > API** no painel do Supabase

## Próximos passos
1. Edite o arquivo `.env` e preencha com os valores reais do seu projeto Supabase
2. As variáveis `VITE_*` são lidas apenas durante o build do Vite
3. Para deploy na Vercel, configure as mesmas variáveis `VITE_*` no painel **Project Settings > Environment Variables**
4. Após alterar variáveis de ambiente, é necessário rebuildar e redeploy o projeto

## Referências
- `docs/supabase-setup.md` - Guia completo de configuração do Supabase
- `docs/2026-01-02-vercel-env.md` - Documentação sobre variáveis de ambiente no Vercel

