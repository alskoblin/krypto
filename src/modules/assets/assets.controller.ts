import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { USER_ROLE } from '../../domain';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить список активов',
    description: 'Возвращает все фиатные и криптовалютные активы приложения.',
  })
  @ApiResponse({ status: 200, description: 'Список активов успешно получен.' })
  @ApiResponse({
    status: 401,
    description: 'JWT-токен отсутствует или недействителен.',
  })
  getAssets() {
    return this.assetsService.getAssets();
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Создать актив',
    description:
      'Создаёт новый фиатный или криптовалютный актив. Доступно только администратору.',
  })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Актив успешно создан.' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные или актив уже существует.',
  })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав для создания актива.',
  })
  createAsset(@Body() body: CreateAssetDto) {
    return this.assetsService.createAsset(body);
  }
}
