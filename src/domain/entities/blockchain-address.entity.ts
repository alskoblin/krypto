import { BaseEntity, EntityId } from './base.entity';

export interface BlockchainAddress extends BaseEntity {
  userId: EntityId;
  walletId: EntityId;
  networkId: EntityId;
  assetCode: string | null;
  address: string;
  publicKey: string | null;
  isActive: boolean;
}
