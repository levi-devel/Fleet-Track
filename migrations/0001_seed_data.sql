-- ============================================
-- CONTROLE DE FROTAS - DADOS DE EXEMPLO
-- Execute este script após criar as tabelas
-- ============================================

-- ============================================
-- VEÍCULOS DE EXEMPLO
-- ============================================

INSERT INTO vehicles (id, name, license_plate, model, status, ignition, current_speed, speed_limit, heading, latitude, longitude, accuracy, battery_level)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '🚛 Caminhão 01', 'ABC-1234', 'Mercedes Actros', 'moving', 'on', 72, 80, 45, -23.5489, -46.6388, 5, 85),
    ('22222222-2222-2222-2222-222222222222', '🚐 Van 02', 'DEF-5678', 'Fiat Ducato', 'moving', 'on', 95, 60, 180, -23.5605, -46.6533, 3, 92),
    ('33333333-3333-3333-3333-333333333333', '🚛 Caminhão 03', 'GHI-9012', 'Volvo FH', 'stopped', 'off', 0, 80, 0, -23.5305, -46.6233, 4, 78),
    ('44444444-4444-4444-4444-444444444444', '🚐 Van 04', 'JKL-3456', 'Renault Master', 'moving', 'on', 55, 60, 270, -23.5705, -46.6433, 6, 67),
    ('55555555-5555-5555-5555-555555555555', '🚛 Caminhão PoloTelecom', 'MNO-7890', 'Scania R450', 'idle', 'on', 0, 80, 90, -23.5405, -46.6133, 4, 91),
    ('66666666-6666-6666-6666-666666666666', '🚐 Van 06', 'PQR-1234', 'VW Delivery', 'offline', 'off', 0, 60, 0, -23.5205, -46.6733, 10, 45)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GEOFENCES DE EXEMPLO
-- ============================================

INSERT INTO geofences (id, name, description, type, active, center_latitude, center_longitude, radius, rules, vehicle_ids, color)
VALUES 
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Depósito Central',
        'Área principal de carga e descarga',
        'circle',
        TRUE,
        -23.5505,
        -46.6333,
        500,
        '[{"type": "entry", "enabled": true, "toleranceSeconds": 30}, {"type": "exit", "enabled": true, "toleranceSeconds": 30}, {"type": "dwell", "enabled": true, "dwellTimeMinutes": 60, "toleranceSeconds": 30}]'::jsonb,
        ARRAY['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555'],
        '#22c55e'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Zona de Entrega Norte',
        'Região de entregas no setor norte',
        'polygon',
        TRUE,
        NULL,
        NULL,
        NULL,
        '[{"type": "entry", "enabled": true, "toleranceSeconds": 60}, {"type": "exit", "enabled": true, "toleranceSeconds": 60}]'::jsonb,
        ARRAY['11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'],
        '#3b82f6'
    ),
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Área Restrita',
        'Zona de acesso proibido',
        'circle',
        TRUE,
        -23.5800,
        -46.6600,
        300,
        '[{"type": "entry", "enabled": true, "toleranceSeconds": 10}]'::jsonb,
        ARRAY['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666'],
        '#ef4444'
    )
ON CONFLICT (id) DO NOTHING;

-- Atualizar pontos do polígono para Zona de Entrega Norte
UPDATE geofences 
SET points = '[{"latitude": -23.5200, "longitude": -46.6400}, {"latitude": -23.5200, "longitude": -46.6200}, {"latitude": -23.5350, "longitude": -46.6200}, {"latitude": -23.5350, "longitude": -46.6400}]'::jsonb
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- ============================================
-- ALERTAS DE EXEMPLO
-- ============================================

INSERT INTO alerts (id, type, priority, vehicle_id, vehicle_name, message, read, latitude, longitude, speed, speed_limit, geofence_name)
VALUES 
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'speed',
        'critical',
        '22222222-2222-2222-2222-222222222222',
        '🚐 Van 02',
        'Velocidade acima do limite: 95 km/h em zona de 60 km/h',
        FALSE,
        -23.5605,
        -46.6533,
        95,
        60,
        NULL
    ),
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'geofence_entry',
        'info',
        '11111111-1111-1111-1111-111111111111',
        '🚛 Caminhão 01',
        'Entrada na área ''Depósito Central''',
        FALSE,
        -23.5505,
        -46.6333,
        NULL,
        NULL,
        'Depósito Central'
    ),
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'system',
        'info',
        '66666666-6666-6666-6666-666666666666',
        '🚐 Van 06',
        'Veículo offline há mais de 1 hora',
        FALSE,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIM DOS DADOS DE EXEMPLO
-- ============================================

