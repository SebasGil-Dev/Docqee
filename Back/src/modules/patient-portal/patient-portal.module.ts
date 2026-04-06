import { Module } from '@nestjs/common';

import { PatientConversationsController } from './controller/patient-conversations.controller';
import { PatientPortalController } from './controller/patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';

@Module({
  controllers: [PatientPortalController, PatientConversationsController],
  providers: [PatientPortalService],
  exports: [PatientPortalService],
})
export class PatientPortalModule {}
