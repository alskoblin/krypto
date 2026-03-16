import { EntityId } from './base.entity';

export const ASSET_TYPE = {
  FIAT: 'fiat',
  CRYPTO: 'crypto',
} as const;

export type AssetType = (typeof ASSET_TYPE)[keyof typeof ASSET_TYPE];

export interface Asset {
  code: string;
  name: string;
  type: AssetType;
  precision: number;
  isActive: boolean;
  networkId: EntityId | null;
}
