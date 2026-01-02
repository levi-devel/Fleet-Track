# 2026-01-02 — Deploy Vercel não exibe dados do Supabase

## Contexto
O frontend é um app Vite que busca `/api/*` e também se comunica diretamente com o Supabase via `import.meta.env.VITE_SUPABASE_*`. Após subir o build na Vercel, o site carregava corretamente, mas não apresentava nenhum veículo, alerta ou geofence — o console mostrava a mensagem de que o Supabase não estava configurado.

## Ajuste aplicado
- Atualizei a documentação de configuração para reforçar que, além de `SUPABASE_URL` e `SUPABASE_ANON_KEY`, é imprescindível definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na aba de variáveis de ambiente da Vercel para os ambientes Preview e Production.
- Esses valores são lidos só no momento do build, então qualquer alteração exige redeploy completo. Sem eles o cliente não consegue instanciar o `supabase` e nenhuma informação é exibida no dashboard.

Com isso evitamos o silêncio de dados no frontend ao deployar a versão hospedada na Vercel.

