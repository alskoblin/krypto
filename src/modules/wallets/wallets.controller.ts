import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DepositDto } from './dto/deposit.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get(':walletId/balances')
  getBalances(@Param('walletId') walletId: string) {
    return this.walletsService.getWalletBalances(walletId);
  }

  @Post(':walletId/deposit')
  deposit(@Param('walletId') walletId: string, @Body() body: DepositDto) {
    return this.walletsService.deposit(walletId, body);
  }
}
