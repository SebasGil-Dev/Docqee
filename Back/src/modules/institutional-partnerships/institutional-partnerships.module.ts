import { Module } from '@nestjs/common';

import { MailModule } from '@/shared/mail/mail.module';
import { InstitutionalPartnershipsController } from './controller/institutional-partnerships.controller';
import { InstitutionalPartnershipsService } from './institutional-partnerships.service';

@Module({
  imports: [MailModule],
  controllers: [InstitutionalPartnershipsController],
  providers: [InstitutionalPartnershipsService],
})
export class InstitutionalPartnershipsModule {}
