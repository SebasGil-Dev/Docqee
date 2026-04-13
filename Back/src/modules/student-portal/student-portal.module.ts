import { Module } from '@nestjs/common';
import { StorageModule } from '@/shared/storage/storage.module';

import { PrismaStudentPortalRepository } from './infrastructure/repositories/prisma-student-portal.repository';
import { StudentConversationsController } from './controller/student-conversations.controller';
import { StudentPortalController } from './controller/student-portal.controller';
import { StudentPortalRepository } from './domain/repositories/student-portal.repository';
import { StudentPortalService } from './student-portal.service';

@Module({
  imports: [StorageModule],
  controllers: [StudentPortalController, StudentConversationsController],
  providers: [
    StudentPortalService,
    PrismaStudentPortalRepository,
    {
      provide: StudentPortalRepository,
      useClass: PrismaStudentPortalRepository,
    },
  ],
  exports: [StudentPortalService],
})
export class StudentPortalModule {}
