import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { USER_ROLE } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  ensureSelfOrAdmin(currentUser: AuthenticatedUser | undefined, userId: string) {
    if (!currentUser) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (currentUser.role === USER_ROLE.ADMIN) {
      return;
    }

    if (currentUser.id !== userId) {
      throw new ForbiddenException('You have access only to your own data');
    }
  }

  async ensureWalletAccess(currentUser: AuthenticatedUser | undefined, walletId: string) {
    if (!currentUser) {
      throw new ForbiddenException('User is not authenticated');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }

    if (currentUser.role === USER_ROLE.ADMIN) {
      return wallet;
    }

    if (wallet.userId !== currentUser.id) {
      throw new ForbiddenException('You have access only to your own wallet');
    }

    return wallet;
  }
}
