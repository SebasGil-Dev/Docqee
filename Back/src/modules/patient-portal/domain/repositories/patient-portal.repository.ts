import { CreatePatientAppointmentReviewDto } from '../../application/dto/create-patient-appointment-review.dto';
import { CreatePatientRequestDto } from '../../application/dto/create-patient-request.dto';
import { PatientAppointmentDto } from '../../application/dto/patient-appointment.dto';
import { PatientConversationDto } from '../../application/dto/patient-conversation.dto';
import { PatientConversationMessageDto } from '../../application/dto/patient-conversation-message.dto';
import { PatientPortalDashboardDto } from '../../application/dto/patient-portal-dashboard.dto';
import { PatientProfileDto } from '../../application/dto/patient-profile.dto';
import { PatientRequestDto } from '../../application/dto/patient-request.dto';
import { PatientStudentDirectoryItemDto } from '../../application/dto/patient-student-directory-item.dto';
import { PatientStudentDirectoryQueryDto } from '../../application/dto/patient-student-directory-query.dto';
import { UpdatePatientAppointmentStatusDto } from '../../application/dto/update-patient-appointment-status.dto';
import { UpdatePatientProfileDto } from '../../application/dto/update-patient-profile.dto';
import { UpdatePatientRequestStatusDto } from '../../application/dto/update-patient-request-status.dto';

export abstract class PatientPortalRepository {
  abstract getDashboard(patientAccountId: number): Promise<PatientPortalDashboardDto>;

  abstract getStudentDirectory(
    patientAccountId: number,
    query: PatientStudentDirectoryQueryDto,
  ): Promise<PatientStudentDirectoryItemDto[]>;

  abstract updateProfile(
    patientAccountId: number,
    payload: UpdatePatientProfileDto,
  ): Promise<PatientProfileDto>;

  abstract createRequest(
    patientAccountId: number,
    payload: CreatePatientRequestDto,
  ): Promise<PatientRequestDto>;

  abstract updateRequestStatus(
    patientAccountId: number,
    requestId: number,
    payload: UpdatePatientRequestStatusDto,
  ): Promise<PatientRequestDto>;

  abstract updateAppointmentStatus(
    patientAccountId: number,
    appointmentId: number,
    payload: UpdatePatientAppointmentStatusDto,
  ): Promise<PatientAppointmentDto>;

  abstract createAppointmentReview(
    patientAccountId: number,
    appointmentId: number,
    payload: CreatePatientAppointmentReviewDto,
  ): Promise<PatientAppointmentDto>;

  abstract getConversation(
    patientAccountId: number,
    conversationId: number,
  ): Promise<PatientConversationDto | null>;

  abstract sendConversationMessage(
    patientAccountId: number,
    conversationId: number,
    content: string,
  ): Promise<PatientConversationMessageDto>;
}
