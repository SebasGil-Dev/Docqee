import { StudentPracticeSiteDto } from './student-practice-site.dto';
import { StudentProfileDto } from './student-profile.dto';
import { StudentRequestDto } from './student-request.dto';
import { StudentScheduleBlockDto } from './student-schedule-block.dto';
import { StudentTreatmentDto } from './student-treatment.dto';

export class StudentPortalDashboardDto {
  profile!: StudentProfileDto;
  treatments!: StudentTreatmentDto[];
  practiceSites!: StudentPracticeSiteDto[];
  scheduleBlocks!: StudentScheduleBlockDto[];
  requests!: StudentRequestDto[];
}
