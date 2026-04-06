import { PatientAppointmentDto } from './patient-appointment.dto';
import { PatientConversationDto } from './patient-conversation.dto';
import { PatientProfileDto } from './patient-profile.dto';
import { PatientRequestDto } from './patient-request.dto';
import { PatientStudentDirectoryItemDto } from './patient-student-directory-item.dto';

export class PatientPortalDashboardDto {
  appointments!: PatientAppointmentDto[];
  conversations!: PatientConversationDto[];
  profile!: PatientProfileDto;
  requests!: PatientRequestDto[];
  students!: PatientStudentDirectoryItemDto[];
}
