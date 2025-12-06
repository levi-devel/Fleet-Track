-- ============================================
-- CONTROLE DE FROTAS - MIGRAÇÃO INICIAL
-- Supabase PostgreSQL Database Schema
-- ============================================

-- Habilitar extensão UUID (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Status do veículo
CREATE TYPE vehicle_status AS ENUM ('moving', 'stopped', 'idle', 'offline');

-- Status da ignição
CREATE TYPE ignition_status AS ENUM ('on', 'off');

-- Tipo de alerta
CREATE TYPE alert_type AS ENUM ('speed', 'geofence_entry', 'geofence_exit', 'geofence_dwell', 'system');

-- Prioridade do alerta
CREATE TYPE alert_priority AS ENUM ('critical', 'warning', 'info');

-- Tipo de geofence
CREATE TYPE geofence_type AS ENUM ('circle', 'polygon');

-- Tipo de evento de rota
CREATE TYPE route_event_type AS ENUM ('departure', 'arrival', 'stop', 'speed_violation', 'geofence_entry', 'geofence_exit');

-- ============================================
-- TABELA: vehicles
-- ============================================

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    license_plate TEXT NOT NULL,
    model TEXT,
    status vehicle_status NOT NULL DEFAULT 'offline',
    ignition ignition_status NOT NULL DEFAULT 'off',
    current_speed INTEGER NOT NULL DEFAULT 0,
    speed_limit INTEGER NOT NULL DEFAULT 80,
    heading INTEGER NOT NULL DEFAULT 0,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL NOT NULL DEFAULT 5,
    last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    battery_level INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_last_update ON vehicles(last_update);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

-- ============================================
-- TABELA: geofences
-- ============================================

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type geofence_type NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    center_latitude REAL,
    center_longitude REAL,
    radius REAL,
    points JSONB, -- Array de pontos para polígonos
    rules JSONB NOT NULL DEFAULT '[]', -- Array de regras de geofence
    vehicle_ids TEXT[] NOT NULL DEFAULT '{}', -- Array de IDs de veículos
    last_triggered TIMESTAMPTZ,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para geofences
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(active);
CREATE INDEX IF NOT EXISTS idx_geofences_type ON geofences(type);

-- ============================================
-- TABELA: alerts
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type alert_type NOT NULL,
    priority alert_priority NOT NULL,
    vehicle_id TEXT NOT NULL,
    vehicle_name TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    latitude REAL,
    longitude REAL,
    speed INTEGER,
    speed_limit INTEGER,
    geofence_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para alerts
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);

-- ============================================
-- TABELA: trips
-- ============================================

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    total_distance REAL NOT NULL DEFAULT 0,
    travel_time INTEGER NOT NULL DEFAULT 0, -- em minutos
    stopped_time INTEGER NOT NULL DEFAULT 0, -- em minutos
    average_speed REAL NOT NULL DEFAULT 0,
    max_speed REAL NOT NULL DEFAULT 0,
    stops_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para trips
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_time ON trips(start_time);
CREATE INDEX IF NOT EXISTS idx_trips_end_time ON trips(end_time);

-- ============================================
-- TABELA: location_points
-- ============================================

CREATE TABLE IF NOT EXISTS location_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed INTEGER NOT NULL DEFAULT 0,
    heading INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL,
    accuracy REAL
);

-- Índices para location_points
CREATE INDEX IF NOT EXISTS idx_location_points_trip_id ON location_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_points_timestamp ON location_points(timestamp);

-- ============================================
-- TABELA: route_events
-- ============================================

CREATE TABLE IF NOT EXISTS route_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    type route_event_type NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    duration INTEGER, -- em segundos
    speed INTEGER,
    speed_limit INTEGER,
    geofence_name TEXT,
    address TEXT
);

-- Índices para route_events
CREATE INDEX IF NOT EXISTS idx_route_events_trip_id ON route_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_route_events_type ON route_events(type);
CREATE INDEX IF NOT EXISTS idx_route_events_timestamp ON route_events(timestamp);

-- ============================================
-- TABELA: speed_violations
-- ============================================

CREATE TABLE IF NOT EXISTS speed_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id TEXT NOT NULL,
    vehicle_name TEXT NOT NULL,
    speed INTEGER NOT NULL,
    speed_limit INTEGER NOT NULL,
    excess_speed INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0, -- em segundos
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para speed_violations
CREATE INDEX IF NOT EXISTS idx_speed_violations_vehicle_id ON speed_violations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_speed_violations_timestamp ON speed_violations(timestamp DESC);

-- ============================================
-- TABELA: users
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- TRIGGERS: updated_at automático
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para vehicles
CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para geofences
CREATE TRIGGER update_geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Descomente para habilitar políticas de segurança
-- ============================================

-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE route_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE speed_violations ENABLE ROW LEVEL SECURITY;

-- Política de exemplo: permitir todas as operações para usuários autenticados
-- CREATE POLICY "Enable all operations for authenticated users" ON vehicles
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);

