import { Injectable } from '@nestjs/common';
import { PrismaService } from './infrastructure/database/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const user = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { wallets: true },
    });
    const wallet = user?.wallets[0] ?? null;

    return {
      message: 'Krypto backend is running',
      sampleUserId: user?.id ?? null,
      sampleWalletId: wallet?.id ?? null,
      routes: [
        'GET /assets',
        'POST /assets',
        'POST /auth/login',
        'POST /auth/refresh',
        'GET /auth/me',
        'GET /users',
        'POST /users',
        'GET /users/:userId',
        'PATCH /users/:userId',
        'GET /users/:userId/cards',
        'POST /users/:userId/cards',
        'GET /users/:userId/cards/:cardId',
        'PATCH /users/:userId/cards/:cardId',
        'DELETE /users/:userId/cards/:cardId',
        'GET /users/:userId/finance/summary',
        'PUT /users/:userId/budgets/monthly',
        'GET /users/:userId/budgets/monthly',
        'POST /users/:userId/crypto-wallets',
        'GET /users/:userId/transactions',
        'GET /wallets/:walletId/balances',
        'GET /wallets/:walletId/balances/crypto',
        'POST /wallets/:walletId/deposit',
        'POST /wallets/:walletId/fiat/deposits/mock',
        'POST /wallets/:walletId/purchases/mock',
        'POST /wallets/:walletId/transfers/mock',
        'GET /rates',
        'GET /rates/charts',
        'POST /rates',
        'POST /trading/buy',
        'POST /trading/sell',
        'GET /blockchain/networks',
        'POST /graphql',
      ],
    };
  }
}
