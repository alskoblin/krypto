import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { ASSET_TYPE, EntityId } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class TonSandboxService {
  constructor(private readonly prisma: PrismaService) {}

  async simulateAssetTransfer(params: {
    walletId: EntityId;
    transactionId: EntityId;
    assetCode: string;
    amount: string;
    assetType: string;
  }) {
    if (params.assetType !== ASSET_TYPE.CRYPTO) {
      return null;
    }

    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { code: 'ton-sandbox' },
    });

    if (!network) {
      return null;
    }

    return this.prisma.blockchainTx.create({
      data: {
        networkId: network.id,
        walletId: params.walletId,
        transactionId: params.transactionId,
        hash: `sandbox-${randomUUID()}`,
        fromAddress: 'sandbox-treasury',
        toAddress: params.walletId,
        assetCode: params.assetCode,
        amount: new Prisma.Decimal(params.amount),
        status: 'confirmed',
        blockNumber: 1,
        confirmations: 1,
        confirmedAt: new Date(),
      },
    });
  }
}
