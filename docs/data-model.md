# Modelo de dados

Schema PostgreSQL aplicado via migrations em `supabase/migrations/`. Atualize este
documento sempre que adicionar/alterar uma tabela ou enum.

## Camada de tenancy

```
auth.users  ──┐
              │
              ├──< organization_members >── organizations
              │                                  │
              └────────── profiles               ├──< companies   (1 org → N companies)
                                                       │
                                            ┌──────────┴──────────┐
                                            ▼                     ▼
                                       (todas as tabelas de negócio têm company_id)
```

- **`organizations`** é o tenant SaaS (assinatura, faturamento, time).
- **`organization_members`** N:N usuários × organizações com `role` (`owner` / `admin` / `analyst` / `viewer`).
- **`companies`** é a entidade jurídica (CNPJ). Uma org pode ter várias.
- Toda tabela de negócio referencia `company_id`. RLS via `is_member_of_company()`.

## ERD textual

```
companies ────< fiscal_periods
    │             │
    │             └─< financial_entries
    │             │      ▲
    │             │      ├── debit_account_id  ─────┐
    │             │      ├── credit_account_id ─────┼──> chart_of_accounts
    │             │      ├── cost_center_id ──────────> cost_centers
    │             │      └── upload_id ──────────────> uploads
    │             │
    │             └─< dre_snapshots ──< dre_lines ─> dre_groups
    │
    ├──< chart_of_accounts (hierárquico via parent_id)
    ├──< cost_centers      (hierárquico via parent_id)
    ├──< dre_groups        (hierárquico via parent_id)
    │     └── dre_account_mappings (N:N com chart_of_accounts)
    │
    ├──< uploads
    ├──< forecasts ──< forecast_points
    └──< insights ──> chart_of_accounts | cost_centers | forecasts (refs opcionais)
```

## Tabelas

### Tenancy

| Tabela                   | Propósito                                                   |
| ------------------------ | ----------------------------------------------------------- |
| `profiles`               | Dados públicos por `auth.users` (1:1)                       |
| `organizations`          | Tenants SaaS                                                |
| `organization_members`   | Memberships com `role`                                      |

### Core de negócio

| Tabela                  | Propósito                                                       |
| ----------------------- | --------------------------------------------------------------- |
| `companies`             | Entidades jurídicas (CNPJ) dentro de uma organização            |
| `fiscal_periods`        | Janelas de competência (mensal/trimestral/anual) com `status`   |
| `cost_centers`          | Centros de custo hierárquicos                                   |
| `chart_of_accounts`     | Plano de contas hierárquico (sintético + analítico)             |
| `dre_groups`            | Estrutura do DRE Gerencial (hierárquica)                        |
| `dre_account_mappings`  | N:N entre contas e grupos do DRE                                |

### Dados financeiros

| Tabela              | Propósito                                                            |
| ------------------- | -------------------------------------------------------------------- |
| `uploads`           | Arquivos (OFX/CSV/PDF/etc.) que alimentam o sistema                  |
| `financial_entries` | Lançamentos contábeis / financeiros (1 linha = 1 partida dupla)      |

### Camada de inteligência

| Tabela            | Propósito                                                                  |
| ----------------- | -------------------------------------------------------------------------- |
| `dre_snapshots`   | Versões fechadas do DRE por período (`draft` / `published` / `superseded`) |
| `dre_lines`       | Linhas materializadas de um snapshot                                       |
| `forecasts`       | Projeções por métrica × cenário × método                                   |
| `forecast_points` | Pontos mensais de um forecast (com IC opcional)                            |
| `insights`        | Achados automáticos (regra estatística + LLM)                              |

## Convenções

### Dinheiro

- **Sempre** `bigint` em **minor units** (centavos para BRL).
- Coluna: `amount_minor` / `value_minor`.
- Casa com `Money` em `src/shared/money/money.ts`.
- `currency char(3)` por linha permite multi-moeda no futuro.

### Datas e períodos

- `date` para datas de competência/vencimento.
- `timestamptz` para auditoria (created_at / updated_at).
- `fiscal_periods` controla janelas de fechamento; um trigger bloqueia escrita
  em `financial_entries` de períodos `closed`/`locked`.

### Identificadores

- `uuid` em todas as PKs (`uuid_generate_v4()`).
- Códigos de negócio (`code` em accounts, cost_centers, dre_groups) são únicos
  por company — usados para integração com ERPs (Domínio, etc.).

### Hierarquia

- `parent_id` self-reference em accounts, cost_centers, dre_groups.
- Triggers anti-ciclo (`tg_*_no_self_cycle`) e profundidade máxima 50.

### JSON

- `jsonb` para `metadata`, `details`, `stats`, `evidence`, `parameters`.
- Use para extensão; **não** use para dados que serão filtrados/ordenados (vão pra coluna).

## RLS — Row Level Security

Toda tabela de negócio é gated por:

```sql
public.is_member_of_company(company_id)         -- SELECT
public.has_company_role(company_id, roles[])    -- INSERT/UPDATE/DELETE
```

Os roles aceitos por operação:

| Operação         | Roles                                                |
| ---------------- | ---------------------------------------------------- |
| SELECT           | qualquer membro (`owner` / `admin` / `analyst` / `viewer`) |
| INSERT / UPDATE  | `owner` / `admin` / `analyst`                        |
| DELETE           | `owner` / `admin`                                    |

`viewer` é read-only por design.

Tabelas com FK para `companies` (não `company_id` direto) usam policies com EXISTS
que validam o `company_id` do parent — ver `dre_lines` e `forecast_points`.

## Triggers utilitários

| Trigger                              | Aplica em                                    |
| ------------------------------------ | -------------------------------------------- |
| `set_updated_at`                     | Toda tabela com `updated_at`                 |
| `tg_cost_center_no_self_cycle`       | `cost_centers`                               |
| `tg_account_no_self_cycle`           | `chart_of_accounts`                          |
| `tg_block_closed_period_writes`      | `financial_entries` (período fechado)        |
| `handle_new_user`                    | `auth.users` → cria `profiles`               |
| `handle_new_organization`            | `organizations` → adiciona owner em members  |

## Como evoluir

1. Crie uma migration nova com timestamp atual (`YYYYMMDDHHMMSS_descricao.sql`).
2. Para nova tabela de negócio: adicione `company_id uuid not null references companies(id) on delete cascade`, habilite RLS, escreva policies usando os helpers.
3. Atualize `src/shared/types/database.types.ts` (ou rode `pnpm db:types` quando o Supabase estiver configurado).
4. Atualize este documento.
