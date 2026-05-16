import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Авторизация пользователя',
    description:
      'Проверяет email и пароль, возвращает accessToken, refreshToken и данные пользователя.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно авторизован.',
  })
  @ApiResponse({ status: 400, description: 'Email или пароль не переданы.' })
  @ApiResponse({
    status: 401,
    description: 'Неверные данные для входа или пользователь не активен.',
  })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Обновить access token',
    description: 'Проверяет refreshToken и выдаёт новую пару токенов.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 201, description: 'Токены успешно обновлены.' })
  @ApiResponse({ status: 400, description: 'refreshToken не передан.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token недействителен или истёк.',
  })
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить текущего пользователя',
    description: 'Возвращает данные пользователя, определённого по JWT-токену.',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о текущем пользователе успешно получена.',
  })
  @ApiResponse({
    status: 401,
    description: 'JWT-токен отсутствует или недействителен.',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
