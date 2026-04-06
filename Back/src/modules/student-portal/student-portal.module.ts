import { Module } from '@nestjs/common';

import { StudentPortalController } from './controller/student-portal.controller';
import { StudentPortalService } from './student-portal.service';

@Module({
  controllers: [StudentPortalController],
  providers: [StudentPortalService],
  exports: [StudentPortalService],
})
export class StudentPortalModule {}
