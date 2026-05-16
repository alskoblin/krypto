import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRateDto {
  @ApiProperty({ example: 'TON', description: 'Базовый актив' })
  baseAssetCode!: string;

  @ApiProperty({ example: 'USD', description: 'Котируемый актив' })
  quoteAssetCode!: string;

  @ApiProperty({ example: '5.25', description: 'Курс обмена' })
  rate!: string;

  @ApiPropertyOptional({ example: 'manual', description: 'Источник курса' })
  source?: string;
}
