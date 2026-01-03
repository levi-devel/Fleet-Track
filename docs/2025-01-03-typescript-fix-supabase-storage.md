# Correção de Erros TypeScript em supabase-storage.ts

**Data:** 03/01/2025

## Problema

O Vercel estava reportando erros TypeScript no arquivo `server/supabase-storage.ts` nas linhas 498-517, relacionados ao método `getFleetStats()`. Os erros indicavam que propriedades como `recorded_at`, `latitude`, `longitude`, `speed`, `id` e `name` não existiam no tipo `never`.

### Erros Específicos:
```
server/supabase-storage.ts(498,24): error TS2339: Property 'recorded_at' does not exist on type 'never'.
server/supabase-storage.ts(499,24): error TS2339: Property 'recorded_at' does not exist on type 'never'.
server/supabase-storage.ts(508,35): error TS2339: Property 'latitude' does not exist on type 'never'.
server/supabase-storage.ts(509,35): error TS2339: Property 'longitude' does not exist on type 'never'.
server/supabase-storage.ts(510,31): error TS2339: Property 'latitude' does not exist on type 'never'.
server/supabase-storage.ts(511,31): error TS2339: Property 'longitude' does not exist on type 'never'.
server/supabase-storage.ts(513,48): error TS2339: Property 'speed' does not exist on type 'never'.
server/supabase-storage.ts(516,38): error TS2339: Property 'id' does not exist on type 'never'.
server/supabase-storage.ts(517,25): error TS2339: Property 'name' does not exist on type 'never'.
```

## Causa

O TypeScript estava inferindo o tipo `never` para os elementos do array `vehicleHistory` após a operação de `.filter()` e `.sort()`. Isso acontecia porque o TypeScript perdia informações sobre os tipos retornados pela query do Supabase.

## Solução Implementada

Foi adicionada uma definição de tipo local `HistoryRecord` para tipar explicitamente os registros de histórico de localização dos veículos:

```typescript
type HistoryRecord = {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  recorded_at: string;
};
```

Em seguida, foi aplicada uma asserção de tipo ao resultado do `.filter()`:

```typescript
const vehicleHistory = historyData
  .filter((h) => h.vehicle_id === vehicle.id) as HistoryRecord[];
```

A operação de `.sort()` foi separada para melhor clareza e o TypeScript agora consegue inferir corretamente os tipos.

Também foram removidas as asserções de tipo desnecessárias (`as number`, `as string`) que eram usadas como workaround no restante do código.

## Arquivos Modificados

- `server/supabase-storage.ts` - Método `getFleetStats()` (linhas 491-526)

## Resultado

Todos os erros TypeScript foram resolvidos e o código agora compila sem erros no Vercel. O comportamento funcional permanece o mesmo, apenas a tipagem foi corrigida.

