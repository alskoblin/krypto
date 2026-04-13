import { Body, Controller, Get, Post } from '@nestjs/common';
import { USER_ROLE } from '../../domain';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAssetDto } from './dto/create-asset.dto';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  getAssets() {
    return this.assetsService.getAssets();
  }

  @Post()
  @Roles(USER_ROLE.ADMIN)
  createAsset(@Body() body: CreateAssetDto) {
    return this.assetsService.createAsset(body);
  }
}
