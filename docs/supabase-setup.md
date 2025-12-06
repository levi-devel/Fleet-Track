# Configuração do Supabase - Sistema de Controle de Frotas

Este guia mostra como configurar o Supabase para o sistema de controle de frotas.

## Sumário

1. [Criar Conta e Projeto](#1-criar-conta-e-projeto)
2. [Configurar Banco de Dados](#2-configurar-banco-de-dados)
3. [Obter Credenciais](#3-obter-credenciais)
4. [Configurar Variáveis de Ambiente](#4-configurar-variáveis-de-ambiente)
5. [Executar Migrações](#5-executar-migrações)
6. [Testar Conexão](#6-testar-conexão)
7. [Configurações Avançadas](#7-configurações-avançadas)

---

## 1. Criar Conta e Projeto

### 1.1 Criar Conta no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"** ou **"Sign Up"**
3. Faça login com sua conta GitHub, Google ou e-mail

### 1.2 Criar Novo Projeto

1. No dashboard, clique em **"New Project"**
2. Preencha os campos:
   - **Name**: `controle-frotas` (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte (guarde-a!)
   - **Region**: Escolha a região mais próxima (ex: `South America (São Paulo)`)
3. Clique em **"Create new project"**
4. Aguarde alguns minutos enquanto o projeto é criado

---

## 2. Configurar Banco de Dados

### 2.1 Acessar o SQL Editor

1. No menu lateral do projeto, clique em **"SQL Editor"**
2. Clique em **"New query"**

### 2.2 Executar Script de Criação das Tabelas

1. Copie o conteúdo do arquivo `migrations/0000_create_tables.sql`
2. Cole no SQL Editor
3. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
4. Aguarde a mensagem de sucesso

### 2.3 (Opcional) Inserir Dados de Exemplo

1. Crie uma nova query no SQL Editor
2. Copie o conteúdo do arquivo `migrations/0001_seed_data.sql`
3. Cole e execute

### 2.4 Verificar Tabelas Criadas

No menu lateral, acesse **"Table Editor"** e verifique se as tabelas foram criadas:

- ✅ `vehicles`
- ✅ `geofences`
- ✅ `alerts`
- ✅ `trips`
- ✅ `location_points`
- ✅ `route_events`
- ✅ `speed_violations`
- ✅ `users`

---

## 3. Obter Credenciais

### 3.1 Acessar Configurações da API

1. No menu lateral, clique em **"Project Settings"** (ícone de engrenagem)
2. Clique em **"API"** no submenu

### 3.2 Copiar Credenciais

Você precisará das seguintes informações:

| Campo | Descrição | Onde Encontrar |
|-------|-----------|----------------|
| **Project URL** | URL da API do Supabase | `API Settings > Project URL` |
| **anon public** | Chave pública (frontend) | `API Settings > Project API keys` |
| **service_role** | Chave privada (backend) | `API Settings > Project API keys` |

### 3.3 Obter Connection String do Banco

1. Acesse **"Project Settings"** > **"Database"**
2. Role até **"Connection string"**
3. Selecione **"URI"**
4. Copie a string (substitua `[YOUR-PASSWORD]` pela senha criada)

Exemplo:
```
postgresql://postgres:[PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

---

## 4. Configurar Variáveis de Ambiente

### 4.1 Criar Arquivo `.env`

Na raiz do projeto, crie um arquivo `.env` com o seguinte conteúdo:

```env
# Supabase Configuration
DATABASE_URL=postgresql://postgres:[SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Environment
NODE_ENV=development
```

### 4.2 Substituir Valores

Substitua os placeholders pelos valores obtidos no passo anterior:

- `[SENHA]` → Senha do banco de dados
- `[PROJECT-REF]` → ID do projeto (ex: `abcdefghijklmnop`)
- Chaves JWT completas

### 4.3 Importante: Segurança

⚠️ **NUNCA** commite o arquivo `.env` no Git!

Verifique se `.env` está no `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

---

## 5. Executar Migrações

### Opção A: Via SQL Editor (Recomendado para primeira vez)

1. Acesse o SQL Editor no Supabase
2. Execute `migrations/0000_create_tables.sql`
3. (Opcional) Execute `migrations/0001_seed_data.sql`

### Opção B: Via Drizzle Kit

```bash
# Gerar migrações baseadas no schema
npm run db:push
```

---

## 6. Testar Conexão

### 6.1 Iniciar o Servidor

```bash
npm run dev
```

### 6.2 Verificar Logs

Se a conexão estiver correta, você verá:

```
✅ Usando Supabase Storage (PostgreSQL)
```

Se as variáveis não estiverem configuradas:

```
⚠️ Usando MemStorage (desenvolvimento)
```

### 6.3 Testar Endpoints

Acesse no navegador ou via Postman:

```
GET http://localhost:5000/api/vehicles
GET http://localhost:5000/api/geofences
GET http://localhost:5000/api/alerts
```

---

## 7. Configurações Avançadas

### 7.1 Row Level Security (RLS)

Para habilitar segurança a nível de linha, execute no SQL Editor:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;

-- Política: permitir acesso autenticado
CREATE POLICY "Allow authenticated access" ON vehicles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Repita para outras tabelas...
```

### 7.2 Realtime (Atualizações em Tempo Real)

O Supabase suporta atualizações em tempo real via WebSocket. Para habilitar:

1. Acesse **Database** > **Replication**
2. Ative as tabelas que deseja monitorar

### 7.3 Backup Automático

O Supabase faz backups automáticos diários. Para backups manuais:

1. Acesse **Project Settings** > **Database**
2. Clique em **"Download backup"**

### 7.4 Monitoramento

Para monitorar o uso do banco:

1. Acesse **Reports** no menu lateral
2. Visualize métricas de:
   - Número de requisições
   - Uso de banda
   - Conexões ativas

---

## Estrutura das Tabelas

### vehicles
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| name | TEXT | Nome do veículo |
| license_plate | TEXT | Placa do veículo |
| model | TEXT | Modelo do veículo |
| status | ENUM | moving, stopped, idle, offline |
| ignition | ENUM | on, off |
| current_speed | INTEGER | Velocidade atual (km/h) |
| speed_limit | INTEGER | Limite de velocidade (km/h) |
| heading | INTEGER | Direção (0-360°) |
| latitude | REAL | Latitude atual |
| longitude | REAL | Longitude atual |
| accuracy | REAL | Precisão GPS (metros) |
| last_update | TIMESTAMPTZ | Última atualização |
| battery_level | INTEGER | Nível de bateria (%) |

### geofences
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| name | TEXT | Nome da geofence |
| description | TEXT | Descrição |
| type | ENUM | circle, polygon |
| active | BOOLEAN | Se está ativa |
| center_latitude | REAL | Latitude do centro (círculo) |
| center_longitude | REAL | Longitude do centro (círculo) |
| radius | REAL | Raio em metros (círculo) |
| points | JSONB | Pontos do polígono |
| rules | JSONB | Regras de alerta |
| vehicle_ids | TEXT[] | IDs dos veículos vinculados |
| color | TEXT | Cor hexadecimal |

### alerts
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| type | ENUM | speed, geofence_entry, geofence_exit, geofence_dwell, system |
| priority | ENUM | critical, warning, info |
| vehicle_id | TEXT | ID do veículo |
| vehicle_name | TEXT | Nome do veículo |
| message | TEXT | Mensagem do alerta |
| timestamp | TIMESTAMPTZ | Data/hora do alerta |
| read | BOOLEAN | Se foi lido |
| latitude | REAL | Latitude |
| longitude | REAL | Longitude |
| speed | INTEGER | Velocidade no momento |
| speed_limit | INTEGER | Limite violado |
| geofence_name | TEXT | Nome da geofence (se aplicável) |

### trips
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| vehicle_id | TEXT | ID do veículo |
| start_time | TIMESTAMPTZ | Início da viagem |
| end_time | TIMESTAMPTZ | Fim da viagem |
| total_distance | REAL | Distância total (metros) |
| travel_time | INTEGER | Tempo em movimento (minutos) |
| stopped_time | INTEGER | Tempo parado (minutos) |
| average_speed | REAL | Velocidade média (km/h) |
| max_speed | REAL | Velocidade máxima (km/h) |
| stops_count | INTEGER | Número de paradas |

### speed_violations
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| vehicle_id | TEXT | ID do veículo |
| vehicle_name | TEXT | Nome do veículo |
| speed | INTEGER | Velocidade registrada |
| speed_limit | INTEGER | Limite de velocidade |
| excess_speed | INTEGER | Excesso de velocidade |
| timestamp | TIMESTAMPTZ | Data/hora da violação |
| latitude | REAL | Latitude |
| longitude | REAL | Longitude |
| duration | INTEGER | Duração em segundos |

---

## Suporte

Para dúvidas ou problemas:

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Discord Supabase](https://discord.supabase.com/)

