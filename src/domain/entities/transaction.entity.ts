import { BaseEntity, DecimalString, EntityId, ISODateTimeString } from './base.entity';

export const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  BUY: 'buy',
  SELL: 'sell',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  PURCHASE: 'purchase',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export type TransactionStatus =
  (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS];

export interface Transaction extends BaseEntity {
  userId: EntityId;
  walletId: EntityId;
  type: TransactionType;
  status: TransactionStatus;
  assetCode: string;
  amount: DecimalString;
  feeAmount: DecimalString;
  netAmount: DecimalString;
  description: string | null;
  blockchainTxId: EntityId | null;
  completedAt: ISODateTimeString | null;
}
