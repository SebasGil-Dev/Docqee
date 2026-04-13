import { PatientAppointmentDto } from './patient-appointment.dto';
import { PatientAppointmentReviewDto } from './patient-appointment-review.dto';
import { PatientConversationDto } from './patient-conversation.dto';
import { PatientProfileDto } from './patient-profile.dto';
import { PatientRequestDto } from './patient-request.dto';
import { PatientStudentDirectoryItemDto } from './patient-student-directory-item.dto';

export class PatientPortalDashboardDto {
  appointments!: PatientAppointmentDto[];
  conversations!: PatientConversationDto[];
  profile!: PatientProfileDto;
  reviews!: PatientAppointmentReviewDto[];
  requests!: PatientRequestDto[];
  students!: PatientStudentDirectoryItemDto[];
}
