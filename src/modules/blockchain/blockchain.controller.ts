import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('networks')
  getNetworks() {
    return this.prisma.blockchainNetwork.findMany({
      where: { code: 'ton-sandbox' },
      orderBy: { createdAt: 'asc' },
    });
  }
}
