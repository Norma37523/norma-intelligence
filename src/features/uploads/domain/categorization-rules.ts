/**
 * Static keyword rules for first-pass categorization.
 *
 * These are intentionally simple — the real value comes from history-based
 * matching (already-categorized counterparties). Rules act as a backstop when
 * the company has no history yet.
 *
 * `accountTypeHint` narrows the candidate set within chart_of_accounts; the
 * actual account_id is resolved by the categorizer based on the company's
 * own plano de contas.
 */
export interface CategorizationRule {
  readonly pattern: RegExp;
  readonly accountTypeHint: 'expense' | 'revenue' | 'asset' | 'liability';
  readonly nameContains: ReadonlyArray<string>;   // hints for matching account names
  readonly label: string;
}

export const DEFAULT_RULES: ReadonlyArray<CategorizationRule> = [
  // Pessoal
  { pattern: /\bsalari?o\b|\bfolha\b|\bpro labore\b/i, accountTypeHint: 'expense', nameContains: ['salar', 'folha', 'pro labore'], label: 'Pessoal — Salários' },
  { pattern: /\bferias\b|\b13o?\b|\bdecimo terceiro\b/i, accountTypeHint: 'expense', nameContains: ['ferias', '13'], label: 'Pessoal — Férias / 13º' },
  { pattern: /\binss\b|\bfgts\b|\birrf\b/i, accountTypeHint: 'liability', nameContains: ['inss', 'fgts', 'irrf', 'imposto'], label: 'Encargos sociais' },

  // Infra / serviços
  { pattern: /\benergia\b|\beletric|\bcemig\b|\benel\b|\blight\b|\bcoelba\b/i, accountTypeHint: 'expense', nameContains: ['energia', 'eletric'], label: 'Energia elétrica' },
  { pattern: /\bagua\b|\bsabesp\b|\bcaesb\b|\bsanepar\b/i, accountTypeHint: 'expense', nameContains: ['agua'], label: 'Água' },
  { pattern: /\btelefon\b|\bvivo\b|\bclaro\b|\btim\b|\boi\b/i, accountTypeHint: 'expense', nameContains: ['telefon', 'comunic'], label: 'Telefonia' },
  { pattern: /\binternet\b|\bbanda larga\b/i, accountTypeHint: 'expense', nameContains: ['internet', 'comunic'], label: 'Internet' },
  { pattern: /\baluguel\b|\blocacao\b/i, accountTypeHint: 'expense', nameContains: ['aluguel', 'locacao'], label: 'Aluguel' },

  // Tributos
  { pattern: /\bdas\b|\bsimples nacional\b/i, accountTypeHint: 'liability', nameContains: ['das', 'simples'], label: 'DAS — Simples Nacional' },
  { pattern: /\biss\b/i, accountTypeHint: 'liability', nameContains: ['iss'], label: 'ISS' },
  { pattern: /\bicms\b/i, accountTypeHint: 'liability', nameContains: ['icms'], label: 'ICMS' },
  { pattern: /\bpis\b|\bcofins\b/i, accountTypeHint: 'liability', nameContains: ['pis', 'cofins'], label: 'PIS / COFINS' },

  // Bancário
  { pattern: /\btarifa\b|\btar mensal\b|\bmanutencao conta\b/i, accountTypeHint: 'expense', nameContains: ['tarifa', 'bancari'], label: 'Tarifas bancárias' },
  { pattern: /\bjuros\b|\biof\b/i, accountTypeHint: 'expense', nameContains: ['juros', 'iof', 'financeir'], label: 'Encargos financeiros' },
  { pattern: /\brendimento\b|\baplicacao\b/i, accountTypeHint: 'revenue', nameContains: ['rendimento', 'aplicacao'], label: 'Receita financeira' },

  // Receita / serviços
  { pattern: /\bhonorari\b|\bservicos prestados\b|\bnf-?e?\s*\d/i, accountTypeHint: 'revenue', nameContains: ['receita', 'servico', 'honorari'], label: 'Receita de serviços' },
];
