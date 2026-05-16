import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'new-user@example.com',
    description: 'Новый email пользователя',
  })
  email?: string;

  @ApiPropertyOptional({
    example: 'Ivan Petrov',
    description: 'Новое полное имя пользователя',
  })
  fullName?: string;

  @ApiPropertyOptional({
    example: '+79991112233',
    description: 'Новый телефон пользователя',
    nullable: true,
  })
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'blocked', 'pending', 'deleted'],
    description: 'Статус пользователя',
  })
  status?: string;
}
