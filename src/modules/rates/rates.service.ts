import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateRateDto } from './dto/create-rate.dto';

@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  getRates() {
    return this.prisma.exchangeRate.findMany({
      orderBy: [
        { baseAssetCode: 'asc' },
        { quoteAssetCode: 'asc' },
      ],
    });
  }

  async createRate(payload: CreateRateDto) {
    if (!payload.baseAssetCode || !payload.quoteAssetCode || !payload.rate) {
      throw new BadRequestException(
        'baseAssetCode, quoteAssetCode and rate are required',
      );
    }

    const rateNumber = Number(payload.rate);
    if (!Number.isFinite(rateNumber) || rateNumber <= 0) {
      throw new BadRequestException('rate must be greater than zero');
    }

    const baseAsset = await this.prisma.asset.findUnique({
      where: { code: payload.baseAssetCode },
    });

    const quoteAsset = await this.prisma.asset.findUnique({
      where: { code: payload.quoteAssetCode },
    });

    if (!baseAsset || !quoteAsset) {
      throw new BadRequestException('Both assets must exist before creating a rate');
    }

    return this.prisma.exchangeRate.upsert({
      where: {
        baseAssetCode_quoteAssetCode: {
          baseAssetCode: payload.baseAssetCode,
          quoteAssetCode: payload.quoteAssetCode,
        },
      },
      update: {
        rate: new Prisma.Decimal(payload.rate),
        source: payload.source ?? 'manual',
        capturedAt: new Date(),
      },
      create: {
        baseAssetCode: payload.baseAssetCode,
        quoteAssetCode: payload.quoteAssetCode,
        rate: new Prisma.Decimal(payload.rate),
        source: payload.source ?? 'manual',
        capturedAt: new Date(),
      },
    });
  }
}
