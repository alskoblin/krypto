import { BaseEntity, DecimalString, EntityId } from './base.entity';

export const TRADE_SIDE = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

export type TradeSide = (typeof TRADE_SIDE)[keyof typeof TRADE_SIDE];

export const TRADE_ORDER_STATUS = {
  NEW: 'new',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELED: 'canceled',
  REJECTED: 'rejected',
} as const;

export type TradeOrderStatus =
  (typeof TRADE_ORDER_STATUS)[keyof typeof TRADE_ORDER_STATUS];

export interface TradeOrder extends BaseEntity {
  userId: EntityId;
  walletId: EntityId;
  side: TradeSide;
  status: TradeOrderStatus;
  baseAssetCode: string;
  quoteAssetCode: string;
  requestedAmount: DecimalString;
  limitPrice: DecimalString | null;
  filledAmount: DecimalString;
  averageExecutionPrice: DecimalString | null;
}
