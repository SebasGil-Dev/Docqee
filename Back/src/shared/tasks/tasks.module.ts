import { Module } from '@nestjs/common';

import { PrismaModule } from '@/shared/database/prisma.module';
import { MailModule } from '@/shared/mail/mail.module';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [TasksService],
})
export class TasksModule {}
