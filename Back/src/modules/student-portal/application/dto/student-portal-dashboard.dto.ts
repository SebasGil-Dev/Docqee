import { StudentAgendaAppointmentDto } from './student-agenda-appointment.dto';
import { StudentAppointmentReviewDto } from './student-appointment-review.dto';
import { StudentConversationDto } from './student-conversation.dto';
import { StudentPracticeSiteDto } from './student-practice-site.dto';
import { StudentProfileDto } from './student-profile.dto';
import { StudentRequestDto } from './student-request.dto';
import { StudentScheduleBlockDto } from './student-schedule-block.dto';
import { StudentSupervisorDto } from './student-supervisor.dto';
import { StudentTreatmentDto } from './student-treatment.dto';

export class StudentPortalDashboardDto {
  appointments!: StudentAgendaAppointmentDto[];
  conversations!: StudentConversationDto[];
  practiceSites!: StudentPracticeSiteDto[];
  profile!: StudentProfileDto;
  requests!: StudentRequestDto[];
  reviews!: StudentAppointmentReviewDto[];
  scheduleBlocks!: StudentScheduleBlockDto[];
  supervisors!: StudentSupervisorDto[];
  treatments!: StudentTreatmentDto[];
}
