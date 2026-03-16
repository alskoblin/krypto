import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityId } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      include: {
        wallets: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getUserById(userId: EntityId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          include: {
            balances: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  async createUser(payload: CreateUserDto) {
    if (!payload.email || !payload.fullName) {
      throw new BadRequestException('email and fullName are required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        fullName: payload.fullName,
        phone: payload.phone ?? null,
        status: 'active',
      },
    });

    const wallet = await this.prisma.wallet.create({
      data: {
        userId: user.id,
        label: 'Main wallet',
        status: 'active',
      },
    });

    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { code: 'ton-sandbox' },
    });

    if (network) {
      await this.prisma.blockchainAddress.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          networkId: network.id,
          assetCode: 'TON',
          address: `sandbox-${wallet.id}`,
          isActive: true,
        },
      });
    }

    return {
      ...user,
      wallets: [wallet],
    };
  }
}
