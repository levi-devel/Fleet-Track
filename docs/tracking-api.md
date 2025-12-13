# API de Rastreamento de Veículos

Este documento descreve como utilizar o endpoint de rastreamento para enviar dados de localização dos veículos.

## Sumário

1. [Visão Geral](#visão-geral)
2. [Endpoint](#endpoint)
3. [Campos do Body](#campos-do-body)
4. [Exemplos](#exemplos)
5. [Códigos de Resposta](#códigos-de-resposta)
6. [Integração com Rastreadores](#integração-com-rastreadores)

---

## Visão Geral

O endpoint de rastreamento permite que dispositivos de rastreamento (GPS trackers) enviem dados de localização em tempo real para o sistema. Ao receber os dados, o sistema:

1. Valida os dados recebidos
2. Localiza o veículo pela placa
3. Atualiza automaticamente o status do veículo baseado na velocidade
4. Atualiza a posição no mapa em tempo real via WebSocket

---

## Endpoint

```
POST /api/tracking
```

### Headers

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| Content-Type | application/json | Sim |

---

## Campos do Body

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| `licensePlate` | string | Sim | Placa do veículo (deve estar cadastrado no sistema) | `"ABC-1234"` |
| `latitude` | number | Sim | Latitude da posição atual (-90 a 90) | `-23.5489` |
| `longitude` | number | Sim | Longitude da posição atual (-180 a 180) | `-46.6388` |
| `speed` | number | Sim | Velocidade atual em km/h (mínimo 0) | `72` |

### Validações

- **licensePlate**: Deve ser uma string não vazia
- **latitude**: Deve estar entre -90 e 90 (graus)
- **longitude**: Deve estar entre -180 e 180 (graus)
- **speed**: Deve ser um número maior ou igual a 0

---

## Exemplos

### Requisição - Veículo em Movimento

```bash
curl -X POST http://localhost:5000/api/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "speed": 72
  }'
```

### Resposta - Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Localização atualizada com sucesso",
  "vehicle": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Caminhão 01",
    "licensePlate": "ABC-1234",
    "model": "Mercedes Actros",
    "status": "moving",
    "ignition": "on",
    "currentSpeed": 72,
    "speedLimit": 80,
    "heading": 45,
    "latitude": -23.5489,
    "longitude": -46.6388,
    "accuracy": 5,
    "lastUpdate": "2024-12-06T15:30:00.000Z",
    "batteryLevel": 85
  }
}
```

### Requisição - Veículo Parado

```bash
curl -X POST http://localhost:5000/api/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "licensePlate": "DEF-5678",
    "latitude": -23.5605,
    "longitude": -46.6533,
    "speed": 0
  }'
```

### Resposta - Veículo Parado (200 OK)

```json
{
  "success": true,
  "message": "Localização atualizada com sucesso",
  "vehicle": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Van 02",
    "licensePlate": "DEF-5678",
    "status": "stopped",
    "currentSpeed": 0,
    "latitude": -23.5605,
    "longitude": -46.6533,
    "lastUpdate": "2024-12-06T15:30:00.000Z"
  }
}
```

---

## Códigos de Resposta

### Sucesso

| Código | Descrição |
|--------|-----------|
| `200 OK` | Localização atualizada com sucesso |

### Erros

| Código | Descrição | Causa |
|--------|-----------|-------|
| `400 Bad Request` | Dados inválidos | Campos obrigatórios ausentes ou com formato incorreto |
| `404 Not Found` | Veículo não encontrado | A placa enviada não corresponde a nenhum veículo cadastrado |
| `500 Internal Server Error` | Erro interno | Falha ao processar os dados |

### Exemplo - Erro 400 (Dados Inválidos)

```json
{
  "error": "Invalid tracking data",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Placa é obrigatória",
      "path": ["licensePlate"]
    }
  ]
}
```

### Exemplo - Erro 404 (Veículo Não Encontrado)

```json
{
  "error": "Vehicle not found",
  "message": "Nenhum veículo encontrado com a placa: XYZ-9999"
}
```

---

## Integração com Rastreadores

### Frequência de Envio Recomendada

| Situação | Intervalo |
|----------|-----------|
| Veículo em movimento | 5-15 segundos |
| Veículo parado | 30-60 segundos |
| Modo economia de bateria | 1-5 minutos |

### Comportamento Automático do Sistema

Quando os dados são recebidos, o sistema atualiza automaticamente:

| Campo | Comportamento |
|-------|---------------|
| `status` | `"moving"` se velocidade > 0, `"stopped"` se velocidade = 0 |
| `ignition` | `"on"` se velocidade > 0, mantém estado anterior se parado |
| `lastUpdate` | Atualizado para o horário atual do servidor |
| `currentSpeed` | Atualizado com o valor de `speed` enviado |

### Exemplo de Integração (Node.js)

```javascript
const axios = require('axios');

async function sendTrackingData(plate, lat, lng, speed) {
  try {
    const response = await axios.post('http://localhost:5000/api/tracking', {
      licensePlate: plate,
      latitude: lat,
      longitude: lng,
      speed: speed
    });
    
    console.log('Localização atualizada:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Erro:', error.response.data);
    }
    throw error;
  }
}

// Uso
sendTrackingData('ABC-1234', -23.5489, -46.6388, 72);
```

### Exemplo de Integração (Python)

```python
import requests

def send_tracking_data(plate, lat, lng, speed):
    url = 'http://localhost:5000/api/tracking'
    data = {
        'licensePlate': plate,
        'latitude': lat,
        'longitude': lng,
        'speed': speed
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        print('Localização atualizada:', response.json())
        return response.json()
    else:
        print('Erro:', response.json())
        raise Exception(response.json())

# Uso
send_tracking_data('ABC-1234', -23.5489, -46.6388, 72)
```

### Exemplo de Integração (cURL em Shell Script)

```bash
#!/bin/bash

PLATE="ABC-1234"
LAT=-23.5489
LNG=-46.6388
SPEED=72

curl -X POST http://localhost:5000/api/tracking \
  -H "Content-Type: application/json" \
  -d "{
    \"licensePlate\": \"$PLATE\",
    \"latitude\": $LAT,
    \"longitude\": $LNG,
    \"speed\": $SPEED
  }"
```

---

## Próximos Passos

Após enviar dados de rastreamento, você pode:

1. **Visualizar no mapa**: Acesse o dashboard para ver a posição atualizada
2. **Consultar veículo**: `GET /api/vehicles/{id}`
3. **Listar todos veículos**: `GET /api/vehicles`
4. **Verificar alertas**: `GET /api/alerts` (alertas de velocidade são gerados automaticamente)

---

## Suporte

Para dúvidas ou problemas:

- Verifique se a placa está cadastrada no sistema
- Confirme que os valores de latitude/longitude estão corretos
- Certifique-se de que o Content-Type está definido como `application/json`

