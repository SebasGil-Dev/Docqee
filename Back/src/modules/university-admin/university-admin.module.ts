import { Module } from '@nestjs/common';
import { StorageModule } from '@/shared/storage/storage.module';
import { UniversityAdminController } from './controller/university-admin.controller';
import { UniversityAdminService } from './university-admin.service';

@Module({
  imports: [StorageModule],
  controllers: [UniversityAdminController],
  providers: [UniversityAdminService],
  exports: [UniversityAdminService],
})
export class UniversityAdminModule {}
