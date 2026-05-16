import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MockFiatDepositDto {
  @ApiProperty({
    example: 'user-uuid',
    description: 'Идентификатор пользователя',
  })
  userId!: string;

  @ApiProperty({ example: 'USD', description: 'Код фиатного актива' })
  assetCode!: string;

  @ApiProperty({ example: '500', description: 'Сумма тестового пополнения' })
  amount!: string;

  @ApiPropertyOptional({
    example: 'mock-payments',
    description: 'Название тестового провайдера платежа',
  })
  provider?: string;

  @ApiPropertyOptional({
    example: 'pay_123',
    description: 'Идентификатор платежа у провайдера',
  })
  providerPaymentId?: string;

  @ApiPropertyOptional({
    example: 'Test fiat deposit',
    description: 'Описание операции',
  })
  description?: string;
}
