import { BaseEntity, EntityId } from './base.entity';

export const WALLET_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
} as const;

export type WalletStatus = (typeof WALLET_STATUS)[keyof typeof WALLET_STATUS];

export interface Wallet extends BaseEntity {
  userId: EntityId;
  status: WalletStatus;
  label: string;
}
