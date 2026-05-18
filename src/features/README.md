# Features

Cada feature é um módulo vertical com fronteira clara, organizado em quatro camadas:

```
features/<feature>/
├── domain/          # Entidades, value objects, regras invariantes. Sem dependências externas.
├── application/     # Use cases, server actions, contratos. Orquestra domain + infra.
├── infrastructure/  # Adapters (Supabase, APIs externas). Implementa portas definidas em application.
├── presentation/    # Componentes React, hooks, forms. Consome application.
└── index.ts         # Barrel — único ponto de entrada público da feature.
```

## Regras

1. **Só importe outras features pelo `index.ts`** (barrel). Nunca por subcaminho.
2. **`domain/` não importa nada de fora da feature** — exceto outros `domain/` (cross-feature) e `@/shared/money`, `@/shared/errors`.
3. **`infrastructure/` é a única camada que toca Supabase, fetch, fs, etc.**
4. **Server Actions vivem em `application/actions.ts`**. Cada Action começa com `'use server'`.
5. **Componentes UI compartilhados** ficam em `@/shared/components/ui` (Shadcn). Componentes específicos da feature ficam em `presentation/`.

## Features atuais

| Feature         | Status      | Descrição                                                 |
| --------------- | ----------- | --------------------------------------------------------- |
| `auth`          | Implementada | Login, signup, signout, session context server-side.      |
| `organizations` | Esqueleto   | Tenants (multi-tenant), membros, roles.                   |
| `dre`           | Esqueleto   | DRE Gerencial — domínio e tipos prontos.                  |
| `forecast`      | Esqueleto   | Projeções financeiras — domínio e tipos prontos.          |
| `insights`      | Esqueleto   | Insights automáticos (estatísticos + LLM) — domínio pronto.|

## Adicionando uma feature nova

```bash
mkdir -p src/features/minha-feature/{domain,application,infrastructure,presentation}
touch src/features/minha-feature/index.ts
```

Comece pelo `domain/` (modelagem pura), depois `application/` (use cases),
infra em seguida, e presentation por último.
