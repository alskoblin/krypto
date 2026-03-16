import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateRateDto } from './dto/create-rate.dto';
import { RatesService } from './rates.service';

@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  getRates() {
    return this.ratesService.getRates();
  }

  @Post()
  createRate(@Body() body: CreateRateDto) {
    return this.ratesService.createRate(body);
  }
}
