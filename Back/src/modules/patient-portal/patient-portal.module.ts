import { Module } from '@nestjs/common';

import { StorageModule } from '@/shared/storage/storage.module';
import { PrismaPatientPortalRepository } from './infrastructure/repositories/prisma-patient-portal.repository';
import { PatientConversationsController } from './controller/patient-conversations.controller';
import { PatientPortalController } from './controller/patient-portal.controller';
import { PatientPortalRepository } from './domain/repositories/patient-portal.repository';
import { PatientPortalService } from './patient-portal.service';

@Module({
  imports: [StorageModule],
  controllers: [PatientPortalController, PatientConversationsController],
  providers: [
    PatientPortalService,
    PrismaPatientPortalRepository,
    {
      provide: PatientPortalRepository,
      useClass: PrismaPatientPortalRepository,
    },
  ],
  exports: [PatientPortalService],
})
export class PatientPortalModule {}
