import type {
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

export function updateStudentPortalRequestStatus(
  requestId: string,
  status: StudentRequestStatus,
) {
  return apiRequest<StudentRequest>(`/student-portal/requests/${requestId}/status`, {
    body: { status },
    method: 'PATCH',
  });
}
