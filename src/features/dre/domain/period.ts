/**
 * Period value object — represents a calendar month (the atomic DRE unit).
 *
 * Internally stored as a string "YYYY-MM"; helpers below produce ISO-8601
 * dates for the period bounds (first day inclusive, last day inclusive).
 */
export class Period {
  private constructor(public readonly year: number, public readonly month: number) {}

  static fromString(s: string): Period {
    const m = s.match(/^(\d{4})-(\d{2})$/);
    if (!m) throw new Error(`Invalid period string: "${s}". Expected "YYYY-MM".`);
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (mo < 1 || mo > 12) throw new Error(`Invalid month: ${mo}`);
    return new Period(y, mo);
  }

  static fromDate(d: Date): Period {
    return new Period(d.getUTCFullYear(), d.getUTCMonth() + 1);
  }

  static current(): Period {
    const now = new Date();
    return new Period(now.getUTCFullYear(), now.getUTCMonth() + 1);
  }

  /** First day of the month, ISO format (YYYY-MM-DD). */
  startDate(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}-01`;
  }

  /** Last day of the month, ISO format. */
  endDate(): string {
    const last = new Date(Date.UTC(this.year, this.month, 0)).getUTCDate();
    return `${this.year}-${String(this.month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  /** Period N months before/after this one. */
  shift(months: number): Period {
    const idx = (this.year * 12 + (this.month - 1)) + months;
    return new Period(Math.floor(idx / 12), (idx % 12) + 1);
  }

  /** Pretty label in PT-BR ("Jan/2026"). */
  label(): string {
    const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${names[this.month - 1]}/${this.year}`;
  }

  equals(other: Period): boolean {
    return this.year === other.year && this.month === other.month;
  }
}

/** Range of consecutive periods, oldest → newest. */
export function periodRange(end: Period, monthsBack: number): Period[] {
  const out: Period[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) out.push(end.shift(-i));
  return out;
}
