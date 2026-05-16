import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankCardDto {
  @ApiProperty({
    example: 'tok_test_visa_4242',
    description: 'Токен банковской карты',
  })
  token!: string;

  @ApiProperty({
    example: 'Visa',
    description: 'Бренд или платёжная система карты',
  })
  brand!: string;

  @ApiProperty({ example: '4242', description: 'Последние четыре цифры карты' })
  last4!: string;

  @ApiProperty({
    example: 12,
    description: 'Месяц окончания срока действия карты',
  })
  expMonth!: number;

  @ApiProperty({
    example: 2030,
    description: 'Год окончания срока действия карты',
  })
  expYear!: number;

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
    example: true,
    description: 'Сделать карту картой по умолчанию',
  })
  isDefault?: boolean;
}
