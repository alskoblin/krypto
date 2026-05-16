import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCryptoWalletDto {
  @ApiPropertyOptional({
    example: 'wallet-uuid',
    description:
      'Идентификатор кошелька. Если не передан, используется первый кошелёк пользователя.',
  })
  walletId?: string;

  @ApiPropertyOptional({
    example: 'TON',
    description: 'Код криптовалютного актива',
  })
  assetCode?: string;
}
