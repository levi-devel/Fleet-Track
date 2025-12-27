# Ajustes de Layout e Logo - 13/12/2025

## Alterações Realizadas

### 1. Aumento do Tamanho da Logo
**Arquivo**: `client/src/App.tsx`

**Modificação**: Aumentado o tamanho da logo principal do sistema

```tsx
// Antes (original)
className="h-10 w-auto object-contain dark:invert"

// Depois (final)
className="h-14 w-64 object-contain dark:invert"
```

**Detalhes**:
- Altura ajustada para `h-14` (56px) - tamanho maior e mais destacado
- Largura definida para `w-64` (256px) - logo bem mais visível
- Mantém `object-contain` para preservar proporções da imagem
- Mantém `dark:invert` para adaptação ao tema escuro

### 2. Correção do Layout do Sidebar de Veículos
**Arquivo**: `client/src/pages/dashboard.tsx`

**Problema**: O mapa estava invadindo o espaço do sidebar de veículos, causando corte visual dos cards.

**Solução**: Adicionado `z-index` e `min-w-0` para garantir o posicionamento correto

```tsx
// Sidebar de veículos
<div className="w-80 flex-shrink-0 border-r border-sidebar-border bg-sidebar z-10">

// Container do mapa
<div className="flex-1 relative min-w-0">
```

**Detalhes das mudanças**:
- Adicionado `z-10` ao sidebar de veículos para garantir que fique acima do mapa
- Adicionado `min-w-0` ao container do mapa para permitir que ele reduza quando necessário
- Mantém `flex-shrink-0` no sidebar para garantir largura fixa de 320px (w-80)

## Resultado

✅ Logo maior e mais visível no header, proporcional ao botão do Dashboard
✅ Sidebar de veículos completamente visível sem cortes
✅ Mapa não invade mais o espaço dos cards de veículos
✅ Layout responsivo e funcional mantido

## Arquivos Modificados

- `client/src/App.tsx` - Ajuste da logo
- `client/src/pages/dashboard.tsx` - Correção do layout do sidebar

