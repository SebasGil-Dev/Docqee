import { Module } from '@nestjs/common';
import { UniversityAdminController } from './controller/university-admin.controller';

@Module({
  controllers: [UniversityAdminController],
  providers: [],
  exports: [],
})
export class UniversityAdminModule {}
