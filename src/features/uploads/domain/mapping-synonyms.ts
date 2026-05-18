import type { CanonicalColumn } from './parsed-row';

/**
 * Header → canonical column synonyms for auto-detection.
 *
 * Match is case-insensitive and accent-insensitive (see normalizeHeader).
 * Order matters within an array — first match wins.
 */
export const HEADER_SYNONYMS: Record<CanonicalColumn, ReadonlyArray<string>> = {
  entry_date: [
    'data',
    'data lancamento',
    'dt lancamento',
    'dt lanc',
    'data movimento',
    'data competencia',
    'competencia',
    'data emissao',
    'data documento',
    'date',
  ],
  description: [
    'historico',
    'descricao',
    'memo',
    'observacao',
    'descricao do lancamento',
    'descricao da operacao',
    'description',
  ],
  amount: ['valor', 'montante', 'amount', 'valor lancamento', 'valor r$', 'total'],
  debit_amount: ['debito', 'debit', 'saida', 'valor debito', 'd'],
  credit_amount: ['credito', 'credit', 'entrada', 'valor credito', 'c'],
  document_number: [
    'documento',
    'nf',
    'numero documento',
    'no documento',
    'no doc',
    'doc',
    'nro nf',
    'nota fiscal',
  ],
  counterparty_name: [
    'contraparte',
    'cliente',
    'fornecedor',
    'favorecido',
    'nome',
    'razao social',
    'sacado',
  ],
  counterparty_tax_id: ['cpf', 'cnpj', 'cpf/cnpj', 'cpf cnpj', 'documento contraparte'],
  cost_center: ['centro de custo', 'centro custo', 'cc', 'cost center'],
  debit_account_code: ['conta debito', 'debito (conta)', 'cod conta debito', 'conta d'],
  credit_account_code: ['conta credito', 'credito (conta)', 'cod conta credito', 'conta c'],
  notes: ['observacao', 'obs', 'notes', 'nota'],
  ignore: [],
};

/** Strip accents, lowercase, collapse whitespace. */
export function normalizeHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
