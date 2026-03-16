import { Global, Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { TonSandboxService } from './ton-sandbox.service';

@Global()
@Module({
  controllers: [BlockchainController],
  providers: [TonSandboxService],
  exports: [TonSandboxService],
})
export class BlockchainModule {}
