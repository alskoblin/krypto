import { BaseEntity, DecimalString, EntityId, ISODateTimeString } from './base.entity';

export const BLOCKCHAIN_TX_STATUS = {
  CREATED: 'created',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const;

export type BlockchainTxStatus =
  (typeof BLOCKCHAIN_TX_STATUS)[keyof typeof BLOCKCHAIN_TX_STATUS];

export interface BlockchainTx extends BaseEntity {
  networkId: EntityId;
  walletId: EntityId;
  transactionId: EntityId | null;
  hash: string;
  fromAddress: string;
  toAddress: string;
  assetCode: string;
  amount: DecimalString;
  status: BlockchainTxStatus;
  blockNumber: number | null;
  confirmations: number;
  confirmedAt: ISODateTimeString | null;
}
