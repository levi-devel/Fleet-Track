# API de Rastreamento de Veículos

Este documento descreve como autenticar e enviar dados de localização via `POST /api/tracking`.

## Sumário
1. [Visão geral](#vis%C3%A3o-geral)
2. [Configurar a API Key](#configurar-a-api-key)
3. [Endpoint](#endpoint)
4. [Campos do body](#campos-do-body)
5. [Exemplos de requisição](#exemplos-de-requisi%C3%A7%C3%A3o)
6. [Códigos de resposta](#c%C3%B3digos-de-resposta)
7. [Integração](#integra%C3%A7%C3%A3o)
8. [Boas práticas](#boas-pr%C3%A1ticas)
9. [Troubleshooting](#troubleshooting)

---

## Visão geral

A API de rastreamento recebe dados enviados por dispositivos GPS ou aplicativos móveis. Ao processar os dados:

1. Valida o payload (`licensePlate`, `latitude`, `longitude`, `speed`).
2. Busca o veículo cadastrado pela placa (busca case-insensitive).
3. Atualiza o status, localização e ignição, e registra o histórico se aplicável.
4. Envia atualizações em tempo real via Supabase Realtime/WebSocket.

## Configurar a API Key

O endpoint exige uma API Key para proteger o envio de localização.

1. Defina no `.env`:
   ```env
   TRACKING_API_KEY=uma-chave-secreta-de-32-caracteres
   ```
2. No header da requisição inclua:
   ```
   X-API-Key: <TRACKING_API_KEY>
   ```

## Endpoint

`POST /api/tracking`

### Headers obrigatórios

| Header | Valor |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-API-Key` | valor definido em `TRACKING_API_KEY` |

## Campos do body

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `licensePlate` | string | Sim | Placa do veículo (ex: `"ABC-1234"`) |
| `latitude` | number | Sim | Latitude (-90 a 90) |
| `longitude` | number | Sim | Longitude (-180 a 180) |
| `speed` | number | Sim | Velocidade em km/h (>= 0) |

### Validações extras

- `licensePlate` não pode estar vazio.
- `latitude` / `longitude` devem estar nos intervalos válidos.
- `speed` não pode ser negativo.

## Exemplos de requisição

### cURL

```bash
curl -X POST http://localhost:5000/api/tracking \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key-secreta-aqui" \
  -d '{
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "speed": 72
  }'
```

### Node.js (fetch)

```javascript
const response = await fetch("http://localhost:5000/api/tracking", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "sua-api-key-secreta-aqui",
  },
  body: JSON.stringify({
    licensePlate: "ABC-1234",
    latitude: -23.5489,
    longitude: -46.6388,
    speed: 60,
  }),
});

const payload = await response.json();
console.log(payload);
```

### Python (requests)

```python
import requests

url = "http://localhost:5000/api/tracking"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "sua-api-key-secreta-aqui",
}
data = {
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "speed": 60,
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

## Códigos de resposta

### 200 OK

```json
{
  "success": true,
  "message": "Localização atualizada com sucesso",
  "vehicle": {
    "id": "uuid-do-veiculo",
    "name": "Caminhão 01",
    "licensePlate": "ABC-1234",
    "latitude": -23.5489,
    "longitude": -46.6388,
    "currentSpeed": 60,
    "status": "moving",
    "lastUpdate": "2024-12-06T15:30:00.000Z"
  }
}
```

### 400 Bad Request – dados inválidos

```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "field": "licensePlate",
      "message": "Placa é obrigatória"
    }
  ]
}
```

### 401 Unauthorized – API Key ausente ou inválida

```json
{
  "error": "API Key não fornecida. Use o header X-API-Key."
}
```

ou

```json
{
  "error": "API Key inválida"
}
```

### 404 Not Found – veículo não encontrado

```json
{
  "error": "Veículo não encontrado",
  "message": "Nenhum veículo cadastrado com a placa \"XYZ-9999\""
}
```

### 500 Internal Server Error

```json
{
  "error": "Erro interno do servidor",
  "message": "Falha ao processar os dados de rastreamento"
}
```

## Integração

- **Frequência recomendada**: 5–30 segundos em movimento; 30–60 segundos quando parado.
- **Retry**: implemente lógica de retrigger em caso de falha de rede.
- **Buffer local**: armazene localmente quando offline e envie em lote mais tarde.
- **Status automático**: velocidade > 0 define `status` como `moving` e `ignition` para `on`; velocidade = 0 mantém ignição.

## Boas práticas

1. Nunca exponha `TRACKING_API_KEY` no frontend.
2. Use HTTPS em produção.
3. Valide lat/long antes de enviar para evitar chamadas desnecessárias.
4. Faça rotação periódica da chave e monitore tentativas falhas.

## Troubleshooting

- **401 mesmo com chave correta**: confirme que `TRACKING_API_KEY` está no `.env` e o servidor foi reiniciado.
- **Veículo não encontrado**: certifique-se de cadastrar a placa no sistema (`POST /api/vehicles` ou via seed).
- **Atualizações não aparecem no mapa**: verifique o Supabase Realtime, o status do veículo e atualize o dashboard.
