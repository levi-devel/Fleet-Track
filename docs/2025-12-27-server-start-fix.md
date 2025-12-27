## Correção de inicialização do servidor (27/12/2025)

- Resolvi conflito de merge em `server/index.ts` que deixava o arquivo com os marcadores `<<<<<<<` 
  e impedia que o `tsx server/index.ts` fosse transpilado.
- Removi os marcadores e mantive o comentário explicando que as variáveis de ambiente precisam ser carregadas antes de qualquer importação.
- Também limpei o conflito em `server/routes.ts` na rota `/api/trips`, garantindo que o backend continue suportando a listagem de viagens de todos os veículos e preserve o bloco de log de agente que já estava presente.
- Resolvi os conflitos do storage em `server/storage.ts`, mantendo a assinatura `getVehicleByLicensePlate` em todas as implementações e atualizando `server/routes.ts` para chamar o mesmo método, o que evita erros de tipagem e mantém a busca ignorando maiúsculas/minúsculas.
- Limpei os marcadores de conflito em `shared/schema.ts` dentro do comentário da definição `trackingDataSchema`, garantindo que o arquivo fique válido e evitando o erro de transformação que empacota o backend.
- Ajustei a fábrica de storage em `server/storage.ts` para usar a versão assíncrona que exporta `storage` e `initPromise`, incluindo o log do agente, de forma que o `server/index.ts` consiga aguardar o carregamento correto do armazenamento (Supabase x MemStorage).
- Resolvi os conflitos no frontend (`client/src/components/ui/dialog.tsx` e `client/src/pages/geofences.tsx`), restaurando a classe correta do overlay, padronizando o nome do handler de atualização e garantindo que o diálogo de edição abra apenas quando há um geofence selecionado.

Com essa correção o servidor consegue iniciar novamente (`npm run dev`).

## Limpeza e documentação adicional (27/12/2025)

- Reescrevi `docs/supabase-setup.md` e `docs/tracking-api.md` com versões unificadas, removendo os conflitos anteriores e mantendo instruções completas para configuração do Supabase e uso do endpoint de rastreamento.
- Regerei o `package-lock.json` via `npm install` para eliminar os marcadores de conflito presentes no arquivo, garantindo consistência nas dependências.
- Atualizei `client/src/components/auth-guard.tsx` para mover a navegação (`setLocation`) para `useEffect` e evitar efeitos colaterais durante a renderização, deixando os guardas estáveis.
- Removi todos os `fetch` de depuração que enviavam dados para `http://127.0.0.1:7242/ingest/...`, tanto no frontend (`App Navigation`) quanto nos serviços do backend (`server/routes.ts`, `server/storage.ts`, `server/tracking-routes.ts`), deixando apenas os logs essenciais para produção.

Com isso mantemos a aplicação carregando apenas o que é necessário em produção.
