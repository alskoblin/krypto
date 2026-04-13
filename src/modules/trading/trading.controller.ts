import { Body, Controller, Post } from '@nestjs/common';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TradeDto } from './dto/trade.dto';
import { TradingService } from './trading.service';

@Controller('trading')
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post('buy')
  async buy(
    @Body() body: TradeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, body.userId);
    await this.accessControlService.ensureWalletAccess(currentUser, body.walletId);
    return this.tradingService.buy(body);
  }

  @Post('sell')
  async sell(
    @Body() body: TradeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, body.userId);
    await this.accessControlService.ensureWalletAccess(currentUser, body.walletId);
    return this.tradingService.sell(body);
  }
}
