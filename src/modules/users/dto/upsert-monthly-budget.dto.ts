import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertMonthlyBudgetDto {
  @ApiProperty({ example: 'USD', description: 'Код актива бюджета' })
  assetCode!: string;

  @ApiProperty({ example: '1000', description: 'Лимит расходов за месяц' })
  limitAmount!: string;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Год бюджета. Если не передан, используется текущий год.',
  })
  year?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Месяц бюджета. Если не передан, используется текущий месяц.',
  })
  month?: number;
}
