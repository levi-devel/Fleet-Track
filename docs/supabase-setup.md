# Configuração do Supabase – Sistema de Controle de Frotas

Este guia reúne os passos necessários para provisionar o projeto Supabase que serve de backend para o sistema de rastreamento veicular.

## Sumário
1. [Criar projeto no Supabase](#1-criar-projeto-no-supabase)
2. [Preparar o banco de dados](#2-preparar-o-banco-de-dados)
3. [Rodar migrações e popular com dados](#3-rodar-migra%C3%A7%C3%B5es-e-popular-com-dados)
4. [Configurar variáveis de ambiente](#4-configurar-vari%C3%A1veis-de-ambiente)
5. [Validar a conexão e testar endpoints](#5-validar-a-conex%C3%A3o-e-testar-endpoints)
6. [Segurança: RLS e Realtime](#6-seguran%C3%A7a-rls-e-realtime)
7. [Aprimoramentos e monitoramento](#7-aprimoramentos-e-monitoramento)

---

## 1. Criar projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login.
2. Clique em **“New Project”** e preencha:
   - **Name**: `controle-frotas` (ou nome interno da sua empresa).
   - **Database Password**: crie uma senha forte e armazene em um cofre de segredos.
   - **Region**: prefira a região mais próxima dos usuários (por exemplo, `South America (São Paulo)`).
3. Clique em **“Create new project”** e aguarde até o dashboard ficar disponível.

> Durante a criação o Supabase provisiona o banco PostgreSQL e cria o esquema `public`.

## 2. Preparar o banco de dados

1. No painel do Supabase, abra o **SQL Editor** > **New query**.
2. Execute os scripts _neste repositório_ na ordem:
   - `migrations/0000_create_tables.sql` cria as tabelas principais (`vehicles`, `geofences`, `alerts`, `trips`, `location_points`, `route_events`, `speed_violations` e outras dependências como `profiles` e tipos).
   - (Opcional) `migrations/0001_seed_data.sql` insere veículos e dados de exemplo.
   - (Opcional) `migrations/0002_vehicle_location_history.sql` cria a tabela de histórico de localizações, útil para auditoria.
3. Verifique no **Table Editor** se as tabelas foram criadas com sucesso.

> Use **“Run”** ou `Ctrl+Enter` para cada script. O Supabase indicará sucesso ou erro na parte inferior da tela.

## 3. Rodar migrações e popular com dados

- Para automatizar, instale dependências (`npm install`) e rode:
  ```bash
  npm run db:push
  ```
  Isso aplica os arquivos de migração definidos em `migrations/`.
- Se precisar de dados reais, utilize o seed (`0001_seed_data.sql`) manualmente no Console SQL ou envie novos inserts.
- Revise os dados com `SELECT * FROM vehicles` e demais tabelas para garantir que tudo foi criado.

## 4. Configurar variáveis de ambiente

Na raiz do projeto, crie ou atualize o arquivo `.env` (não comite!):

```env
# Supabase
DATABASE_URL=postgresql://postgres:[SENHA]@db.[PROJECT_REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...   # somente no backend!

# Servidor
NODE_ENV=development
PORT=5000

# Tracking API (opcional)
TRACKING_API_KEY=uma-chave-secreta-de-32-caracteres
```

Substitua todos os placeholders (`[SENHA]`, `[PROJECT_REF]`, etc.) pelos valores reais exibidos em **Project Settings > API**.

## 5. Validar a conexão e testar endpoints

1. Execute `npm run dev`.
2. No console você deve ver mensagens como:
   ```
   🚀 Using Supabase storage
   Auth routes registered (Supabase configured)
   Tracking routes disabled (TRACKING_API_KEY not set)
   ```
3. Teste os seguintes endpoints locais com Postman ou Curl:
   ```
   GET http://localhost:5000/api/vehicles
   GET http://localhost:5000/api/geofences
   POST http://localhost:5000/api/tracking   # requer X-API-Key
   ```

## 6. Segurança: RLS e Realtime

1. Habilite **Row Level Security** para as tabelas principais:
   ```sql
   ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
   ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
   ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
   ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;
   ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```
2. Crie as políticas necessárias conforme os exemplos fornecidos em `migrations/0000_create_tables.sql`.
3. Para habilitar **Realtime** no Supabase (monitoramento ao vivo):
   - No painel do projeto, vá em **Database > Replication**.
   - Escolha as tabelas `vehicles`, `alerts`, `trips` e habilite o Realtime.
   - (Opcional) execute:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
     ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
     ```

## 7. Aprimoramentos e monitoramento

- **Logs**: monitorar em **Project Settings > Logs**.
- **Backups**: é possível baixar um backup manual em **Database > Backups**.
- **Monitoramento**: use o dashboard do Supabase em **Reports** para visualizar uso de requisições, conexões e banda.
- **Rotina**: quando alterar o schema, gere novas migrações com `npm run db:push`.

## Recursos

- [Documentação do Supabase](https://supabase.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
