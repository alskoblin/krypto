import { Module } from '@nestjs/common';
import { RatesController } from './rates.controller';
import { RatesSyncService } from './rates-sync.service';
import { RatesService } from './rates.service';

@Module({
  controllers: [RatesController],
  providers: [RatesService, RatesSyncService],
  exports: [RatesService],
})
export class RatesModule {}
