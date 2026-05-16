import { ApiPropertyOptional } from '@nestjs/swagger';

export class MonthlyBudgetQueryDto {
  @ApiPropertyOptional({ example: 'USD', description: 'Код актива бюджета' })
  assetCode?: string;

  @ApiPropertyOptional({ example: 2026, description: 'Год бюджета' })
  year?: string | number;

  @ApiPropertyOptional({ example: 5, description: 'Месяц бюджета' })
  month?: string | number;
}
