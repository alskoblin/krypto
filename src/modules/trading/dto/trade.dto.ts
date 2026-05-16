import { ApiProperty } from '@nestjs/swagger';

export class TradeDto {
  @ApiProperty({
    example: 'user-uuid',
    description: 'Идентификатор пользователя',
  })
  userId!: string;

  @ApiProperty({
    example: 'wallet-uuid',
    description: 'Идентификатор кошелька',
  })
  walletId!: string;

  @ApiProperty({ example: 'TON', description: 'Базовый актив сделки' })
  baseAssetCode!: string;

  @ApiProperty({ example: 'USD', description: 'Котируемый актив сделки' })
  quoteAssetCode!: string;

  @ApiProperty({ example: '1.5', description: 'Количество базового актива' })
  amount!: string;
}
