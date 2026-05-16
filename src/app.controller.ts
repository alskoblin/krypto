import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Получить обзор API',
    description:
      'Возвращает статус приложения, примерные идентификаторы и список REST-маршрутов.',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о приложении успешно получена.',
  })
  getOverview() {
    return this.appService.getOverview();
  }
}
