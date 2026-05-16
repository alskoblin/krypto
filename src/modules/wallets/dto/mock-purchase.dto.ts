import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MockPurchaseDto {
  @ApiProperty({
    example: 'user-uuid',
    description: 'Идентификатор пользователя',
  })
  userId!: string;

  @ApiProperty({ example: 'USD', description: 'Код фиатного актива' })
  assetCode!: string;

  @ApiProperty({ example: '49.99', description: 'Сумма покупки' })
  amount!: string;

  @ApiProperty({
    example: 'Headphones',
    description: 'Название товара или услуги',
  })
  itemName!: string;

  @ApiPropertyOptional({
    example: 'electronics',
    description: 'Категория покупки',
  })
  category?: string;

  @ApiPropertyOptional({
    example: 'Mock Store',
    description: 'Название продавца',
  })
  merchantName?: string;

  @ApiPropertyOptional({ example: 1, description: 'Количество товаров' })
  quantity?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Разрешить покупку при превышении месячного бюджета',
  })
  allowOverBudget?: boolean;

  @ApiPropertyOptional({
    example: 'Purchase in mock store',
    description: 'Описание покупки',
  })
  description?: string;
}
