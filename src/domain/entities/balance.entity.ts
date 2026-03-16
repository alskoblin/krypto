import { AssetType } from './asset.entity';
import { BaseEntity, EntityId, DecimalString } from './base.entity';

export interface Balance extends BaseEntity {
  walletId: EntityId;
  assetCode: string;
  assetType: AssetType;
  availableAmount: DecimalString;
  lockedAmount: DecimalString;
  totalAmount: DecimalString;
}
