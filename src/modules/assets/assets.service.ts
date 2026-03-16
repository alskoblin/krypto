import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  getAssets() {
    return this.prisma.asset.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createAsset(payload: CreateAssetDto) {
    if (!payload.code || !payload.name || !payload.type) {
      throw new BadRequestException('code, name and type are required');
    }

    if (payload.precision === undefined || payload.precision === null) {
      throw new BadRequestException('precision is required');
    }

    const existingAsset = await this.prisma.asset.findUnique({
      where: { code: payload.code },
    });

    if (existingAsset) {
      throw new BadRequestException('Asset with this code already exists');
    }

    return this.prisma.asset.create({
      data: {
        code: payload.code,
        name: payload.name,
        type: payload.type,
        precision: Number(payload.precision),
        isActive: true,
        networkId: payload.networkId ?? null,
      },
    });
  }
}
