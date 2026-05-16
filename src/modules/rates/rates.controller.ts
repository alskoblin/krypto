import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { USER_ROLE } from '../../domain';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRateDto } from './dto/create-rate.dto';
import { RatesChartsQueryDto } from './dto/rates-charts-query.dto';
import { RatesService } from './rates.service';

@ApiTags('Rates')
@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить текущие курсы',
    description: 'Возвращает курсы обмена, сохранённые в базе данных.',
  })
  @ApiResponse({ status: 200, description: 'Курсы успешно получены.' })
  getRates() {
    return this.ratesService.getRates();
  }

  @Get('charts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получить графики курсов',
    description:
      'Получает исторические точки курсов через CoinGecko для заданных пар.',
  })
  @ApiQuery({
    name: 'pairs',
    required: false,
    example: 'BTC/USD,ETH/USD,TON/USD',
  })
  @ApiQuery({ name: 'days', required: false, example: '90' })
  @ApiQuery({ name: 'interval', required: false, enum: ['daily', 'hourly'] })
  @ApiQuery({ name: 'precision', required: false, example: '2' })
  @ApiResponse({ status: 200, description: 'Графики курсов успешно получены.' })
  @ApiResponse({
    status: 400,
    description: 'Некорректные query-параметры или ошибка CoinGecko.',
  })
  getRatesCharts(@Query() query: RatesChartsQueryDto) {
    return this.ratesService.getRatesCharts(query);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Создать или обновить курс',
    description:
      'Создаёт или обновляет курс обмена. Доступно только администратору.',
  })
  @ApiBody({ type: CreateRateDto })
  @ApiResponse({
    status: 201,
    description: 'Курс успешно создан или обновлён.',
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные курса.' })
  @ApiResponse({
    status: 403,
    description: 'Недостаточно прав для изменения курса.',
  })
  createRate(@Body() body: CreateRateDto) {
    return this.ratesService.createRate(body);
  }
}
