import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('networks')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить блокчейн-сети',
    description: 'Возвращает доступную в приложении сеть TON Sandbox.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список блокчейн-сетей успешно получен.',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT-токен отсутствует или недействителен.',
  })
  getNetworks() {
    return this.prisma.blockchainNetwork.findMany({
      where: { code: 'ton-sandbox' },
      orderBy: { createdAt: 'asc' },
    });
  }
}
