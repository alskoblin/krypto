import { BadRequestException, Injectable } from '@nestjs/common';
import { ASSET_TYPE, BLOCKCHAIN_NETWORK_KIND } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  getAssets() {
    return this.prisma.asset.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createAsset(payload: CreateAssetDto) {
    if (!payload.code || !payload.name || !payload.type) {
      throw new BadRequestException('code, name and type are required');
    }

    if (payload.precision === undefined || payload.precision === null) {
      throw new BadRequestException('precision is required');
    }

    const normalizedType = payload.type.toLowerCase();
    if (normalizedType !== ASSET_TYPE.FIAT && normalizedType !== ASSET_TYPE.CRYPTO) {
      throw new BadRequestException('type must be fiat or crypto');
    }

    const existingAsset = await this.prisma.asset.findUnique({
      where: { code: payload.code },
    });

    if (existingAsset) {
      throw new BadRequestException('Asset with this code already exists');
    }

    let networkId: string | null = null;
    if (normalizedType === ASSET_TYPE.CRYPTO) {
      const network = await this.prisma.blockchainNetwork.upsert({
        where: { code: 'ton-sandbox' },
        update: {
          isActive: true,
        },
        create: {
          code: 'ton-sandbox',
          name: 'TON Sandbox',
          kind: BLOCKCHAIN_NETWORK_KIND.TON,
          chainId: 'sandbox',
          rpcUrl: null,
          explorerUrl: null,
          isTestnet: true,
          isActive: true,
        },
      });
      networkId = network.id;
    }

    return this.prisma.asset.create({
      data: {
        code: payload.code,
        name: payload.name,
        type: normalizedType,
        precision: Number(payload.precision),
        isActive: true,
        networkId,
      },
    });
  }
}
