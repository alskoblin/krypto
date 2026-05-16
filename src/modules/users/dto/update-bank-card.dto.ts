import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBankCardDto {
  @ApiPropertyOptional({
    example: 'Mastercard',
    description: 'Бренд или платёжная система карты',
  })
  brand?: string;

  @ApiPropertyOptional({
    example: '5555',
    description: 'Последние четыре цифры карты',
  })
  last4?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Месяц окончания срока действия карты',
  })
  expMonth?: number;

  @ApiPropertyOptional({
    example: 2031,
    description: 'Год окончания срока действия карты',
  })
  expYear?: number;

  @ApiPropertyOptional({
    example: 'Ivan Ivanov',
    description: 'Имя держателя карты',
    nullable: true,
  })
  holderName?: string | null;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'blocked', 'expired', 'deleted'],
    description: 'Статус карты',
  })
  status?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Признак карты по умолчанию',
  })
  isDefault?: boolean;
}
