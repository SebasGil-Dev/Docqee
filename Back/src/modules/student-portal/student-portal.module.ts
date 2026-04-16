import { Module } from '@nestjs/common';
import { StorageModule } from '@/shared/storage/storage.module';

import { PrismaStudentPortalRepository } from './infrastructure/repositories/prisma-student-portal.repository';
import { StudentAppointmentsController } from './controller/student-appointments.controller';
import { StudentConversationsController } from './controller/student-conversations.controller';
import { StudentPortalController } from './controller/student-portal.controller';
import { StudentPortalRepository } from './domain/repositories/student-portal.repository';
import { StudentPortalService } from './student-portal.service';

@Module({
  imports: [StorageModule],
  controllers: [StudentPortalController, StudentConversationsController, StudentAppointmentsController],
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
