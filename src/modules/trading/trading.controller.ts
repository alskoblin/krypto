import { Body, Controller, Post } from '@nestjs/common';
import { TradeDto } from './dto/trade.dto';
import { TradingService } from './trading.service';

@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Post('buy')
  buy(@Body() body: TradeDto) {
    return this.tradingService.buy(body);
  }

  @Post('sell')
  sell(@Body() body: TradeDto) {
    return this.tradingService.sell(body);
  }
}
