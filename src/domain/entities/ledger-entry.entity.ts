import { BaseEntity, DecimalString, EntityId } from './base.entity';

export const LEDGER_ENTRY_TYPE = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  LOCK: 'lock',
  UNLOCK: 'unlock',
} as const;

export type LedgerEntryType =
  (typeof LEDGER_ENTRY_TYPE)[keyof typeof LEDGER_ENTRY_TYPE];

export interface LedgerEntry extends BaseEntity {
  transactionId: EntityId;
  walletId: EntityId;
  assetCode: string;
  entryType: LedgerEntryType;
  amount: DecimalString;
  balanceBefore: DecimalString;
  balanceAfter: DecimalString;
}
