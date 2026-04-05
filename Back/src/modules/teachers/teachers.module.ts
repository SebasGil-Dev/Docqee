import { Module } from '@nestjs/common';
import { TeachersController } from './controller/teachers.controller';

@Module({
  controllers: [TeachersController],
  providers: [],
  exports: [],
})
export class TeachersModule {}
