import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { USER_ROLE } from '../../domain';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRateDto } from './dto/create-rate.dto';
import { RatesChartsQueryDto } from './dto/rates-charts-query.dto';
import { RatesService } from './rates.service';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  getRates() {
    return this.ratesService.getRates();
  }

  @Get('charts')
  getRatesCharts(@Query() query: RatesChartsQueryDto) {
    return this.ratesService.getRatesCharts(query);
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  createRate(@Body() body: CreateRateDto) {
    return this.ratesService.createRate(body);
  }
}
