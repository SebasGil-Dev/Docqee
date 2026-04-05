import { Module } from '@nestjs/common';
import { StudentsController } from './controller/students.controller';

@Module({
  controllers: [StudentsController],
  providers: [],
  exports: [],
})
export class StudentsModule {}
