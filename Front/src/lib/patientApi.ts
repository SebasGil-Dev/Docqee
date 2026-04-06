import type {
  PatientAppointment,
  PatientAppointmentStatus,
  PatientConversationMessage,
  PatientModuleState,
  PatientProfile,
  PatientProfileFormValues,
  PatientRequest,
  PatientRequestStatus,
} from '@/content/types';
import { apiRequest } from '@/lib/apiClient';

export function getPatientPortalDashboard() {
  return apiRequest<PatientModuleState>('/patient-portal/dashboard');
}

export function updatePatientPortalProfile(values: PatientProfileFormValues) {
  return apiRequest<PatientProfile>('/patient-portal/profile', {
    body: values,
    method: 'PATCH',
  });
}

export function createPatientPortalRequest(studentId: string, reason: string) {
  return apiRequest<PatientRequest>('/patient-portal/requests', {
    body: { reason, studentId },
    method: 'POST',
  });
}

export function updatePatientPortalRequestStatus(
  requestId: string,
  status: PatientRequestStatus,
) {
  return apiRequest<PatientRequest>(`/patient-portal/requests/${requestId}/status`, {
    body: { status },
    method: 'PATCH',
  });
}

export function sendPatientPortalConversationMessage(
  conversationId: string,
  content: string,
) {
  return apiRequest<PatientConversationMessage>(
    `/patient-portal/conversations/${conversationId}/messages`,
    {
      body: { content },
      method: 'POST',
    },
  );
}

export function updatePatientPortalAppointmentStatus(
  appointmentId: string,
  status: PatientAppointmentStatus,
) {
  return apiRequest<PatientAppointment>(`/patient-portal/appointments/${appointmentId}/status`, {
    body: { status },
    method: 'PATCH',
  });
}
