import { BaseEntity } from './base.entity';

export const BLOCKCHAIN_NETWORK_KIND = {
  TON: 'ton',
} as const;

export type BlockchainNetworkKind =
  (typeof BLOCKCHAIN_NETWORK_KIND)[keyof typeof BLOCKCHAIN_NETWORK_KIND];

export interface BlockchainNetwork extends BaseEntity {
  code: string;
  name: string;
  kind: BlockchainNetworkKind;
  chainId: string | null;
  rpcUrl: string | null;
  explorerUrl: string | null;
  isTestnet: boolean;
  isActive: boolean;
}
