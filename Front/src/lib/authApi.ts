import { apiRequest } from '@/lib/apiClient';
import type { AuthSession } from '@/lib/authSession';
import type { NormalizedPatientRegisterPayload } from '@/content/types';

type AuthCodeResponse = {
  cooldownSeconds?: number;
  debugCode?: string;
  email?: string;
  expiresAt?: number;
  message?: string;
  ok: boolean;
};

function toDocumentTypeCode(identifier: string) {
  return identifier.replace(/^document-/i, '').toUpperCase();
}

export function login(email: string, password: string) {
  return apiRequest<AuthSession>('/auth/login', {
    body: {
      email,
      password,
    },
    method: 'POST',
    skipAuth: true,
    skipRefresh: true,
  });
}

export function readCurrentSession() {
  return apiRequest<{
    requiresPasswordChange?: boolean;
    user: AuthSession['user'];
  }>('/auth/me');
}

export function changeFirstLoginPassword(password: string) {
  return apiRequest<{ ok: boolean }>('/auth/first-login/change-password', {
    body: { password },
    method: 'POST',
  });
}

export function registerPatient(payload: NormalizedPatientRegisterPayload) {
  const { documentTypeId: _pd, ...patientRest } = payload.patient;
  return apiRequest<AuthCodeResponse>('/auth/register-patient', {
    body: {
      consents: payload.consents,
      patient: {
        ...patientRest,
        documentTypeCode: toDocumentTypeCode(payload.patient.documentTypeId),
      },
      tutor: payload.tutor
        ? (() => {
            const { documentTypeId: _td, ...tutorRest } = payload.tutor!;
            return {
              ...tutorRest,
              documentTypeCode: toDocumentTypeCode(payload.tutor!.documentTypeId),
            };
          })()
        : null,
    },
    method: 'POST',
  });
}

export function verifyEmail(email: string, code: string) {
  return apiRequest<{ ok: boolean }>('/auth/verify-email', {
    body: {
      code,
      email,
    },
    method: 'POST',
  });
}

export function resendVerification(email: string) {
  return apiRequest<AuthCodeResponse>('/auth/resend-verification', {
    body: { email },
    method: 'POST',
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<AuthCodeResponse>('/auth/forgot-password/request', {
    body: { email },
    method: 'POST',
  });
}

export function verifyPasswordResetCode(email: string, code: string) {
  return apiRequest<{ ok: boolean }>('/auth/forgot-password/verify', {
    body: {
      code,
      email,
    },
    method: 'POST',
  });
}

export function resetPassword(email: string, code: string, password: string) {
  return apiRequest<{ ok: boolean }>('/auth/forgot-password/reset', {
    body: {
      code,
      email,
      password,
    },
    method: 'POST',
  });
}
