import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  createCipheriv,
  randomBytes,
} from 'crypto';
import { mnemonicNew, mnemonicToWalletKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

const ENCRYPTION_SCHEME_VERSION = 'v1';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_ALGORITHM = 'ed25519-ton-wallet-v4';

@Injectable()
export class WalletKeysService {
  private masterKey: Buffer | null = null;

  async issueTonSandboxCredentials() {
    const masterKey = this.getMasterKey();
    const mnemonic = await mnemonicNew(24);
    const keyPair = await mnemonicToWalletKey(mnemonic);
    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
    });
    const privateKeyPayload = JSON.stringify({
      mnemonic,
      secretKey: keyPair.secretKey.toString('hex'),
    });

    return {
      address: wallet.address.toRawString(),
      publicKey: keyPair.publicKey.toString('hex'),
      privateKey: mnemonic.join(' '),
      encryptedPrivateKey: this.encryptPrivateKey(privateKeyPayload, masterKey),
      keyAlgorithm: KEY_ALGORITHM,
      keyEncryptionVersion: ENCRYPTION_SCHEME_VERSION,
    };
  }

  private getMasterKey() {
    if (this.masterKey) {
      return this.masterKey;
    }

    this.masterKey = this.parseMasterKey(
      process.env.PRIVATE_KEY_ENCRYPTION_KEY ?? '',
    );
    return this.masterKey;
  }

  private parseMasterKey(raw: string) {
    const normalized = raw.trim();
    if (!normalized) {
      throw new InternalServerErrorException(
        'PRIVATE_KEY_ENCRYPTION_KEY is not configured',
      );
    }

    const decoded = this.decodeMasterKey(normalized);
    if (decoded.length !== 32) {
      throw new InternalServerErrorException(
        'PRIVATE_KEY_ENCRYPTION_KEY must be 32 bytes (64-char hex or base64)',
      );
    }

    return decoded;
  }

  private decodeMasterKey(value: string) {
    if (/^[a-fA-F0-9]{64}$/.test(value)) {
      return Buffer.from(value, 'hex');
    }

    return Buffer.from(value, 'base64');
  }

  private encryptPrivateKey(privateKeyPem: string, masterKey: Buffer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, masterKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(privateKeyPem, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      ENCRYPTION_SCHEME_VERSION,
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }
}
