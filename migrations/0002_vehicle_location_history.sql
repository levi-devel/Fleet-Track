-- ============================================
-- CONTROLE DE FROTAS - HISTÓRICO DE LOCALIZAÇÕES
-- Tabela para armazenar histórico de posições dos veículos
-- ============================================

-- Tabela: vehicle_location_history
-- Armazena cada ponto de localização dos veículos para consulta histórica
CREATE TABLE IF NOT EXISTS vehicle_location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed INTEGER NOT NULL DEFAULT 0,
    heading INTEGER NOT NULL DEFAULT 0,
    status vehicle_status NOT NULL,
    ignition ignition_status NOT NULL,
    accuracy REAL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA OTIMIZAÇÃO
-- ============================================

-- Índice para busca por veículo
CREATE INDEX IF NOT EXISTS idx_location_history_vehicle_id 
ON vehicle_location_history(vehicle_id);

-- Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_location_history_recorded_at 
ON vehicle_location_history(recorded_at);

-- Índice composto para consultas por veículo e período (mais comum)
CREATE INDEX IF NOT EXISTS idx_location_history_vehicle_date 
ON vehicle_location_history(vehicle_id, recorded_at DESC);

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE vehicle_location_history IS 'Histórico de localizações dos veículos para rastreamento';
COMMENT ON COLUMN vehicle_location_history.vehicle_id IS 'ID do veículo (referência à tabela vehicles)';
COMMENT ON COLUMN vehicle_location_history.latitude IS 'Latitude da posição';
COMMENT ON COLUMN vehicle_location_history.longitude IS 'Longitude da posição';
COMMENT ON COLUMN vehicle_location_history.speed IS 'Velocidade em km/h no momento do registro';
COMMENT ON COLUMN vehicle_location_history.heading IS 'Direção do veículo (0-360 graus)';
COMMENT ON COLUMN vehicle_location_history.status IS 'Status do veículo (moving, stopped, idle, offline)';
COMMENT ON COLUMN vehicle_location_history.ignition IS 'Estado da ignição (on, off)';
COMMENT ON COLUMN vehicle_location_history.accuracy IS 'Precisão do GPS em metros';
COMMENT ON COLUMN vehicle_location_history.recorded_at IS 'Momento em que a localização foi registrada';

