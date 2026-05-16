import { ApiProperty } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiProperty({ example: 'TON', description: 'Код актива' })
  code!: string;

  @ApiProperty({ example: 'Toncoin', description: 'Название актива' })
  name!: string;

  @ApiProperty({
    example: 'crypto',
    enum: ['fiat', 'crypto'],
    description: 'Тип актива',
  })
  type!: string;

  @ApiProperty({ example: 8, description: 'Количество знаков после запятой' })
  precision!: number;
}
