import type {
  StudentAgendaAppointment,
  StudentAgendaAppointmentStatus,
  StudentAppointmentFormValues,
  StudentConversation,
  StudentConversationMessage,
  StudentConversationStatus,
  PersonOperationalStatus,
  StudentModuleState,
  StudentProfile,
  StudentProfileFormValues,
  StudentRequest,
  StudentRequestStatus,
  StudentScheduleBlock,
  StudentScheduleBlockFormValues,
  StudentTreatment,
  StudentPracticeSite,
} from '@/content/types';
import { apiRequest } from '@/lib/apiClient';

export function getStudentPortalDashboard() {
  return apiRequest<StudentModuleState>('/student-portal/dashboard');
}

export function updateStudentPortalProfile(values: StudentProfileFormValues) {
  return apiRequest<StudentProfile>('/student-portal/profile', {
    body: values,
    method: 'PATCH',
  });
}

export function toggleStudentPortalTreatmentStatus(treatmentId: string) {
  return apiRequest<{ status: PersonOperationalStatus; treatmentId: string }>(
    `/student-portal/treatments/${treatmentId}/status`,
    {
      method: 'PATCH',
    },
  );
}

export function toggleStudentPortalPracticeSiteStatus(practiceSiteId: string) {
  return apiRequest<{ practiceSiteId: string; status: PersonOperationalStatus }>(
    `/student-portal/practice-sites/${practiceSiteId}/status`,
    {
      method: 'PATCH',
    },
  );
}

export function createStudentPortalScheduleBlock(values: StudentScheduleBlockFormValues) {
  return apiRequest<StudentScheduleBlock>('/student-portal/schedule-blocks', {
    body: values,
    method: 'POST',
  });
}

export function updateStudentPortalScheduleBlock(
  blockId: string,
  values: StudentScheduleBlockFormValues,
) {
  return apiRequest<StudentScheduleBlock>(`/student-portal/schedule-blocks/${blockId}`, {
    body: values,
    method: 'PATCH',
  });
}

export function toggleStudentPortalScheduleBlockStatus(blockId: string) {
  return apiRequest<{ blockId: string; status: PersonOperationalStatus }>(
    `/student-portal/schedule-blocks/${blockId}/status`,
    {
      method: 'PATCH',
    },
  );
}

export function deleteStudentPortalScheduleBlock(blockId: string) {
  return apiRequest<{ blockId: string }>(`/student-portal/schedule-blocks/${blockId}`, {
    method: 'DELETE',
  });
}

export function createStudentPortalAppointment(values: StudentAppointmentFormValues) {
  return apiRequest<StudentAgendaAppointment>('/student-portal/appointments', {
    body: values,
    method: 'POST',
  });
}

export function updateStudentPortalAppointment(
  appointmentId: string,
  values: StudentAppointmentFormValues,
) {
  return apiRequest<StudentAgendaAppointment>(
    `/student-portal/appointments/${appointmentId}`,
    {
      body: values,
      method: 'PATCH',
    },
  );
}

export function updateStudentPortalAppointmentStatus(
  appointmentId: string,
  status: StudentAgendaAppointmentStatus,
) {
  return apiRequest<StudentAgendaAppointment>(
    `/student-portal/appointments/${appointmentId}/status`,
    {
      body: { status },
      method: 'PATCH',
    },
  );
}

export function updateStudentPortalRequestStatus(
  requestId: string,
  status: StudentRequestStatus,
) {
  return apiRequest<StudentRequest>(`/student-portal/requests/${requestId}/status`, {
    body: { status },
    method: 'PATCH',
  });
}

export function getStudentPortalConversations(params?: {
  search?: string;
  status?: StudentConversationStatus;
}) {
  const query = new URLSearchParams();

  if (params?.search) {
    query.set('search', params.search);
  }

  if (params?.status) {
    query.set('status', params.status);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  return apiRequest<StudentConversation[]>(`/student-portal/conversations${suffix}`);
}

export function getStudentPortalConversation(conversationId: string) {
  return apiRequest<StudentConversation>(`/student-portal/conversations/${conversationId}`);
}

export function sendStudentPortalConversationMessage(
  conversationId: string,
  content: string,
) {
  return apiRequest<StudentConversationMessage>(
    `/student-portal/conversations/${conversationId}/messages`,
    {
      body: { content },
      method: 'POST',
    },
  );
}
