import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ASSET_TYPE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TonSandboxService } from '../blockchain/ton-sandbox.service';
import { DepositDto } from './dto/deposit.dto';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tonSandboxService: TonSandboxService,
  ) {}

  async getWalletBalances(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    return this.prisma.balance.findMany({
      where: { walletId },
      orderBy: { assetCode: 'asc' },
    });
  }

  async deposit(walletId: string, payload: DepositDto) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    if (wallet.userId !== payload.userId) {
      throw new BadRequestException('Wallet does not belong to the provided user');
    }

    const currentBalance = await this.prisma.balance.findUnique({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode: payload.assetCode,
        },
      },
    });

    const asset = await this.prisma.asset.findUnique({
      where: { code: payload.assetCode },
    });

    const now = new Date();
    const assetType = currentBalance?.assetType ?? ASSET_TYPE.FIAT;
    const balanceBefore = Number(currentBalance?.availableAmount ?? '0');
    const balanceAfter = balanceBefore + amount;
    const lockedAmount = Number(currentBalance?.lockedAmount ?? '0');

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: payload.userId,
        walletId,
        type: TRANSACTION_TYPE.DEPOSIT,
        status: TRANSACTION_STATUS.PROCESSING,
        assetCode: payload.assetCode,
        amount: new Prisma.Decimal(payload.amount),
        feeAmount: new Prisma.Decimal(0),
        netAmount: new Prisma.Decimal(payload.amount),
        reference: payload.reference ?? null,
        description: payload.description ?? 'Wallet deposit',
        blockchainTxId: null,
        completedAt: null,
      },
    });

    const blockchainTx = await this.tonSandboxService.simulateAssetTransfer({
      walletId,
      transactionId: transaction.id,
      assetCode: payload.assetCode,
      amount: payload.amount,
      assetType,
    });

    if (!asset) {
      await this.prisma.asset.create({
        data: {
          code: payload.assetCode,
          name: payload.assetCode,
          type: assetType,
          precision: assetType === ASSET_TYPE.FIAT ? 2 : 8,
          isActive: true,
        },
      });
    }

    await this.prisma.balance.upsert({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode: payload.assetCode,
        },
      },
      update: {
        assetType,
        availableAmount: new Prisma.Decimal(balanceAfter),
        totalAmount: new Prisma.Decimal(balanceAfter + lockedAmount),
      },
      create: {
        walletId,
        assetCode: payload.assetCode,
        assetType,
        availableAmount: new Prisma.Decimal(balanceAfter),
        lockedAmount: new Prisma.Decimal(lockedAmount),
        totalAmount: new Prisma.Decimal(balanceAfter + lockedAmount),
      },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        walletId,
        assetCode: payload.assetCode,
        entryType: 'credit',
        amount: new Prisma.Decimal(payload.amount),
        balanceBefore: new Prisma.Decimal(balanceBefore),
        balanceAfter: new Prisma.Decimal(balanceAfter),
      },
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TRANSACTION_STATUS.COMPLETED,
        blockchainTxId: blockchainTx?.id ?? null,
        completedAt: now,
      },
    });

    return {
      transactionId: transaction.id,
      blockchainTx,
      balance: await this.prisma.balance.findUnique({
        where: {
          walletId_assetCode: {
            walletId,
            assetCode: payload.assetCode,
          },
        },
      }),
      ledgerEntries: await this.prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
      }),
    };
  }
}
