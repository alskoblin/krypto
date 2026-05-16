import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  email!: string;

  @ApiProperty({
    example: 'secret123',
    minLength: 6,
    description: 'Пароль пользователя',
  })
  password!: string;

  @ApiProperty({
    example: 'Ivan Ivanov',
    description: 'Полное имя пользователя',
  })
  fullName!: string;

  @ApiPropertyOptional({
    example: '+79990000000',
    description: 'Телефон пользователя',
  })
  phone?: string;
}
