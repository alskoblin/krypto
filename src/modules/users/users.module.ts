import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { WalletKeysService } from './wallet-keys.service';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, WalletKeysService],
  exports: [UsersService],
})
export class UsersModule {}
