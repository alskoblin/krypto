import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccessControlService } from '../auth/access-control.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DepositDto } from './dto/deposit.dto';
import { MockFiatDepositDto } from './dto/mock-fiat-deposit.dto';
import { MockPurchaseDto } from './dto/mock-purchase.dto';
import { MockTransferOutDto } from './dto/mock-transfer-out.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  @Get(':walletId/balances')
  async getBalances(
    @Param('walletId') walletId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.getWalletBalances(walletId);
  }

  @Get(':walletId/balances/crypto')
  async getCryptoBalances(
    @Param('walletId') walletId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.getCryptoBalances(walletId);
  }

  @Post(':walletId/deposit')
  async deposit(
    @Param('walletId') walletId: string,
    @Body() body: DepositDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.deposit(walletId, body);
  }

  @Post(':walletId/fiat/deposits/mock')
  async mockFiatDeposit(
    @Param('walletId') walletId: string,
    @Body() body: MockFiatDepositDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockFiatDeposit(walletId, body);
  }

  @Post(':walletId/purchases/mock')
  async mockPurchase(
    @Param('walletId') walletId: string,
    @Body() body: MockPurchaseDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockPurchase(walletId, body);
  }

  @Post(':walletId/transfers/mock')
  async mockTransferOut(
    @Param('walletId') walletId: string,
    @Body() body: MockTransferOutDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.accessControlService.ensureWalletAccess(currentUser, walletId);
    return this.walletsService.mockTransferOut(walletId, body);
  }
}
