import { Module } from '@nestjs/common';
import { UniversityAdminController } from './controller/university-admin.controller';
import { UniversityAdminService } from './university-admin.service';

@Module({
  controllers: [UniversityAdminController],
  providers: [UniversityAdminService],
  exports: [UniversityAdminService],
})
export class UniversityAdminModule {}
