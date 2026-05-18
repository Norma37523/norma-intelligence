export type {
  RawRow,
  CanonicalColumn,
  ColumnMapping,
  NormalizedRow,
  CategorizedRow,
  RowIssue,
  RowIssueLevel,
} from './parsed-row';

export { HEADER_SYNONYMS, normalizeHeader } from './mapping-synonyms';
export { DEFAULT_RULES } from './categorization-rules';
export type { CategorizationRule } from './categorization-rules';
