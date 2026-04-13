import { BaseEntity, EntityId } from './base.entity';

export const BANK_CARD_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  EXPIRED: 'expired',
  DELETED: 'deleted',
} as const;

export type BankCardStatus = (typeof BANK_CARD_STATUS)[keyof typeof BANK_CARD_STATUS];

export interface BankCard extends BaseEntity {
  userId: EntityId;
  token: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string | null;
  status: BankCardStatus;
  isDefault: boolean;
}
