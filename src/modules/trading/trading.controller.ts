import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { TradeDto } from './dto/trade.dto';
import { TradingService } from './trading.service';

@ApiTags('Trading')
@Controller('trading')
export class TradingController {
  constructor(
    private readonly tradingService: TradingService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Post('buy')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Купить криптовалюту',
    description:
      'Создаёт торговый ордер на покупку, проверяет баланс, обновляет балансы и фиксирует транзакцию.',
  })
  @ApiBody({ type: TradeDto })
  @ApiResponse({ status: 201, description: 'Покупка успешно выполнена.' })
  @ApiResponse({
    status: 400,
    description:
      'Некорректная сумма, кошелёк не принадлежит пользователю или недостаточно средств.',
  })
  @ApiResponse({
    status: 404,
    description: 'Кошелёк или курс обмена не найден.',
  })
  async buy(
    @Body() body: TradeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, body.userId);
    await this.accessControlService.ensureWalletAccess(
      currentUser,
      body.walletId,
    );
    return this.tradingService.buy(body);
  }

  @Post('sell')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Продать криптовалюту',
    description:
      'Создаёт торговый ордер на продажу, проверяет баланс, обновляет балансы и фиксирует транзакцию.',
  })
  @ApiBody({ type: TradeDto })
  @ApiResponse({ status: 201, description: 'Продажа успешно выполнена.' })
  @ApiResponse({
    status: 400,
    description:
      'Некорректная сумма, кошелёк не принадлежит пользователю или недостаточно средств.',
  })
  @ApiResponse({
    status: 404,
    description: 'Кошелёк или курс обмена не найден.',
  })
  async sell(
    @Body() body: TradeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.accessControlService.ensureSelfOrAdmin(currentUser, body.userId);
    await this.accessControlService.ensureWalletAccess(
      currentUser,
      body.walletId,
    );
    return this.tradingService.sell(body);
  }
}
