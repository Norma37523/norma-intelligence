# Norma Intelligence

Plataforma de inteligência financeira da **Norma Contábil** — DRE gerencial, insights automáticos e forecast.

## Stack

- **Next.js 15** (App Router, RSC, Server Actions)
- **TypeScript** com `strict` + `noUncheckedIndexedAccess`
- **Tailwind CSS** + **Shadcn UI**
- **Supabase** (Postgres, Auth, RLS)
- **Zod** para validação
- **TanStack Query** para data fetching no client
- **pnpm** como gerenciador de pacotes

## Arquitetura

Feature-based + DDD light. Cada feature em `src/features/<dominio>/` com as camadas:

```
domain/         # Entidades, value objects — sem dependências externas
application/    # Use cases, server actions, contratos
infrastructure/ # Adapters (Supabase, APIs)
presentation/   # Componentes React, hooks, forms
index.ts        # Barrel — único ponto de entrada público
```

Multi-tenant por organização. Isolamento garantido por **Row Level Security** no Postgres — não confiamos em filtros de aplicação.

Veja `docs/architecture.md` para os detalhes.

## Setup

### 1. Pré-requisitos

- Node.js 20+
- pnpm 11+ (`npm install -g pnpm` ou `corepack enable pnpm`)
- Conta no [Supabase](https://supabase.com/) (free tier serve para começar)
- (Opcional, recomendado) [Supabase CLI](https://supabase.com/docs/guides/cli) para rodar o stack local

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha:

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (públicas, ok no browser)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (**NUNCA** commitar, **NUNCA** expor no client)

### 4. Aplicar migrations

Com a Supabase CLI:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Ou rode o stack local:

```bash
supabase start
supabase db reset   # aplica migrations + seed
```

### 5. Gerar os types do Supabase

```bash
pnpm db:types
```

Isso atualiza `src/shared/types/database.types.ts` a partir do schema vigente.

### 6. Subir o dev server

```bash
pnpm dev
```

App em http://localhost:3000.

## Scripts

| Comando             | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Dev server com Turbopack                          |
| `pnpm build`        | Build de produção                                 |
| `pnpm start`        | Server de produção                                |
| `pnpm lint`         | ESLint                                            |
| `pnpm typecheck`    | `tsc --noEmit`                                    |
| `pnpm format`       | Prettier (write)                                  |
| `pnpm format:check` | Prettier (check)                                  |
| `pnpm db:types`     | Regenera tipos TS a partir do schema Supabase     |

## Estrutura

```
.
├── src/
│   ├── app/                       # App Router (rotas)
│   │   ├── (public)/              # Landing pública
│   │   ├── (auth)/                # Login, signup, callback
│   │   ├── (app)/                 # Área autenticada
│   │   └── api/
│   ├── features/                  # Módulos verticais
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── dre/
│   │   ├── forecast/
│   │   └── insights/
│   ├── shared/
│   │   ├── components/ui/         # Shadcn UI
│   │   ├── components/layout/     # Shell, sidebar, header
│   │   ├── supabase/              # Clients (server/browser/middleware/admin)
│   │   ├── money/                 # Value object Money (bigint-based)
│   │   ├── errors/                # AppError, ValidationError, …
│   │   ├── config/env.ts          # Env vars validadas com Zod
│   │   ├── lib/                   # utils, Result type
│   │   ├── hooks/
│   │   └── types/
│   └── middleware.ts              # Refresh de sessão + gate de rotas
├── supabase/
│   ├── config.toml                # Config local (CLI)
│   ├── migrations/                # SQL migrations
│   └── seed/                      # Seed local opcional
├── docs/
│   └── architecture.md
├── public/
└── README.md
```

## Princípios de código

1. **Server-first.** Use Server Components por padrão. Client Components só quando precisar de interatividade.
2. **RLS é a primeira linha de defesa.** Filtros de aplicação são reforço, não substituto.
3. **`Money` em todo valor financeiro.** Float é proibido. Aritmética em bigint (centavos).
4. **Server Actions validadas com Zod.** Toda entrada do usuário passa por schema antes de tocar a infra.
5. **Errors tipados.** Use `AppError` e subclasses; mapeie para HTTP no boundary.
6. **Features fechadas pelo `index.ts`.** Nada de imports atravessando camadas internas de outra feature.

---

© Norma Contábil
