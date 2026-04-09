import type {
  RegisterStudentFormValues,
  RegisterTeacherFormValues,
  UniversityInstitutionFormValues,
  UniversityInstitutionProfile,
  UniversityPasswordFormValues,
  UniversityStudent,
  UniversityStudentCredential,
  UniversityTeacher,
} from '@/content/types';
import { apiRequest } from '@/lib/apiClient';

function toDocumentTypeCode(identifier: string) {
  return identifier.replace(/^document-/i, '').toUpperCase();
}

export function getUniversityAdminProfile() {
  return apiRequest<UniversityInstitutionProfile>('/university-admin/profile');
}

export function updateUniversityAdminProfile(values: UniversityInstitutionFormValues) {
  return apiRequest<UniversityInstitutionProfile>('/university-admin/profile', {
    body: {
      adminEmail: values.adminEmail,
      adminFirstName: values.adminFirstName,
      adminLastName: values.adminLastName,
      adminPhone: values.adminPhone,
      campuses: values.campuses.map((campus) => ({
        address: campus.address,
        cityId: campus.cityId,
        id: campus.id,
        localityId: campus.localityId,
        name: campus.name,
        status: campus.status,
      })),
      cityId: values.cityId,
      logoSrc: values.logoSrc,
      mainLocalityId: values.mainLocalityId,
      universityName: values.name,
    },
    method: 'PATCH',
  });
}

export function changeUniversityAdminPassword(values: UniversityPasswordFormValues) {
  return apiRequest<{ ok: boolean }>('/university-admin/password', {
    body: {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    },
    method: 'PATCH',
  });
}

export function listUniversityStudents() {
  return apiRequest<UniversityStudent[]>('/students');
}

export function createUniversityStudent(values: RegisterStudentFormValues) {
  return apiRequest<UniversityStudent>('/students', {
    body: {
      documentNumber: values.documentNumber,
      documentType: toDocumentTypeCode(values.documentTypeId),
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      semester: Number(values.semester),
    },
    method: 'POST',
  });
}

export function toggleUniversityStudentStatus(studentId: string) {
  return apiRequest<{ status: UniversityStudent['status']; studentId: string }>(
    `/students/${studentId}/status`,
    {
      method: 'PATCH',
    },
  );
}

export function listUniversityTeachers() {
  return apiRequest<UniversityTeacher[]>('/teachers');
}

export function createUniversityTeacher(values: RegisterTeacherFormValues) {
  return apiRequest<UniversityTeacher>('/teachers', {
    body: {
      documentNumber: values.documentNumber,
      documentType: toDocumentTypeCode(values.documentTypeId),
      firstName: values.firstName,
      lastName: values.lastName,
    },
    method: 'POST',
  });
}

export function toggleUniversityTeacherStatus(teacherId: string) {
  return apiRequest<{ status: UniversityTeacher['status']; teacherId: string }>(
    `/teachers/${teacherId}/status`,
    {
      method: 'PATCH',
    },
  );
}

export function listUniversityStudentCredentials() {
  return apiRequest<UniversityStudentCredential[]>('/credentials/students');
}

export function editUniversityStudentCredentialEmail(credentialId: string, email: string) {
  return apiRequest<{ ok: boolean }>(`/credentials/students/${credentialId}/email`, {
    body: { email },
    method: 'PATCH',
  });
}

export function sendUniversityStudentCredential(credentialId: string) {
  return apiRequest<{ temporaryPassword: string }>(`/credentials/students/${credentialId}/send`, {
    method: 'POST',
  });
}

export function resendUniversityStudentCredential(credentialId: string) {
  return apiRequest<{ temporaryPassword: string }>(
    `/credentials/students/${credentialId}/resend`,
    {
      method: 'POST',
    },
  );
}

export function sendAllUniversityStudentCredentials() {
  return apiRequest<{ sentCount: number }>('/credentials/students/send-all', {
    method: 'POST',
  });
}

export function deleteUniversityStudentCredential(credentialId: string) {
  return apiRequest<{ ok: boolean }>(`/credentials/students/${credentialId}`, {
    method: 'DELETE',
  });
}
