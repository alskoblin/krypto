import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    example: 'user-uuid',
    description: 'Идентификатор пользователя',
  })
  userId!: string;

  @ApiProperty({ example: 'TON', description: 'Код актива пополнения' })
  assetCode!: string;

  @ApiProperty({ example: '2.5', description: 'Сумма пополнения' })
  amount!: string;

  @ApiPropertyOptional({
    example: 'external-ref-123',
    description: 'Внешняя ссылка на операцию',
  })
  reference?: string;

  @ApiPropertyOptional({
    example: 'Wallet deposit',
    description: 'Описание пополнения',
  })
  description?: string;
}
