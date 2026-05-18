/**
 * Money value object.
 *
 * Stores monetary amounts as integer **minor units** (e.g. centavos for BRL).
 * Floating-point arithmetic is forbidden anywhere in the codebase — every
 * DRE line, forecast value, and aggregation goes through this type.
 *
 * Why: `0.1 + 0.2 !== 0.3` in IEEE-754. For a financial-intelligence
 * platform that has to reconcile to the centavo, that's unacceptable.
 */
export type Currency = 'BRL' | 'USD' | 'EUR';

export class Money {
  private constructor(
    public readonly amountMinor: bigint,
    public readonly currency: Currency,
  ) {}

  /** Construct from minor units (e.g. centavos). */
  static fromMinor(amountMinor: bigint | number, currency: Currency = 'BRL'): Money {
    return new Money(typeof amountMinor === 'number' ? BigInt(Math.trunc(amountMinor)) : amountMinor, currency);
  }

  /** Construct from a major-unit decimal string, e.g. "1234.56". */
  static fromDecimalString(value: string, currency: Currency = 'BRL'): Money {
    const trimmed = value.trim();
    const match = trimmed.match(/^(-?)(\d+)(?:\.(\d{0,2}))?\d*$/);
    if (!match) {
      throw new Error(`Invalid decimal string for Money: "${value}"`);
    }
    const [, sign, whole, fracRaw = ''] = match;
    const frac = (fracRaw + '00').slice(0, 2);
    const minor = BigInt(`${sign}${whole}${frac}`);
    return new Money(minor, currency);
  }

  static zero(currency: Currency = 'BRL'): Money {
    return new Money(0n, currency);
  }

  /* ---------------------------------------------------------------------- */
  /* Arithmetic                                                              */
  /* ---------------------------------------------------------------------- */

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  /** Multiply by a unitless scalar (e.g. percentage applied as 0.15). */
  multiply(factor: number): Money {
    if (!Number.isFinite(factor)) throw new Error('Money.multiply: factor must be finite');
    // Scale to preserve precision: multiply integers, then round.
    const scale = 10_000n;
    const scaled = BigInt(Math.round(factor * Number(scale)));
    const result = (this.amountMinor * scaled + (scaled > 0n ? scale / 2n : -(scale / 2n))) / scale;
    return new Money(result, this.currency);
  }

  negate(): Money {
    return new Money(-this.amountMinor, this.currency);
  }

  /* ---------------------------------------------------------------------- */
  /* Comparison                                                              */
  /* ---------------------------------------------------------------------- */

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amountMinor === 0n;
  }

  isPositive(): boolean {
    return this.amountMinor > 0n;
  }

  isNegative(): boolean {
    return this.amountMinor < 0n;
  }

  /* ---------------------------------------------------------------------- */
  /* Serialization                                                           */
  /* ---------------------------------------------------------------------- */

  /** Returns the value as a number of *major* units. Loses precision for very large values. */
  toNumber(): number {
    return Number(this.amountMinor) / 100;
  }

  /** Stable decimal string representation, e.g. "1234.56". */
  toDecimalString(): string {
    const negative = this.amountMinor < 0n;
    const abs = negative ? -this.amountMinor : this.amountMinor;
    const whole = abs / 100n;
    const frac = (abs % 100n).toString().padStart(2, '0');
    return `${negative ? '-' : ''}${whole}.${frac}`;
  }

  /** Pretty-print with locale-aware grouping. Default pt-BR + BRL. */
  format(locale = 'pt-BR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(this.toNumber());
  }

  toJSON(): { amountMinor: string; currency: Currency } {
    return { amountMinor: this.amountMinor.toString(), currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Money currency mismatch: ${this.currency} vs ${other.currency}. Conversion must be explicit.`,
      );
    }
  }
}
