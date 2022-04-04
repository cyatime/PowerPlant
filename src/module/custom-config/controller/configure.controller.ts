import { QueryParams } from '@/common';
import { AuthGuard } from '@/module/user';
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigureService } from '../service/configure.service';
import { Config, DeleteIdPrams } from '../types/config';

@Controller('config')
export class ConfigureController {
  constructor(private readonly configService: ConfigureService) {}

  @Get()
  @UseGuards(AuthGuard)
  getConfig(@Query() query: QueryParams) {
    return this.configService.get(query);
  }

  @Post()
  @UseGuards(AuthGuard)
  addConfig(@Body() config: Config) {
    return this.configService.add(config);
  }

  @Put()
  @UseGuards(AuthGuard)
  updateConfig(@Body() config: Config) {
    return this.configService.update(config);
  }

  @Delete()
  @UseGuards(AuthGuard)
  delConfig(@Body() config: DeleteIdPrams) {
    return this.configService.delete(config);
  }

  @Get('duplicated-name')
  @UseGuards(AuthGuard)
  checkNameRepeat(@Query() { name }: { name: string }) {
    return this.configService.checkNameRepeat(name);
  }

  @Get('type')
  @UseGuards(AuthGuard)
  getConfigType() {
    return this.configService.getConfigType();
  }
}
