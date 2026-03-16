import { BaseEntity, DecimalString, EntityId } from './base.entity';

export interface TradeExecution extends BaseEntity {
  orderId: EntityId;
  baseAssetCode: string;
  quoteAssetCode: string;
  executedAmount: DecimalString;
  executedPrice: DecimalString;
  quoteTotal: DecimalString;
  feeAmount: DecimalString;
  buyTransactionId: EntityId | null;
  sellTransactionId: EntityId | null;
}
