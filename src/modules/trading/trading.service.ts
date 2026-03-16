import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Balance, Prisma } from '@prisma/client';
import {
  ASSET_TYPE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  TRADE_ORDER_STATUS,
  TRADE_SIDE,
} from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TonSandboxService } from '../blockchain/ton-sandbox.service';
import { TradeDto } from './dto/trade.dto';

@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tonSandboxService: TonSandboxService,
  ) {}

  buy(payload: TradeDto) {
    return this.executeTrade(payload, TRADE_SIDE.BUY);
  }

  sell(payload: TradeDto) {
    return this.executeTrade(payload, TRADE_SIDE.SELL);
  }

  private async executeTrade(payload: TradeDto, side: 'buy' | 'sell') {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: payload.walletId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${payload.walletId} not found`);
    }

    if (wallet.userId !== payload.userId) {
      throw new BadRequestException('Wallet does not belong to the provided user');
    }

    const rate = await this.prisma.exchangeRate.findUnique({
      where: {
        baseAssetCode_quoteAssetCode: {
          baseAssetCode: payload.baseAssetCode,
          quoteAssetCode: payload.quoteAssetCode,
        },
      },
    });

    if (!rate) {
      throw new NotFoundException(
        `Exchange rate ${payload.baseAssetCode}/${payload.quoteAssetCode} not found`,
      );
    }

    const price = Number(rate.rate);
    const quoteDelta = amount * price;
    const now = new Date();

    let baseBalance = await this.prisma.balance.findUnique({
      where: {
        walletId_assetCode: {
          walletId: payload.walletId,
          assetCode: payload.baseAssetCode,
        },
      },
    });

    if (!baseBalance) {
      await this.createAssetIfMissing(payload.baseAssetCode, ASSET_TYPE.CRYPTO);
      baseBalance = await this.prisma.balance.create({
        data: {
          walletId: payload.walletId,
          assetCode: payload.baseAssetCode,
          assetType: ASSET_TYPE.CRYPTO,
          availableAmount: new Prisma.Decimal(0),
          lockedAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(0),
        },
      });
    }

    let quoteBalance = await this.prisma.balance.findUnique({
      where: {
        walletId_assetCode: {
          walletId: payload.walletId,
          assetCode: payload.quoteAssetCode,
        },
      },
    });

    if (!quoteBalance) {
      await this.createAssetIfMissing(payload.quoteAssetCode, ASSET_TYPE.FIAT);
      quoteBalance = await this.prisma.balance.create({
        data: {
          walletId: payload.walletId,
          assetCode: payload.quoteAssetCode,
          assetType: ASSET_TYPE.FIAT,
          availableAmount: new Prisma.Decimal(0),
          lockedAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(0),
        },
      });
    }

    const order = await this.prisma.tradeOrder.create({
      data: {
        userId: payload.userId,
        walletId: payload.walletId,
        side,
        status: TRADE_ORDER_STATUS.NEW,
        baseAssetCode: payload.baseAssetCode,
        quoteAssetCode: payload.quoteAssetCode,
        requestedAmount: new Prisma.Decimal(payload.amount),
        limitPrice: new Prisma.Decimal(rate.rate),
        filledAmount: new Prisma.Decimal(0),
        averageExecutionPrice: null,
      },
    });

    if (side === TRADE_SIDE.BUY && Number(quoteBalance.availableAmount) < quoteDelta) {
      throw new BadRequestException('Insufficient quote asset balance');
    }

    if (side === TRADE_SIDE.SELL && Number(baseBalance.availableAmount) < amount) {
      throw new BadRequestException('Insufficient base asset balance');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId: payload.userId,
        walletId: payload.walletId,
        type: side === TRADE_SIDE.BUY ? TRANSACTION_TYPE.BUY : TRANSACTION_TYPE.SELL,
        status: TRANSACTION_STATUS.PROCESSING,
        assetCode: payload.baseAssetCode,
        amount: new Prisma.Decimal(payload.amount),
        feeAmount: new Prisma.Decimal(0),
        netAmount: new Prisma.Decimal(payload.amount),
        reference: order.id,
        description:
          side === TRADE_SIDE.BUY
            ? `Buy ${payload.baseAssetCode} with ${payload.quoteAssetCode}`
            : `Sell ${payload.baseAssetCode} for ${payload.quoteAssetCode}`,
        blockchainTxId: null,
        completedAt: null,
      },
    });

    const blockchainTx = await this.tonSandboxService.simulateAssetTransfer({
      walletId: payload.walletId,
      transactionId: transaction.id,
      assetCode: payload.baseAssetCode,
      amount: payload.amount,
      assetType: ASSET_TYPE.CRYPTO,
    });

    if (side === TRADE_SIDE.BUY) {
      await this.updateBalance(quoteBalance, -quoteDelta);
      await this.updateBalance(baseBalance, amount);

      await this.addLedgerEntry(
        transaction.id,
        payload.walletId,
        payload.quoteAssetCode,
        quoteDelta,
        Number(quoteBalance.availableAmount) + quoteDelta,
        Number(quoteBalance.availableAmount),
      );

      await this.addLedgerEntry(
        transaction.id,
        payload.walletId,
        payload.baseAssetCode,
        amount,
        Number(baseBalance.availableAmount) - amount,
        Number(baseBalance.availableAmount),
        true,
      );
    } else {
      await this.updateBalance(baseBalance, -amount);
      await this.updateBalance(quoteBalance, quoteDelta);

      await this.addLedgerEntry(
        transaction.id,
        payload.walletId,
        payload.baseAssetCode,
        amount,
        Number(baseBalance.availableAmount) + amount,
        Number(baseBalance.availableAmount),
      );

      await this.addLedgerEntry(
        transaction.id,
        payload.walletId,
        payload.quoteAssetCode,
        quoteDelta,
        Number(quoteBalance.availableAmount) - quoteDelta,
        Number(quoteBalance.availableAmount),
        true,
      );
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TRANSACTION_STATUS.COMPLETED,
        blockchainTxId: blockchainTx?.id ?? null,
        completedAt: now,
      },
    });

    const execution = await this.prisma.tradeExecution.create({
      data: {
        orderId: order.id,
        baseAssetCode: payload.baseAssetCode,
        quoteAssetCode: payload.quoteAssetCode,
        executedAmount: new Prisma.Decimal(payload.amount),
        executedPrice: new Prisma.Decimal(rate.rate),
        quoteTotal: new Prisma.Decimal(quoteDelta),
        feeAmount: new Prisma.Decimal(0),
        buyTransactionId: side === TRADE_SIDE.BUY ? transaction.id : null,
        sellTransactionId: side === TRADE_SIDE.SELL ? transaction.id : null,
      },
    });

    const updatedOrder = await this.prisma.tradeOrder.update({
      where: { id: order.id },
      data: {
        status: TRADE_ORDER_STATUS.FILLED,
        filledAmount: new Prisma.Decimal(payload.amount),
        averageExecutionPrice: new Prisma.Decimal(rate.rate),
      },
    });

    return {
      order: updatedOrder,
      execution,
      transactionId: transaction.id,
      blockchainTx,
      balances: await this.prisma.balance.findMany({
        where: { walletId: payload.walletId },
        orderBy: { assetCode: 'asc' },
      }),
    };
  }

  private async createAssetIfMissing(assetCode: string, assetType: string) {
    const asset = await this.prisma.asset.findUnique({ where: { code: assetCode } });
    if (asset) {
      return;
    }

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

  private async updateBalance(balance: Balance, delta: number) {
    const nextAvailable = Number(balance.availableAmount) + delta;
    const lockedAmount = Number(balance.lockedAmount);

    await this.prisma.balance.update({
      where: { id: balance.id },
      data: {
        availableAmount: new Prisma.Decimal(nextAvailable),
        totalAmount: new Prisma.Decimal(nextAvailable + lockedAmount),
      },
    });
  }

  private async addLedgerEntry(
    transactionId: string,
    walletId: string,
    assetCode: string,
    amount: number,
    before: number,
    after: number,
    isCredit = false,
  ) {
    return this.prisma.ledgerEntry.create({
      data: {
        transactionId,
        walletId,
        assetCode,
        entryType: isCredit ? 'credit' : 'debit',
        amount: new Prisma.Decimal(amount),
        balanceBefore: new Prisma.Decimal(before),
        balanceAfter: new Prisma.Decimal(after),
      },
    });
  }
}
