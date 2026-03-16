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
        'GET /users',
        'GET /users/:userId',
        'GET /users/:userId/transactions',
        'GET /wallets/:walletId/balances',
        'POST /wallets/:walletId/deposit',
        'POST /trading/buy',
        'POST /trading/sell',
        'GET /blockchain/networks',
      ],
    };
  }
}
