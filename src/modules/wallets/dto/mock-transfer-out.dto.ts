import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MockTransferOutDto {
  @ApiProperty({
    example: 'user-uuid',
    description: 'Идентификатор пользователя',
  })
  userId!: string;

  @ApiProperty({ example: 'TON', description: 'Код актива перевода' })
  assetCode!: string;

  @ApiProperty({ example: '0.75', description: 'Сумма перевода' })
  amount!: string;

  @ApiPropertyOptional({
    example: 'external-wallet-address',
    description: 'Получатель перевода',
  })
  recipient?: string;

  @ApiPropertyOptional({
    example: 'Transfer to external wallet',
    description: 'Описание перевода',
  })
  description?: string;
}
