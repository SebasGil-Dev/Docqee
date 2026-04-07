import { Module } from '@nestjs/common';

import { MailModule } from '@/shared/mail/mail.module';
import { CredentialsController } from './controller/credentials.controller';
import { CredentialsService } from './credentials.service';

@Module({
  imports: [MailModule],
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
