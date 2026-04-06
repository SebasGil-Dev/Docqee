import { Module } from '@nestjs/common';

import { MailModule } from '@/shared/mail/mail.module';
import { PlatformAdminController } from './controller/platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [MailModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
