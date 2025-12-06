# Configuração do Supabase - VehicleTracker

Este guia explica como configurar o Supabase para usar como backend do VehicleTracker.

## 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Preencha as informações:
   - **Name**: VehicleTracker (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte (guarde-a!)
   - **Region**: Escolha a região mais próxima
4. Clique em **Create new project** e aguarde a criação

## 2. Criar as Tabelas

Acesse o **SQL Editor** no painel do Supabase e execute os scripts abaixo na ordem:

### 2.1. Tabela de Perfis de Usuários

```sql
-- Tabela de perfis (complemento ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 2.2. Tabela de Veículos

```sql
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  model TEXT,
  status TEXT NOT NULL CHECK (status IN ('moving', 'stopped', 'idle', 'offline')),
  ignition TEXT NOT NULL CHECK (ignition IN ('on', 'off')),
  current_speed NUMERIC NOT NULL DEFAULT 0,
  speed_limit NUMERIC NOT NULL DEFAULT 80,
  heading NUMERIC NOT NULL DEFAULT 0,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC NOT NULL DEFAULT 5,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  battery_level NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_update ON vehicles(last_update);
```

### 2.3. Tabela de Geofences

```sql
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('circle', 'polygon')),
  active BOOLEAN NOT NULL DEFAULT true,
  center JSONB, -- {latitude: number, longitude: number}
  radius NUMERIC,
  points JSONB, -- [{latitude: number, longitude: number}, ...]
  rules JSONB NOT NULL DEFAULT '[]',
  vehicle_ids TEXT[] DEFAULT '{}',
  last_triggered TIMESTAMPTZ,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(active);
```

### 2.4. Tabela de Alertas

```sql
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('speed', 'geofence_entry', 'geofence_exit', 'geofence_dwell', 'system')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'warning', 'info')),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC,
  longitude NUMERIC,
  speed NUMERIC,
  speed_limit NUMERIC,
  geofence_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
```

### 2.5. Tabela de Viagens

```sql
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_distance NUMERIC NOT NULL,
  travel_time NUMERIC NOT NULL,
  stopped_time NUMERIC NOT NULL,
  average_speed NUMERIC NOT NULL,
  max_speed NUMERIC NOT NULL,
  stops_count INTEGER NOT NULL DEFAULT 0,
  points JSONB NOT NULL DEFAULT '[]',
  events JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time);
```

### 2.6. Tabela de Violações de Velocidade

```sql
CREATE TABLE IF NOT EXISTS speed_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_name TEXT NOT NULL,
  speed NUMERIC NOT NULL,
  speed_limit NUMERIC NOT NULL,
  excess_speed NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  duration NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speed_violations_vehicle_id ON speed_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_speed_violations_timestamp ON speed_violations(timestamp DESC);
```

## 3. Configurar Row Level Security (RLS)

O RLS garante que os dados estejam seguros. Execute os comandos abaixo:

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles (usuário só vê/edita seu próprio perfil)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para vehicles (todos usuários autenticados podem ver/editar)
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete vehicles"
  ON vehicles FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para geofences
CREATE POLICY "Authenticated users can view geofences"
  ON geofences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage geofences"
  ON geofences FOR ALL
  TO authenticated
  USING (true);

-- Políticas para alerts
CREATE POLICY "Authenticated users can view alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage alerts"
  ON alerts FOR ALL
  TO authenticated
  USING (true);

-- Políticas para trips
CREATE POLICY "Authenticated users can view trips"
  ON trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage trips"
  ON trips FOR ALL
  TO authenticated
  USING (true);

-- Políticas para speed_violations
CREATE POLICY "Authenticated users can view violations"
  ON speed_violations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage violations"
  ON speed_violations FOR ALL
  TO authenticated
  USING (true);
```

## 4. Configurar Realtime

Para receber atualizações em tempo real dos veículos:

1. No painel do Supabase, vá em **Database** → **Replication**
2. Na seção "Tables", habilite o Realtime para:
   - `vehicles`
   - `alerts`
3. Clique em **Save**

Ou execute via SQL:

```sql
-- Habilitar publicação realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
```

## 5. Obter as Chaves de API

1. No painel do Supabase, vá em **Project Settings** → **API**
2. Copie as seguintes informações:
   - **Project URL**: URL do projeto (ex: `https://xxxxx.supabase.co`)
   - **anon public**: Chave pública (para o frontend)
   - **service_role**: Chave de serviço (⚠️ APENAS para o backend, nunca exponha!)

## 6. Configurar Variáveis de Ambiente

### Backend (arquivo `.env` na raiz do projeto)

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# Server Configuration
NODE_ENV=development
PORT=5000
```

### Frontend (arquivo `.env` ou variáveis com prefixo VITE_)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

> ⚠️ **IMPORTANTE**: Nunca coloque a `service_role` key no frontend!

## 7. Inserir Dados de Teste (Opcional)

Para testar, você pode inserir alguns veículos de exemplo:

```sql
INSERT INTO vehicles (name, license_plate, model, status, ignition, current_speed, speed_limit, heading, latitude, longitude, accuracy, battery_level)
VALUES 
  ('Caminhão 01', 'ABC-1234', 'Mercedes Actros', 'moving', 'on', 72, 80, 45, -23.5489, -46.6388, 5, 85),
  ('Van 02', 'DEF-5678', 'Fiat Ducato', 'moving', 'on', 55, 60, 180, -23.5605, -46.6533, 3, 92),
  ('Caminhão 03', 'GHI-9012', 'Volvo FH', 'stopped', 'off', 0, 80, 0, -23.5305, -46.6233, 4, 78);
```

## 8. Verificar a Configuração

Após configurar, reinicie o servidor:

```bash
npm run dev
```

Você deve ver no console:
```
🚀 Using Supabase storage
Auth routes registered (Supabase configured)
Using Supabase Realtime (WebSocket disabled)
```

## Troubleshooting

### Erro: "Missing Supabase environment variables"
Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas no `.env`.

### Erro: "Invalid API key"
Verifique se copiou as chaves corretamente do painel do Supabase.

### Realtime não funciona
1. Verifique se habilitou o Realtime para as tabelas no painel
2. Verifique se as políticas RLS permitem leitura
3. Verifique os logs do Supabase em **Logs** → **Edge Functions**

### Autenticação falha
1. Verifique se o usuário foi criado no Supabase Auth
2. Verifique as políticas RLS da tabela `profiles`
3. Verifique se o trigger de criação de perfil está funcionando

## Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
