import { Module } from '@nestjs/common';
import { UniversitiesController } from './controller/universities.controller';

@Module({
  controllers: [UniversitiesController],
  providers: [],
  exports: [],
})
export class UniversitiesModule {}
