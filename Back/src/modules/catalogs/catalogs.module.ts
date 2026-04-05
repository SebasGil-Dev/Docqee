import { Module } from '@nestjs/common';
import { CatalogsController } from './controller/catalogs.controller';

@Module({
  controllers: [CatalogsController],
  providers: [],
  exports: [],
})
export class CatalogsModule {}
