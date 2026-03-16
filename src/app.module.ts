import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AssetsModule } from './modules/assets/assets.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { RatesModule } from './modules/rates/rates.module';
import { TradingModule } from './modules/trading/trading.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';

@Module({
  imports: [
    PrismaModule,
    AssetsModule,
    BlockchainModule,
    RatesModule,
    UsersModule,
    WalletsModule,
    TransactionsModule,
    TradingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
