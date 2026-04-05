import type {
  VerifyEmailResendInput,
  VerifyEmailResendResult,
  VerifyEmailService,
  VerifyEmailServiceInput,
  VerifyEmailVerificationResult,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  resendVerification as resendVerificationRequest,
  verifyEmail as verifyEmailRequest,
} from '@/lib/authApi';

export const PENDING_VERIFICATION_EMAIL_KEY = 'docqee.pending-verification-email';
export const VERIFY_EMAIL_COOLDOWN_UNTIL_KEY = 'docqee.verify-email-cooldown-until';
export const VERIFY_EMAIL_DEBUG_CODE_KEY = 'docqee.verify-email-debug-code';
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

function readSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function persistPendingVerificationEmail(email: string) {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email);
}

export function readPendingVerificationEmail() {
  const storage = readSessionStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export function clearPendingVerificationEmail() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
  storage.removeItem(VERIFY_EMAIL_DEBUG_CODE_KEY);
}

export function persistVerifyEmailCooldown(cooldownSeconds: number) {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  const expiresAt = Date.now() + cooldownSeconds * 1000;
  storage.setItem(VERIFY_EMAIL_COOLDOWN_UNTIL_KEY, String(expiresAt));
}

export function readVerifyEmailCooldownSeconds() {
  const storage = readSessionStorage();

  if (!storage) {
    return 0;
  }

  const rawExpiresAt = storage.getItem(VERIFY_EMAIL_COOLDOWN_UNTIL_KEY);

  if (!rawExpiresAt) {
    return 0;
  }

  const expiresAt = Number(rawExpiresAt);

  if (!Number.isFinite(expiresAt)) {
    storage.removeItem(VERIFY_EMAIL_COOLDOWN_UNTIL_KEY);
    return 0;
  }

  const remainingSeconds = Math.ceil((expiresAt - Date.now()) / 1000);

  if (remainingSeconds <= 0) {
    storage.removeItem(VERIFY_EMAIL_COOLDOWN_UNTIL_KEY);
    return 0;
  }

  return remainingSeconds;
}

export function clearVerifyEmailCooldown() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(VERIFY_EMAIL_COOLDOWN_UNTIL_KEY);
}

export function persistVerifyEmailDebugCode(code: string) {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(VERIFY_EMAIL_DEBUG_CODE_KEY, code);
}

export function readVerifyEmailDebugCode() {
  const storage = readSessionStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem(VERIFY_EMAIL_DEBUG_CODE_KEY);
}

function isSixDigitCode(value: string) {
  return /^\d{6}$/.test(value);
}

function resolveVerifyFailureReason(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('expiro')) {
    return 'expired';
  }

  if (normalizedMessage.includes('6 digitos') || normalizedMessage.includes('6 dígitos')) {
    return 'invalid_format';
  }

  if (normalizedMessage.includes('no encontramos el correo')) {
    return 'missing_email';
  }

  return 'invalid';
}

function resolveResendFailureReason(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('ya se encuentra verificado')) {
    return 'rate_limited';
  }

  if (normalizedMessage.includes('no encontramos el correo')) {
    return 'missing_email';
  }

  return 'rate_limited';
}

function verifyCodeMock(input: VerifyEmailServiceInput): VerifyEmailVerificationResult {
  const email = input.email.trim();
  const code = input.code.trim();

  if (!email) {
    return {
      message: 'No encontramos el correo a verificar. Vuelve al registro para solicitar un código.',
      ok: false,
      reason: 'missing_email',
    };
  }

  if (!isSixDigitCode(code)) {
    return {
      message: 'Ingresa un código válido de 6 dígitos.',
      ok: false,
      reason: 'invalid_format',
    };
  }

  return { ok: true };
}

function resendCodeMock(input: VerifyEmailResendInput): VerifyEmailResendResult {
  const email = input.email.trim();

  if (!email) {
    return {
      message: 'No encontramos el correo asociado para reenviar el código.',
      ok: false,
      reason: 'missing_email',
    };
  }

  return {
    cooldownSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
    message: 'Preparamos el reenvío del código a tu correo.',
    ok: true,
  };
}

async function verifyCodeRuntime(
  input: VerifyEmailServiceInput,
): Promise<VerifyEmailVerificationResult> {
  const email = input.email.trim();
  const code = input.code.trim();

  if (!email) {
    return {
      message: 'No encontramos el correo a verificar. Vuelve al registro para solicitar un codigo.',
      ok: false,
      reason: 'missing_email',
    };
  }

  if (!isSixDigitCode(code)) {
    return {
      message: 'Ingresa un codigo valido de 6 digitos.',
      ok: false,
      reason: 'invalid_format',
    };
  }

  try {
    await verifyEmailRequest(email, code);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos verificar el codigo en este momento.';

    return {
      message,
      ok: false,
      reason: resolveVerifyFailureReason(message),
    };
  }
}

async function resendCodeRuntime(input: VerifyEmailResendInput): Promise<VerifyEmailResendResult> {
  const email = input.email.trim();

  if (!email) {
    return {
      message: 'No encontramos el correo asociado para reenviar el codigo.',
      ok: false,
      reason: 'missing_email',
    };
  }

  try {
    const result = await resendVerificationRequest(email);

    if (typeof result.debugCode === 'string') {
      persistVerifyEmailDebugCode(result.debugCode);
    }

    return {
      cooldownSeconds: result.cooldownSeconds ?? DEFAULT_RESEND_COOLDOWN_SECONDS,
      message: result.message ?? 'Preparamos el reenvio del codigo a tu correo.',
      ok: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No pudimos reenviar el codigo en este momento.';

    return {
      message,
      ok: false,
      reason: resolveResendFailureReason(message),
    };
  }
}

export const verifyEmailService: VerifyEmailService = {
  resendCode(input) {
    if (IS_TEST_MODE) {
      return resendCodeMock(input);
    }

    return resendCodeRuntime(input);
  },
  verifyCode(input) {
    if (IS_TEST_MODE) {
      return verifyCodeMock(input);
    }

    return verifyCodeRuntime(input);
  },
};
