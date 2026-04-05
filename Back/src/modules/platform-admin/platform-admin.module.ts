import { Module } from '@nestjs/common';
import { PlatformAdminController } from './controller/platform-admin.controller';

@Module({
  controllers: [PlatformAdminController],
  providers: [],
  exports: [],
})
export class PlatformAdminModule {}
