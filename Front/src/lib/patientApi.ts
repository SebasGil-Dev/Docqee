import type {
  PatientAppointment,
  PatientAppointmentStatus,
  PatientConversation,
  PatientConversationMessage,
  PatientModuleState,
  PatientProfile,
  PatientProfileFormValues,
  PatientRequest,
  PatientRequestStatus,
  PatientStudentDirectoryItem,
} from '@/content/types';
import { apiRequest } from '@/lib/apiClient';

export type PatientStudentDirectorySearchParams = {
  city?: string;
  limit?: number;
  locality?: string;
  search?: string;
  treatment?: string;
  university?: string;
};

function appendDirectoryParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
) {
  if (value === undefined) {
    return;
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue || normalizedValue === 'all') {
    return;
  }

  params.set(key, normalizedValue);
}

export function getPatientPortalDashboard() {
  return apiRequest<PatientModuleState>('/patient-portal/dashboard');
}

export function getPatientPortalStudents(filters: PatientStudentDirectorySearchParams) {
  const params = new URLSearchParams();

  appendDirectoryParam(params, 'search', filters.search);
  appendDirectoryParam(params, 'treatment', filters.treatment);
  appendDirectoryParam(params, 'city', filters.city);
  appendDirectoryParam(params, 'locality', filters.locality);
  appendDirectoryParam(params, 'university', filters.university);
  appendDirectoryParam(params, 'limit', filters.limit);

  const queryString = params.toString();

  return apiRequest<PatientStudentDirectoryItem[]>(
    `/patient-portal/students${queryString ? `?${queryString}` : ''}`,
  );
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

export function getPatientPortalConversation(conversationId: string) {
  return apiRequest<PatientConversation>(`/patient-portal/conversations/${conversationId}`);
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

export function submitPatientPortalAppointmentReview(
  appointmentId: string,
  rating: number,
  comment?: string,
) {
  return apiRequest<PatientAppointment>(`/patient-portal/appointments/${appointmentId}/review`, {
    body: { comment, rating },
    method: 'POST',
  });
}
