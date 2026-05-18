import type { UserId } from '@/features/auth/domain/session';

export type OrganizationId = string;

/**
 * Organization = tenant boundary. Every business record (account, journal
 * entry, forecast, etc.) belongs to exactly one organization, and RLS
 * enforces isolation at the Postgres layer.
 */
export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly slug: string;
  /** CNPJ (BR) — optional during onboarding, required for fiscal modules. */
  readonly taxId: string | null;
  readonly ownerUserId: UserId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
