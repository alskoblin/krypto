import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ASSET_TYPE } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { RatesChartsQueryDto } from './dto/rates-charts-query.dto';

type SyncPair = {
  coinId: string;
  baseAssetCode: string;
  quoteAssetCode: string;
};

type ChartPoint = {
  time: number;
  price: number;
};

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const DEFAULT_SYNC_PAIRS =
  'bitcoin:BTC:USD,ethereum:ETH:USD,the-open-network:TON:USD,tether:USDT:USD';
const ALLOWED_INTERVALS = new Set(['daily', 'hourly']);

@Injectable()
export class RatesService {
  private readonly apiKey = process.env.COINGECKO_DEMO_API_KEY?.trim() ?? '';
  private readonly apiBaseUrl = (
    process.env.COINGECKO_API_BASE_URL?.trim() || COINGECKO_API_BASE_URL
  ).replace(/\/+$/, '');
  private readonly syncPairs = this.parseSyncPairs(process.env.RATES_SYNC_PAIRS);

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

    await this.ensureAsset(payload.baseAssetCode, ASSET_TYPE.CRYPTO);
    await this.ensureAsset(payload.quoteAssetCode, ASSET_TYPE.FIAT);

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

  async getRatesCharts(query: RatesChartsQueryDto) {
    const days = this.normalizeDays(query.days);
    const interval = this.normalizeInterval(query.interval);
    const precision = this.normalizePrecision(query.precision);
    const pairs = this.resolveRequestedPairs(query.pairs);

    if (pairs.length === 0) {
      throw new BadRequestException('No valid pairs provided');
    }

    const chartsEntries = await Promise.all(
      pairs.map(async (pair) => {
        const points = await this.fetchCoinMarketChart(
          pair.coinId,
          pair.quoteAssetCode,
          days,
          interval,
          precision,
        );

        return [`${pair.baseAssetCode}/${pair.quoteAssetCode}`, points] as const;
      }),
    );

    return {
      source: 'coingecko-demo',
      days,
      interval: interval ?? null,
      precision: precision ?? null,
      charts: Object.fromEntries(chartsEntries),
    };
  }

  private async ensureAsset(assetCode: string, assetType: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { code: assetCode },
    });

    if (asset) {
      if (asset.type !== assetType) {
        throw new BadRequestException(
          `Asset ${assetCode} must have type ${assetType}`,
        );
      }
      return asset;
    }

    return this.prisma.asset.create({
      data: {
        code: assetCode,
        name: assetCode,
        type: assetType,
        precision: assetType === ASSET_TYPE.FIAT ? 2 : 8,
        isActive: true,
      },
    });
  }

  private resolveRequestedPairs(rawPairs?: string): SyncPair[] {
    if (!rawPairs || !rawPairs.trim()) {
      return this.syncPairs;
    }

    const requested = rawPairs
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    if (requested.length === 0) {
      return this.syncPairs;
    }

    const configuredByPair = new Map<string, SyncPair>();
    for (const pair of this.syncPairs) {
      configuredByPair.set(
        `${pair.baseAssetCode}/${pair.quoteAssetCode}`,
        pair,
      );
    }

    const resolved = requested
      .map((pair) => configuredByPair.get(pair))
      .filter((pair): pair is SyncPair => Boolean(pair));

    return resolved.length > 0 ? resolved : this.syncPairs;
  }

  private async fetchCoinMarketChart(
    coinId: string,
    quoteAssetCode: string,
    days: string,
    interval?: string,
    precision?: string,
  ): Promise<ChartPoint[]> {
    const url = new URL(`${this.apiBaseUrl}/coins/${coinId}/market_chart`);
    url.searchParams.set('vs_currency', quoteAssetCode.toLowerCase());
    url.searchParams.set('days', days);

    if (interval) {
      url.searchParams.set('interval', interval);
    }

    if (precision) {
      url.searchParams.set('precision', precision);
    }

    const response = await fetch(url, {
      headers: this.apiKey
        ? {
            'x-cg-demo-api-key': this.apiKey,
          }
        : undefined,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadRequestException(
        `Failed to fetch chart for ${coinId}. CoinGecko ${response.status}: ${body.slice(0, 160)}`,
      );
    }

    const payload = (await response.json()) as {
      prices?: Array<[number, number]>;
    };

    return (payload.prices ?? [])
      .filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          point.length === 2 &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]),
      )
      .map(([time, price]) => ({
        time,
        price,
      }));
  }

  private normalizeDays(rawDays?: string): string {
    if (!rawDays || !rawDays.trim()) {
      return '90';
    }

    const normalized = rawDays.trim();
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException('days must be an integer string');
    }

    return normalized;
  }

  private normalizeInterval(rawInterval?: string): 'daily' | 'hourly' | undefined {
    if (!rawInterval || !rawInterval.trim()) {
      return undefined;
    }

    const normalized = rawInterval.trim().toLowerCase();
    if (!ALLOWED_INTERVALS.has(normalized)) {
      throw new BadRequestException('interval must be one of: daily, hourly');
    }

    return normalized as 'daily' | 'hourly';
  }

  private normalizePrecision(rawPrecision?: string): string | undefined {
    if (!rawPrecision || !rawPrecision.trim()) {
      return undefined;
    }

    const normalized = rawPrecision.trim().toLowerCase();
    if (normalized === 'full') {
      return 'full';
    }

    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException('precision must be "full" or integer from 0 to 18');
    }

    const value = Number(normalized);
    if (!Number.isInteger(value) || value < 0 || value > 18) {
      throw new BadRequestException('precision must be "full" or integer from 0 to 18');
    }

    return normalized;
  }

  private parseSyncPairs(rawPairs?: string): SyncPair[] {
    const input = rawPairs?.trim() || DEFAULT_SYNC_PAIRS;
    const chunks = input
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    const pairs = new Map<string, SyncPair>();
    for (const chunk of chunks) {
      const [rawCoinId, rawBaseAssetCode, rawQuoteAssetCode] = chunk
        .split(':')
        .map((value) => value.trim());

      if (!rawCoinId || !rawBaseAssetCode || !rawQuoteAssetCode) {
        continue;
      }

      const pair: SyncPair = {
        coinId: rawCoinId.toLowerCase(),
        baseAssetCode: rawBaseAssetCode.toUpperCase(),
        quoteAssetCode: rawQuoteAssetCode.toUpperCase(),
      };

      const key = `${pair.baseAssetCode}/${pair.quoteAssetCode}`;
      pairs.set(key, pair);
    }

    return [...pairs.values()];
  }
}
