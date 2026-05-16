import { ApiPropertyOptional } from '@nestjs/swagger';

export class FinanceSummaryQueryDto {
  @ApiPropertyOptional({
    example: 'USD',
    description: 'Фильтр по активу. Если не передан, считаются все активы.',
  })
  assetCode?: string;
}
