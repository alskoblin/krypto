import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Address, toNano } from '@ton/core';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { ASSET_TYPE, EntityId } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class TonSandboxService {
  private readonly logger = new Logger(TonSandboxService.name);
  private blockchain: Blockchain | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async simulateAssetTransfer(params: {
    address: string;
    transactionId: EntityId;
    assetCode: string;
    amount: string;
    assetType: string;
    direction?: 'inbound' | 'outbound';
  }) {
    if (params.assetType !== ASSET_TYPE.CRYPTO) {
      return null;
    }

    const network = await this.prisma.blockchainNetwork.findUnique({
      where: { code: 'ton-sandbox' },
    });

    if (!network) {
      return null;
    }

    const linkedAddress = await this.prisma.blockchainAddress.findFirst({
      where: {
        address: params.address,
        isActive: true,
        network: {
          code: 'ton-sandbox',
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!linkedAddress) {
      this.logger.warn(
        `TON sandbox transfer skipped: blockchainAddress not found for ${params.address}`,
      );
      return null;
    }

    const emulatedTransfer = await this.runSandboxTransfer(
      linkedAddress.address,
      params.amount,
      params.direction ?? 'inbound',
    );
    if (!emulatedTransfer) {
      return null;
    }

    return this.prisma.blockchainTx.create({
      data: {
        networkId: network.id,
        walletId: linkedAddress.walletId,
        transactionId: params.transactionId,
        hash: emulatedTransfer.hash,
        fromAddress: emulatedTransfer.fromAddress,
        toAddress: emulatedTransfer.toAddress,
        assetCode: params.assetCode,
        amount: new Prisma.Decimal(params.amount),
        status: emulatedTransfer.status,
        blockNumber: emulatedTransfer.blockNumber,
        confirmations: emulatedTransfer.confirmations,
        confirmedAt: emulatedTransfer.confirmedAt,
      },
    });
  }

  private async runSandboxTransfer(
    address: string,
    amount: string,
    direction: 'inbound' | 'outbound',
  ) {
    try {
      const blockchain = await this.getBlockchain();
      const mainTreasury = await blockchain.treasury('sandbox-treasury');
      const walletTreasury = await blockchain.treasury(this.walletSeed(address));
      const linkedAddress = this.parseAddress(address);
      if (!linkedAddress) {
        this.logger.warn(
          `TON sandbox transfer skipped: invalid TON address ${address}`,
        );
        return null;
      }
      const sender = direction === 'outbound' ? walletTreasury : mainTreasury;
      const recipient = direction === 'outbound'
        ? mainTreasury.address
        : linkedAddress;
      const result = await sender.send({
        to: recipient,
        value: toNano(amount),
        bounce: false,
      });

      const terminalTx = result.transactions[result.transactions.length - 1];
      const lt = terminalTx.lt ?? 1n;

      return {
        hash: terminalTx.hash().toString('hex'),
        fromAddress: direction === 'outbound' ? address : sender.address.toRawString(),
        toAddress: direction === 'inbound' ? address : recipient.toRawString(),
        status: 'confirmed',
        blockNumber: this.toInt32Lt(lt),
        confirmations: 1,
        confirmedAt: new Date(),
      };
    } catch (error) {
      this.logger.warn(
        `TON sandbox transfer emulation failed for address ${address}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private toInt32Lt(lt: bigint) {
    const maxInt32 = 2147483647n;
    const normalized = lt % maxInt32;
    return Number(normalized === 0n ? 1n : normalized);
  }

  private async getBlockchain() {
    if (!this.blockchain) {
      this.blockchain = await Blockchain.create();
    }
    return this.blockchain;
  }

  private parseAddress(address: string) {
    try {
      return Address.parse(address);
    } catch (error) {
      return null;
    }
  }

  private walletSeed(address: string) {
    const normalized = address.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 48);
    return `wallet-${normalized || 'unknown'}`;
  }
}
