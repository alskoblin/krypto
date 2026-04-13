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
import { MockFiatDepositDto } from './dto/mock-fiat-deposit.dto';
import { MockPurchaseDto } from './dto/mock-purchase.dto';
import { MockTransferOutDto } from './dto/mock-transfer-out.dto';

const EXPENSE_TRANSACTION_TYPES = [
  TRANSACTION_TYPE.WITHDRAWAL,
  TRANSACTION_TYPE.BUY,
  TRANSACTION_TYPE.TRANSFER_OUT,
  TRANSACTION_TYPE.PURCHASE,
] as const;

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

  async getCryptoBalances(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    return this.prisma.balance.findMany({
      where: {
        walletId,
        assetType: ASSET_TYPE.CRYPTO,
      },
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
    const assetType =
      currentBalance?.assetType ??
      asset?.type ??
      (payload.assetCode.toUpperCase() === 'TON' ? ASSET_TYPE.CRYPTO : ASSET_TYPE.FIAT);

    if (asset && asset.type !== assetType) {
      throw new BadRequestException(
        `Asset ${payload.assetCode} has type ${asset.type}, but balance expects ${assetType}`,
      );
    }

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

    const linkedAddress = await this.prisma.blockchainAddress.findFirst({
      where: {
        walletId,
        isActive: true,
        network: {
          code: 'ton-sandbox',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const blockchainTx = await this.tonSandboxService.simulateAssetTransfer({
      address: linkedAddress?.address ?? '',
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

  async mockFiatDeposit(walletId: string, payload: MockFiatDepositDto) {
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

    const provider = payload.provider ?? 'mock-payments';
    const paymentId = payload.providerPaymentId ?? this.buildMockPaymentId();
    const now = new Date();

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

    if (asset && asset.type !== ASSET_TYPE.FIAT) {
      throw new BadRequestException(
        `Asset ${payload.assetCode} has type ${asset.type}. Mock fiat deposit supports only fiat assets.`,
      );
    }

    const balanceBefore = Number(currentBalance?.availableAmount ?? '0');
    const lockedAmount = Number(currentBalance?.lockedAmount ?? '0');
    const balanceAfter = balanceBefore + amount;

    if (!asset) {
      await this.prisma.asset.create({
        data: {
          code: payload.assetCode,
          name: payload.assetCode,
          type: ASSET_TYPE.FIAT,
          precision: 2,
          isActive: true,
        },
      });
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: payload.userId,
        walletId,
        type: TRANSACTION_TYPE.DEPOSIT,
        status: TRANSACTION_STATUS.COMPLETED,
        assetCode: payload.assetCode,
        amount: new Prisma.Decimal(payload.amount),
        feeAmount: new Prisma.Decimal(0),
        netAmount: new Prisma.Decimal(payload.amount),
        reference: `${provider}:${paymentId}`,
        description: payload.description ?? `Fiat deposit via ${provider}`,
        blockchainTxId: null,
        completedAt: now,
      },
    });

    await this.prisma.balance.upsert({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode: payload.assetCode,
        },
      },
      update: {
        assetType: ASSET_TYPE.FIAT,
        availableAmount: new Prisma.Decimal(balanceAfter),
        totalAmount: new Prisma.Decimal(balanceAfter + lockedAmount),
      },
      create: {
        walletId,
        assetCode: payload.assetCode,
        assetType: ASSET_TYPE.FIAT,
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

    return {
      provider,
      providerPaymentId: paymentId,
      providerStatus: 'succeeded',
      transactionId: transaction.id,
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

  async mockPurchase(walletId: string, payload: MockPurchaseDto) {
    const amount = this.parsePositiveDecimal(payload.amount, 'amount');
    const quantity = this.parseQuantity(payload.quantity);

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    if (wallet.userId !== payload.userId) {
      throw new BadRequestException('Wallet does not belong to the provided user');
    }

    const assetCode = payload.assetCode?.trim().toUpperCase();
    if (!assetCode) {
      throw new BadRequestException('assetCode is required');
    }

    const itemName = payload.itemName?.trim();
    if (!itemName) {
      throw new BadRequestException('itemName is required');
    }

    const category = payload.category?.trim() || null;
    const merchantName = payload.merchantName?.trim() || null;
    const description =
      payload.description?.trim() ||
      `Purchase: ${itemName}${merchantName ? ` at ${merchantName}` : ''}${
        category ? ` [${category}]` : ''
      }`;

    const asset = await this.prisma.asset.findUnique({
      where: { code: assetCode },
    });

    if (asset && asset.type !== ASSET_TYPE.FIAT) {
      throw new BadRequestException(
        `Asset ${assetCode} has type ${asset.type}. Mock purchase supports only fiat assets.`,
      );
    }

    if (!asset) {
      await this.prisma.asset.create({
        data: {
          code: assetCode,
          name: assetCode,
          type: ASSET_TYPE.FIAT,
          precision: 2,
          isActive: true,
        },
      });
    }

    const currentBalance = await this.prisma.balance.findUnique({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode,
        },
      },
    });

    const balanceBefore = new Prisma.Decimal(currentBalance?.availableAmount ?? 0);
    if (balanceBefore.lt(amount)) {
      throw new BadRequestException('Insufficient balance for mock purchase');
    }

    const now = new Date();
    const budgetBefore = await this.getMonthlyBudgetStatusForDate(
      payload.userId,
      assetCode,
      now,
    );

    if (
      budgetBefore.hasBudget &&
      budgetBefore.limitAmount !== null &&
      budgetBefore.remainingAmount !== null
    ) {
      const remainingBefore = new Prisma.Decimal(budgetBefore.remainingAmount);
      if (remainingBefore.lt(amount) && !payload.allowOverBudget) {
        throw new BadRequestException(
          `Monthly budget exceeded for ${assetCode}. Remaining: ${remainingBefore.toString()}, required: ${amount.toString()}`,
        );
      }
    }

    const purchaseId = this.buildMockPurchaseId();
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: payload.userId,
        walletId,
        type: TRANSACTION_TYPE.PURCHASE,
        status: TRANSACTION_STATUS.COMPLETED,
        assetCode,
        amount,
        feeAmount: new Prisma.Decimal(0),
        netAmount: amount,
        reference: `mock-purchase:${purchaseId}`,
        description,
        blockchainTxId: null,
        completedAt: now,
      },
    });

    const lockedAmount = new Prisma.Decimal(currentBalance?.lockedAmount ?? 0);
    const balanceAfter = balanceBefore.minus(amount);

    await this.prisma.balance.upsert({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode,
        },
      },
      update: {
        assetType: ASSET_TYPE.FIAT,
        availableAmount: balanceAfter,
        totalAmount: balanceAfter.plus(lockedAmount),
      },
      create: {
        walletId,
        assetCode,
        assetType: ASSET_TYPE.FIAT,
        availableAmount: balanceAfter,
        lockedAmount,
        totalAmount: balanceAfter.plus(lockedAmount),
      },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        walletId,
        assetCode,
        entryType: 'debit',
        amount,
        balanceBefore,
        balanceAfter,
      },
    });

    const budgetAfter = await this.getMonthlyBudgetStatusForDate(
      payload.userId,
      assetCode,
      now,
    );

    return {
      purchaseId,
      transactionId: transaction.id,
      purchase: {
        itemName,
        category,
        merchantName,
        quantity,
        unitPrice: amount.div(quantity).toString(),
        totalAmount: amount.toString(),
        assetCode,
        description,
      },
      balance: await this.prisma.balance.findUnique({
        where: {
          walletId_assetCode: {
            walletId,
            assetCode,
          },
        },
      }),
      budget: budgetAfter,
      ledgerEntries: await this.prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
      }),
    };
  }

  async mockTransferOut(walletId: string, payload: MockTransferOutDto) {
    const amount = this.parsePositiveDecimal(payload.amount, 'amount');

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    if (wallet.userId !== payload.userId) {
      throw new BadRequestException('Wallet does not belong to the provided user');
    }

    const assetCode = payload.assetCode?.trim().toUpperCase();
    if (!assetCode) {
      throw new BadRequestException('assetCode is required');
    }

    const recipient = payload.recipient?.trim() || null;

    const currentBalance = await this.prisma.balance.findUnique({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode,
        },
      },
    });

    const asset = await this.prisma.asset.findUnique({
      where: { code: assetCode },
    });

    const assetType =
      currentBalance?.assetType ??
      asset?.type ??
      (assetCode === 'TON' ? ASSET_TYPE.CRYPTO : ASSET_TYPE.FIAT);

    if (asset && asset.type !== assetType) {
      throw new BadRequestException(
        `Asset ${assetCode} has type ${asset.type}, but transfer expects ${assetType}`,
      );
    }

    const balanceBefore = new Prisma.Decimal(currentBalance?.availableAmount ?? 0);
    if (balanceBefore.lt(amount)) {
      throw new BadRequestException('Insufficient balance for transfer');
    }

    if (!asset) {
      await this.prisma.asset.create({
        data: {
          code: assetCode,
          name: assetCode,
          type: assetType,
          precision: assetType === ASSET_TYPE.FIAT ? 2 : 8,
          isActive: true,
        },
      });
    }

    const transferId = this.buildMockTransferId();
    const description =
      payload.description?.trim() ||
      `Transfer to ${recipient ?? 'external recipient'}`;

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: payload.userId,
        walletId,
        type: TRANSACTION_TYPE.TRANSFER_OUT,
        status: TRANSACTION_STATUS.PROCESSING,
        assetCode,
        amount,
        feeAmount: new Prisma.Decimal(0),
        netAmount: amount,
        reference: `mock-transfer:${transferId}`,
        description,
        blockchainTxId: null,
        completedAt: null,
      },
    });

    const linkedAddress = await this.prisma.blockchainAddress.findFirst({
      where: {
        walletId,
        isActive: true,
        network: {
          code: 'ton-sandbox',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const blockchainTx = await this.tonSandboxService.simulateAssetTransfer({
      address: linkedAddress?.address ?? '',
      transactionId: transaction.id,
      assetCode,
      amount: amount.toString(),
      assetType,
      direction: 'outbound',
    });

    const lockedAmount = new Prisma.Decimal(currentBalance?.lockedAmount ?? 0);
    const balanceAfter = balanceBefore.minus(amount);

    await this.prisma.balance.upsert({
      where: {
        walletId_assetCode: {
          walletId,
          assetCode,
        },
      },
      update: {
        assetType,
        availableAmount: balanceAfter,
        totalAmount: balanceAfter.plus(lockedAmount),
      },
      create: {
        walletId,
        assetCode,
        assetType,
        availableAmount: balanceAfter,
        lockedAmount,
        totalAmount: balanceAfter.plus(lockedAmount),
      },
    });

    await this.prisma.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        walletId,
        assetCode,
        entryType: 'debit',
        amount,
        balanceBefore,
        balanceAfter,
      },
    });

    const completedAt = new Date();
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TRANSACTION_STATUS.COMPLETED,
        blockchainTxId: blockchainTx?.id ?? null,
        completedAt,
      },
    });

    return {
      transferId,
      transactionId: transaction.id,
      recipient,
      assetCode,
      amount: amount.toString(),
      status: TRANSACTION_STATUS.COMPLETED,
      completedAt: completedAt.toISOString(),
      blockchainTx,
      balance: await this.prisma.balance.findUnique({
        where: {
          walletId_assetCode: {
            walletId,
            assetCode,
          },
        },
      }),
      ledgerEntries: await this.prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
      }),
    };
  }

  private buildMockPaymentId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `mock_${Date.now()}_${random}`;
  }

  private buildMockPurchaseId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `purchase_${Date.now()}_${random}`;
  }

  private buildMockTransferId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `transfer_${Date.now()}_${random}`;
  }

  private parsePositiveDecimal(value: string, fieldName: string) {
    try {
      const decimal = new Prisma.Decimal(value);
      if (decimal.lte(0)) {
        throw new BadRequestException(`${fieldName} must be greater than zero`);
      }
      return decimal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${fieldName} must be a valid decimal string`);
    }
  }

  private parseQuantity(quantity?: number) {
    if (quantity === undefined) {
      return 1;
    }

    const parsed = Number(quantity);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('quantity must be a positive integer');
    }
    return parsed;
  }

  private async getMonthlyBudgetStatusForDate(
    userId: string,
    assetCode: string,
    at: Date,
  ) {
    const year = at.getUTCFullYear();
    const month = at.getUTCMonth() + 1;
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const [budget, expensesAgg] = await Promise.all([
      this.prisma.monthlyBudget.findUnique({
        where: {
          userId_assetCode_year_month: {
            userId,
            assetCode,
            year,
            month,
          },
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          status: TRANSACTION_STATUS.COMPLETED,
          assetCode,
          type: {
            in: [...EXPENSE_TRANSACTION_TYPES],
          },
          completedAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          netAmount: true,
        },
      }),
    ]);

    const spentAmount = new Prisma.Decimal(expensesAgg._sum.netAmount ?? 0);
    const limitAmount = budget ? new Prisma.Decimal(budget.limitAmount) : null;
    const remainingAmount = limitAmount ? limitAmount.minus(spentAmount) : null;

    return {
      userId,
      assetCode,
      year,
      month,
      hasBudget: Boolean(budget),
      budgetId: budget?.id ?? null,
      limitAmount: limitAmount?.toString() ?? null,
      spentAmount: spentAmount.toString(),
      remainingAmount: remainingAmount?.toString() ?? null,
      isExceeded: limitAmount ? spentAmount.gt(limitAmount) : false,
      utilizationPercent:
        limitAmount && !limitAmount.eq(0)
          ? Number(spentAmount.div(limitAmount).mul(100).toFixed(2))
          : null,
    };
  }
}
