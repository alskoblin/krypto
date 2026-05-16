import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DepositDto } from './dto/deposit.dto';
import { MockFiatDepositDto } from './dto/mock-fiat-deposit.dto';
import { MockPurchaseDto } from './dto/mock-purchase.dto';
import { MockTransferOutDto } from './dto/mock-transfer-out.dto';
import { WalletsService } from './wallets.service';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get(':walletId/balances')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить балансы кошелька',
    description: 'Возвращает все балансы указанного кошелька.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Идентификатор кошелька',
    example: 'wallet-uuid',
  })
  @ApiResponse({ status: 200, description: 'Балансы успешно получены.' })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к указанному кошельку.',
  })
  @ApiResponse({ status: 404, description: 'Кошелёк не найден.' })
  async getBalances(
    @Param('walletId') walletId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.getWalletBalances(walletId);
  }

  @Get(':walletId/balances/crypto')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить криптовалютные балансы кошелька',
    description:
      'Возвращает только балансы с типом crypto для указанного кошелька.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Идентификатор кошелька',
    example: 'wallet-uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Криптовалютные балансы успешно получены.',
  })
  @ApiResponse({
    status: 403,
    description: 'Нет доступа к указанному кошельку.',
  })
  @ApiResponse({ status: 404, description: 'Кошелёк не найден.' })
  async getCryptoBalances(
    @Param('walletId') walletId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.getCryptoBalances(walletId);
  }

  @Post(':walletId/deposit')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Пополнить кошелёк',
    description:
      'Создаёт депозит, обновляет баланс, создаёт ledger-запись и при crypto-активе эмулирует TON Sandbox транзакцию.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Идентификатор кошелька',
    example: 'wallet-uuid',
  })
  @ApiBody({ type: DepositDto })
  @ApiResponse({ status: 201, description: 'Пополнение успешно выполнено.' })
  @ApiResponse({
    status: 400,
    description: 'Некорректная сумма или кошелёк не принадлежит пользователю.',
  })
  @ApiResponse({ status: 404, description: 'Кошелёк не найден.' })
  async deposit(
    @Param('walletId') walletId: string,
    @Body() body: DepositDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.deposit(walletId, body);
  }

  @Post(':walletId/fiat/deposits/mock')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Выполнить тестовое фиатное пополнение',
    description:
      'Создаёт mock-платёж фиатным активом, обновляет баланс и фиксирует ledger-запись.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Идентификатор кошелька',
    example: 'wallet-uuid',
  })
  @ApiBody({ type: MockFiatDepositDto })
  @ApiResponse({
    status: 201,
    description: 'Тестовое фиатное пополнение успешно выполнено.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Некорректная сумма, актив не является fiat или кошелёк не принадлежит пользователю.',
  })
  async mockFiatDeposit(
    @Param('walletId') walletId: string,
    @Body() body: MockFiatDepositDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockFiatDeposit(walletId, body);
  }

  @Post(':walletId/purchases/mock')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Выполнить тестовую покупку',
    description:
      'Создаёт mock-покупку, списывает fiat-баланс, проверяет месячный бюджет и создаёт ledger-запись.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Идентификатор кошелька',
    example: 'wallet-uuid',
  })
  @ApiBody({ type: MockPurchaseDto })
  @ApiResponse({
    status: 201,
    description: 'Тестовая покупка успешно выполнена.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Недостаточно средств, превышен бюджет или переданы некорректные данные.',
  })
  async mockPurchase(
    @Param('walletId') walletId: string,
    @Body() body: MockPurchaseDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockPurchase(walletId, body);
  }

  @Post(':walletId/transfers/mock')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Выполнить тестовый внешний перевод',
    description:
      'Создаёт mock-перевод, списывает баланс, создаёт ledger-запись и при crypto-активе эмулирует TON Sandbox транзакцию.',
  })
  @ApiParam({
    name: 'walletId',
    description: 'Идентификатор кошелька',
    example: 'wallet-uuid',
  })
  @ApiBody({ type: MockTransferOutDto })
  @ApiResponse({
    status: 201,
    description: 'Тестовый внешний перевод успешно выполнен.',
  })
  @ApiResponse({
    status: 400,
    description: 'Недостаточно средств или переданы некорректные данные.',
  })
  async mockTransferOut(
    @Param('walletId') walletId: string,
    @Body() body: MockTransferOutDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockTransferOut(walletId, body);
  }
}
