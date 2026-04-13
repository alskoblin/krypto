import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RatesService } from './rates.service';

type SyncPair = {
  coinId: string;
  baseAssetCode: string;
  quoteAssetCode: string;
};

const DEFAULT_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_SYNC_PAIRS =
  'bitcoin:BTC:USD,ethereum:ETH:USD,the-open-network:TON:USD,tether:USDT:USD';
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_SOURCE = 'coingecko-demo';
const RATES_SYNC_INTERVAL_MS = parsePositiveInt(
  process.env.RATES_SYNC_INTERVAL_MS,
  DEFAULT_SYNC_INTERVAL_MS,
);

@Injectable()
export class RatesSyncService implements OnModuleInit {
  private readonly logger = new Logger(RatesSyncService.name);
  private readonly enabled = parseBoolean(process.env.RATES_SYNC_ENABLED, true);
  private readonly runOnStartup = parseBoolean(
    process.env.RATES_SYNC_RUN_ON_STARTUP,
    true,
  );
  private readonly apiKey = process.env.COINGECKO_DEMO_API_KEY?.trim() ?? '';
  private readonly apiBaseUrl = (
    process.env.COINGECKO_API_BASE_URL?.trim() || COINGECKO_API_BASE_URL
  ).replace(/\/+$/, '');
  private readonly syncPairs = this.parseSyncPairs(process.env.RATES_SYNC_PAIRS);

  private syncInProgress = false;

  constructor(private readonly ratesService: RatesService) {}

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Rate sync job is disabled by RATES_SYNC_ENABLED=false');
      return;
    }

    if (this.syncPairs.length === 0) {
      this.logger.warn('Rate sync job has no valid pairs; set RATES_SYNC_PAIRS');
      return;
    }

    this.logger.log(
      `Rate sync configured: interval=${RATES_SYNC_INTERVAL_MS}ms, pairs=${this.syncPairs.length}`,
    );

    if (this.runOnStartup) {
      await this.syncRates('startup');
    }
  }

  @Interval(RATES_SYNC_INTERVAL_MS)
  async syncRatesByInterval() {
    if (!this.enabled || this.syncPairs.length === 0) {
      return;
    }

    await this.syncRates('interval');
  }

  private async syncRates(trigger: 'startup' | 'interval') {
    if (this.syncInProgress) {
      this.logger.warn(`Skipping ${trigger} sync because previous run is still active`);
      return;
    }

    this.syncInProgress = true;

    try {
      const ids = [...new Set(this.syncPairs.map((pair) => pair.coinId))];
      const vsCurrencies = [
        ...new Set(this.syncPairs.map((pair) => pair.quoteAssetCode.toLowerCase())),
      ];

      const url = new URL(`${this.apiBaseUrl}/simple/price`);
      url.searchParams.set('ids', ids.join(','));
      url.searchParams.set('vs_currencies', vsCurrencies.join(','));
      url.searchParams.set('precision', 'full');

      const response = await fetch(url, {
        headers: this.apiKey
          ? {
              'x-cg-demo-api-key': this.apiKey,
            }
          : undefined,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `CoinGecko returned ${response.status} ${response.statusText}. Body: ${body.slice(0, 160)}`,
        );
      }

      const payload = (await response.json()) as Record<
        string,
        Record<string, number | null | undefined> | undefined
      >;

      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const pair of this.syncPairs) {
        try {
          const quoteLower = pair.quoteAssetCode.toLowerCase();
          const rate = payload[pair.coinId]?.[quoteLower];

          if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
            skipped += 1;
            continue;
          }

          await this.ratesService.createRate({
            baseAssetCode: pair.baseAssetCode,
            quoteAssetCode: pair.quoteAssetCode,
            rate: rate.toString(),
            source: COINGECKO_SOURCE,
          });

          updated += 1;
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to upsert pair ${pair.baseAssetCode}/${pair.quoteAssetCode}: ${message}`,
          );
        }
      }

      this.logger.log(
        `[${trigger}] rate sync completed (updated=${updated}, skipped=${skipped}, failed=${failed})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${trigger}] rate sync failed: ${message}`);
    } finally {
      this.syncInProgress = false;
    }
  }

  private parseSyncPairs(rawPairs?: string): SyncPair[] {
    const input = rawPairs?.trim() || DEFAULT_SYNC_PAIRS;
    const chunks = input
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    const uniqueByKey = new Map<string, SyncPair>();

    for (const chunk of chunks) {
      const [rawCoinId, rawBaseAssetCode, rawQuoteAssetCode] = chunk
        .split(':')
        .map((value) => value.trim());

      if (!rawCoinId || !rawBaseAssetCode || !rawQuoteAssetCode) {
        this.logger.warn(
          `Invalid sync pair "${chunk}". Expected format: coin-id:BASE:QUOTE`,
        );
        continue;
      }

      const pair: SyncPair = {
        coinId: rawCoinId.toLowerCase(),
        baseAssetCode: rawBaseAssetCode.toUpperCase(),
        quoteAssetCode: rawQuoteAssetCode.toUpperCase(),
      };

      const key = `${pair.coinId}:${pair.baseAssetCode}:${pair.quoteAssetCode}`;
      uniqueByKey.set(key, pair);
    }

    return [...uniqueByKey.values()];
  }
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
