import { Module } from '@nestjs/common';

import { PrismaStudentPortalRepository } from './infrastructure/repositories/prisma-student-portal.repository';
import { StudentPortalController } from './controller/student-portal.controller';
import { StudentPortalRepository } from './domain/repositories/student-portal.repository';
import { StudentPortalService } from './student-portal.service';

@Module({
  controllers: [StudentPortalController],
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
