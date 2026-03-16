import { BaseEntity, DecimalString, ISODateTimeString } from './base.entity';

export interface ExchangeRate extends BaseEntity {
  baseAssetCode: string;
  quoteAssetCode: string;
  rate: DecimalString;
  source: string;
  capturedAt: ISODateTimeString;
}
