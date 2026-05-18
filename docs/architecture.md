# Arquitetura

## Visão geral

Norma Intelligence é uma SPA server-rendered construída sobre Next.js 15 e Supabase. A
separação interna segue **feature-based + DDD light**: cada domínio de negócio é um módulo
vertical com fronteira nítida e quatro camadas internas.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              presentation                              │
│   (Server / Client Components, forms, hooks)                           │
├────────────────────────────────────────────────────────────────────────┤
│                              application                               │
│   (Use cases, Server Actions, contratos)                               │
├────────────────────────────────────────────────────────────────────────┤
│                              infrastructure                            │
│   (Supabase repos, APIs externas, fs)                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                 domain                                 │
│   (Entidades, value objects, regras invariantes)                       │
└────────────────────────────────────────────────────────────────────────┘
```

### Por que essa separação?

- **Testabilidade.** `domain/` é puro: testes unitários rápidos, sem mocks.
- **Trocabilidade.** Se trocarmos Supabase por Postgres direto, só `infrastructure/` muda.
- **Onboarding.** Quem chega lê o `domain/` e entende o negócio antes do framework.
- **Boundaries.** O barrel `index.ts` de cada feature define o que é público; o resto é privado.

## Multi-tenant

Cada cliente da Norma é uma **organization**. Cada usuário pode pertencer a múltiplas
organizations com roles distintos (`owner`, `admin`, `analyst`, `viewer`). O isolamento é
garantido em **três camadas**:

1. **RLS no Postgres** — primeira linha de defesa. Cada tabela de negócio terá `organization_id`
   e uma política `using (is_member_of(organization_id))`.
2. **Server Actions / Route Handlers** — validam que `currentOrganizationId` da sessão bate com
   o recurso requisitado antes de chamar o Supabase.
3. **Middleware** — refresca a sessão e redireciona usuários anônimos.

A função `is_member_of(org_uuid)` está em `supabase/migrations/20260517000000_init_multitenant.sql`.

## Autenticação

Padrão `@supabase/ssr` com três clients:

| Client                          | Onde usar                                       | Respeita RLS? |
| ------------------------------- | ----------------------------------------------- | ------------- |
| `createSupabaseServerClient`    | Server Components, Server Actions, Routes       | Sim           |
| `createSupabaseBrowserClient`   | Client Components (use com parcimônia)          | Sim           |
| `updateSupabaseSession` (mw)    | Apenas em `src/middleware.ts`                   | Sim           |
| `createSupabaseAdminClient`     | Cron, webhooks, server actions já autorizadas   | **Não — bypassa RLS** |

⚠️ O admin client usa a `SUPABASE_SERVICE_ROLE_KEY`. **Nunca** importar de Client Component.

## Dinheiro

Valores monetários são **inteiros em centavos** (`bigint`) encapsulados em `Money`.
Aritmética com `number` é proibida em qualquer lugar do código financeiro. Isso impede:

- Erros de arredondamento que causam diferenças de R$ 0,01 na DRE.
- Aritmética entre moedas distintas (a classe lança erro).
- Serialização inconsistente entre client e server.

Veja `src/shared/money/money.ts`.

## Erros

Hierarquia em `src/shared/errors/app-error.ts`:

- `UnauthenticatedError` (401) — middleware/guard converte em redirect.
- `ForbiddenError` (403) — usuário autenticado sem permissão.
- `NotFoundError` (404)
- `ValidationError` (422) — sempre vem com `fieldErrors`.
- `ConflictError` (409) — conflitos de estado.

Server Actions retornam um `AuthActionState`/`Result<T, E>` em vez de lançar exceções
diretamente, para que `useActionState` no client possa renderizar erros de forma estável.

## Convenções de import

```ts
// ✅ Bom — barrel da feature
import { requireSession } from '@/features/auth';

// ❌ Ruim — vaza estrutura interna
import { requireSession } from '@/features/auth/application/get-session';

// ✅ Bom — shared utilities
import { cn } from '@/shared/lib/utils';
import { Money } from '@/shared/money/money';
```

## Próximos passos

1. **Plano de contas + lançamentos** — schema + UI de importação (CSV/OFX).
2. **Motor de DRE** — `dre/application/build-statement.ts` agregando lançamentos por grupo.
3. **Forecast linear/sazonal** — `forecast/application/run-forecast.ts`.
4. **Detector de insights** — jobs cron + LLM para narrativas.
5. **Observabilidade** — Sentry + structured logs.
6. **Testes** — Vitest para `domain/`, Playwright para fluxos críticos.
