import type {
  AdminUniversity,
  PendingCredential,
  RegisterUniversityFormValues,
} from '@/content/types';
import { apiRequest } from '@/lib/apiClient';

export function getPlatformAdminOverview() {
  return apiRequest<{
    credentials: PendingCredential[];
    universities: AdminUniversity[];
  }>('/platform-admin/overview');
}

export function listPlatformAdminUniversities() {
  return apiRequest<AdminUniversity[]>('/platform-admin/universities');
}

export function createPlatformAdminUniversity(values: RegisterUniversityFormValues) {
  return apiRequest<AdminUniversity>('/platform-admin/universities', {
    body: values,
    method: 'POST',
  });
}

export function togglePlatformAdminUniversityStatus(universityId: string) {
  return apiRequest<AdminUniversity>(`/platform-admin/universities/${universityId}/status`, {
    method: 'PATCH',
  });
}

export function listPlatformAdminCredentials() {
  return apiRequest<PendingCredential[]>('/platform-admin/credentials');
}

export function sendPlatformAdminCredential(credentialId: string) {
  return apiRequest<{ credential: PendingCredential; temporaryPassword: string }>(
    `/platform-admin/credentials/${credentialId}/send`,
    {
      method: 'POST',
    },
  );
}

export function resendPlatformAdminCredential(credentialId: string) {
  return apiRequest<{ credential: PendingCredential; temporaryPassword: string }>(
    `/platform-admin/credentials/${credentialId}/resend`,
    {
      method: 'POST',
    },
  );
}

export function deletePlatformAdminCredential(credentialId: string) {
  return apiRequest<{ ok: boolean }>(`/platform-admin/credentials/${credentialId}`, {
    method: 'DELETE',
  });
}
