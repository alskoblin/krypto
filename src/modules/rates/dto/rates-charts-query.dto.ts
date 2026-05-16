import { ApiPropertyOptional } from '@nestjs/swagger';

export class RatesChartsQueryDto {
  @ApiPropertyOptional({
    example: 'BTC/USD,ETH/USD,TON/USD',
    description:
      'Список пар через запятую. Если не передан, используются пары по умолчанию.',
  })
  pairs?: string;

  @ApiPropertyOptional({
    example: '90',
    description: 'Количество дней для графика',
  })
  days?: string;

  @ApiPropertyOptional({
    example: 'daily',
    enum: ['daily', 'hourly'],
    description: 'Интервал точек графика',
  })
  interval?: 'daily' | 'hourly';

  @ApiPropertyOptional({
    example: '2',
    description: 'Точность цены: число от 0 до 18 или full',
  })
  precision?: string;
}
