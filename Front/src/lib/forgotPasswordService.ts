import type {
  ForgotPasswordRequestCodeInput,
  ForgotPasswordRequestCodeResult,
  ForgotPasswordResetPasswordInput,
  ForgotPasswordResetPasswordResult,
  ForgotPasswordService,
  ForgotPasswordVerifyCodeInput,
  ForgotPasswordVerifyCodeResult,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  requestPasswordReset as requestPasswordResetRequest,
  resetPassword as resetPasswordRequest,
  verifyPasswordResetCode as verifyPasswordResetCodeRequest,
} from '@/lib/authApi';

export const FORGOT_PASSWORD_RECOVERY_SESSION_KEY = 'docqee.forgot-password-recovery-session';
export const PASSWORD_RESET_SUCCESS_NOTICE_KEY = 'docqee.password-reset-success-notice';

const CODE_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_SECONDS = 15 * 60;

export type ForgotPasswordRecoverySession = {
  attemptCount: number;
  blockedUntil: number | null;
  code: string;
  codeValidated: boolean;
  cooldownUntil: number | null;
  email: string;
  expiresAt: number | null;
};

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getRemainingSeconds(target: number | null) {
  if (!target) {
    return 0;
  }

  const remainingSeconds = Math.ceil((target - Date.now()) / 1000);
  return remainingSeconds > 0 ? remainingSeconds : 0;
}

function isSixDigitCode(value: string) {
  return /^\d{6}$/.test(value);
}

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function createSecurityCode() {
  return '123456';
}

function writeForgotPasswordRecoverySession(session: ForgotPasswordRecoverySession) {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(FORGOT_PASSWORD_RECOVERY_SESSION_KEY, JSON.stringify(session));
}

export function persistForgotPasswordRecoverySession(session: ForgotPasswordRecoverySession) {
  writeForgotPasswordRecoverySession(session);
}

export function readForgotPasswordRecoverySession() {
  const storage = readSessionStorage();

  if (!storage) {
    return null;
  }

  const rawSession = storage.getItem(FORGOT_PASSWORD_RECOVERY_SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession) as Partial<ForgotPasswordRecoverySession>;

    if (
      typeof parsedSession.email !== 'string' ||
      typeof parsedSession.code !== 'string' ||
      typeof parsedSession.codeValidated !== 'boolean' ||
      typeof parsedSession.attemptCount !== 'number'
    ) {
      storage.removeItem(FORGOT_PASSWORD_RECOVERY_SESSION_KEY);
      return null;
    }

    return {
      attemptCount: parsedSession.attemptCount,
      blockedUntil:
        typeof parsedSession.blockedUntil === 'number' ? parsedSession.blockedUntil : null,
      code: parsedSession.code,
      codeValidated: parsedSession.codeValidated,
      cooldownUntil:
        typeof parsedSession.cooldownUntil === 'number' ? parsedSession.cooldownUntil : null,
      email: parsedSession.email,
      expiresAt: typeof parsedSession.expiresAt === 'number' ? parsedSession.expiresAt : null,
    } satisfies ForgotPasswordRecoverySession;
  } catch {
    storage.removeItem(FORGOT_PASSWORD_RECOVERY_SESSION_KEY);
    return null;
  }
}

export function clearForgotPasswordRecoverySession() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(FORGOT_PASSWORD_RECOVERY_SESSION_KEY);
}

export function readForgotPasswordCooldownSeconds() {
  return getRemainingSeconds(readForgotPasswordRecoverySession()?.cooldownUntil ?? null);
}

export function readForgotPasswordExpirySeconds() {
  return getRemainingSeconds(readForgotPasswordRecoverySession()?.expiresAt ?? null);
}

export function readForgotPasswordBlockedSeconds() {
  return getRemainingSeconds(readForgotPasswordRecoverySession()?.blockedUntil ?? null);
}

export function persistPasswordResetSuccessNotice(message: string) {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(PASSWORD_RESET_SUCCESS_NOTICE_KEY, message);
}

export function readPasswordResetSuccessNotice() {
  const storage = readSessionStorage();

  if (!storage) {
    return null;
  }

  return storage.getItem(PASSWORD_RESET_SUCCESS_NOTICE_KEY);
}

export function clearPasswordResetSuccessNotice() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(PASSWORD_RESET_SUCCESS_NOTICE_KEY);
}

function upsertRecoverySession(email: string) {
  const expiresAt = Date.now() + CODE_EXPIRY_SECONDS * 1000;
  const cooldownUntil = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
  const nextSession: ForgotPasswordRecoverySession = {
    attemptCount: 0,
    blockedUntil: null,
    code: createSecurityCode(),
    codeValidated: false,
    cooldownUntil,
    email,
    expiresAt,
  };

  writeForgotPasswordRecoverySession(nextSession);

  return {
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    expiresAt,
  };
}

function requestResetCodeMock(input: ForgotPasswordRequestCodeInput): ForgotPasswordRequestCodeResult {
  const email = normalizeEmail(input.email);

  if (!email) {
    return {
      ok: false,
      reason: 'unexpected',
    };
  }

  const currentSession = readForgotPasswordRecoverySession();

  if (currentSession?.email === email) {
    const remainingCooldownSeconds = getRemainingSeconds(currentSession.cooldownUntil);

    if (remainingCooldownSeconds > 0) {
      return {
        cooldownSeconds: remainingCooldownSeconds,
        ok: false,
        reason: 'rate_limited',
      };
    }
  }

  return {
    ok: true,
    ...upsertRecoverySession(email),
  };
}

function resendResetCodeMock(input: ForgotPasswordRequestCodeInput): ForgotPasswordRequestCodeResult {
  const email = normalizeEmail(input.email);

  if (!email) {
    return {
      ok: false,
      reason: 'unexpected',
    };
  }

  const currentSession = readForgotPasswordRecoverySession();

  if (currentSession?.email === email) {
    const remainingCooldownSeconds = getRemainingSeconds(currentSession.cooldownUntil);

    if (remainingCooldownSeconds > 0) {
      return {
        cooldownSeconds: remainingCooldownSeconds,
        ok: false,
        reason: 'rate_limited',
      };
    }
  }

  return {
    ok: true,
    ...upsertRecoverySession(email),
  };
}

function verifyResetCodeMock(input: ForgotPasswordVerifyCodeInput): ForgotPasswordVerifyCodeResult {
  const email = normalizeEmail(input.email);
  const code = input.code.trim();

  if (!isSixDigitCode(code)) {
    return {
      ok: false,
      reason: 'invalid_format',
    };
  }

  const currentSession = readForgotPasswordRecoverySession();

  if (currentSession?.email !== email) {
    return {
      ok: false,
      reason: 'invalid',
    };
  }

  if (!currentSession) {
    return {
      ok: false,
      reason: 'invalid',
    };
  }

  const remainingBlockedSeconds = getRemainingSeconds(currentSession.blockedUntil);

  if (remainingBlockedSeconds > 0) {
    return {
      blockedSeconds: remainingBlockedSeconds,
      ok: false,
      reason: 'blocked',
    };
  }

  const remainingExpirySeconds = getRemainingSeconds(currentSession.expiresAt);

  if (remainingExpirySeconds <= 0) {
    return {
      ok: false,
      reason: 'expired',
    };
  }

  if (currentSession.code !== code) {
    const nextAttemptCount = currentSession.attemptCount + 1;

    if (nextAttemptCount >= MAX_FAILED_ATTEMPTS) {
      const blockedUntil = Date.now() + BLOCK_DURATION_SECONDS * 1000;

      writeForgotPasswordRecoverySession({
        ...currentSession,
        attemptCount: nextAttemptCount,
        blockedUntil,
        codeValidated: false,
      });

      return {
        blockedSeconds: BLOCK_DURATION_SECONDS,
        ok: false,
        reason: 'attempts_exceeded',
      };
    }

    writeForgotPasswordRecoverySession({
      ...currentSession,
      attemptCount: nextAttemptCount,
      codeValidated: false,
    });

    return {
      ok: false,
      reason: 'invalid',
    };
  }

  writeForgotPasswordRecoverySession({
    ...currentSession,
    attemptCount: 0,
    blockedUntil: null,
    codeValidated: true,
  });

  return { ok: true };
}

function resetPasswordMock(input: ForgotPasswordResetPasswordInput): ForgotPasswordResetPasswordResult {
  const email = normalizeEmail(input.email);
  const code = input.code.trim();
  const password = input.password;
  const currentSession = readForgotPasswordRecoverySession();

  if (currentSession?.email !== email || currentSession?.codeValidated !== true) {
    return {
      ok: false,
      reason: 'session_invalid',
    };
  }

  if (!currentSession) {
    return {
      ok: false,
      reason: 'session_invalid',
    };
  }

  if (getRemainingSeconds(currentSession.expiresAt) <= 0) {
    return {
      ok: false,
      reason: 'code_expired',
    };
  }

  if (!isSixDigitCode(code) || currentSession.code !== code) {
    return {
      ok: false,
      reason: 'code_invalid',
    };
  }

  if (!isStrongPassword(password)) {
    return {
      ok: false,
      reason: 'password_invalid',
    };
  }

  clearForgotPasswordRecoverySession();

  return { ok: true };
}

function buildRuntimeRecoverySession(
  email: string,
  code: string,
  cooldownSeconds: number,
  expiresAt: number,
  currentSession?: ForgotPasswordRecoverySession | null,
) {
  return {
    attemptCount: currentSession?.attemptCount ?? 0,
    blockedUntil: currentSession?.blockedUntil ?? null,
    code,
    codeValidated: false,
    cooldownUntil: Date.now() + cooldownSeconds * 1000,
    email,
    expiresAt,
  } satisfies ForgotPasswordRecoverySession;
}

async function requestResetCodeRuntime(
  input: ForgotPasswordRequestCodeInput,
): Promise<ForgotPasswordRequestCodeResult> {
  const email = normalizeEmail(input.email);

  if (!email) {
    return {
      ok: false,
      reason: 'unexpected',
    };
  }

  try {
    const result = await requestPasswordResetRequest(email);
    const cooldownSeconds = result.cooldownSeconds ?? RESEND_COOLDOWN_SECONDS;
    const expiresAt = result.expiresAt ?? Date.now() + CODE_EXPIRY_SECONDS * 1000;

    writeForgotPasswordRecoverySession(
      buildRuntimeRecoverySession(email, '', cooldownSeconds, expiresAt),
    );

    return {
      cooldownSeconds,
      expiresAt,
      ok: true,
    };
  } catch {
    return {
      ok: false,
      reason: 'unexpected',
    };
  }
}

async function resendResetCodeRuntime(
  input: ForgotPasswordRequestCodeInput,
): Promise<ForgotPasswordRequestCodeResult> {
  const email = normalizeEmail(input.email);

  if (!email) {
    return {
      ok: false,
      reason: 'unexpected',
    };
  }

  try {
    const result = await requestPasswordResetRequest(email);
    const currentSession = readForgotPasswordRecoverySession();
    const cooldownSeconds = result.cooldownSeconds ?? RESEND_COOLDOWN_SECONDS;
    const expiresAt = result.expiresAt ?? Date.now() + CODE_EXPIRY_SECONDS * 1000;

    writeForgotPasswordRecoverySession(
      buildRuntimeRecoverySession(email, '', cooldownSeconds, expiresAt, currentSession),
    );

    return {
      cooldownSeconds,
      expiresAt,
      ok: true,
    };
  } catch {
    return {
      ok: false,
      reason: 'unexpected',
    };
  }
}

async function verifyResetCodeRuntime(
  input: ForgotPasswordVerifyCodeInput,
): Promise<ForgotPasswordVerifyCodeResult> {
  const email = normalizeEmail(input.email);
  const code = input.code.trim();

  if (!isSixDigitCode(code)) {
    return {
      ok: false,
      reason: 'invalid_format',
    };
  }

  try {
    await verifyPasswordResetCodeRequest(email, code);

    const currentSession = readForgotPasswordRecoverySession();

    if (currentSession?.email === email) {
      writeForgotPasswordRecoverySession({
        ...currentSession,
        attemptCount: 0,
        blockedUntil: null,
        code,
        codeValidated: true,
      });
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    return {
      ok: false,
      reason: message.includes('expiro') ? 'expired' : 'invalid',
    };
  }
}

async function resetPasswordRuntime(
  input: ForgotPasswordResetPasswordInput,
): Promise<ForgotPasswordResetPasswordResult> {
  const email = normalizeEmail(input.email);
  const currentSession = readForgotPasswordRecoverySession();

  if (currentSession?.email !== email || currentSession.codeValidated !== true) {
    return {
      ok: false,
      reason: 'session_invalid',
    };
  }

  try {
    await resetPasswordRequest(email, input.code.trim(), input.password);
    clearForgotPasswordRecoverySession();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';

    if (message.includes('expiro')) {
      return {
        ok: false,
        reason: 'code_expired',
      };
    }

    if (message.includes('no es valido')) {
      return {
        ok: false,
        reason: 'code_invalid',
      };
    }

    if (message.includes('contrasena') || message.includes('contraseña')) {
      return {
        ok: false,
        reason: 'password_invalid',
      };
    }

    return {
      ok: false,
      reason: 'unexpected',
    };
  }
}

export const forgotPasswordService: ForgotPasswordService = {
  requestResetCode(input) {
    if (IS_TEST_MODE) {
      return requestResetCodeMock(input);
    }

    return requestResetCodeRuntime(input);
  },
  resendResetCode(input) {
    if (IS_TEST_MODE) {
      return resendResetCodeMock(input);
    }

    return resendResetCodeRuntime(input);
  },
  resetPassword(input) {
    if (IS_TEST_MODE) {
      return resetPasswordMock(input);
    }

    return resetPasswordRuntime(input);
  },
  verifyResetCode(input) {
    if (IS_TEST_MODE) {
      return verifyResetCodeMock(input);
    }

    return verifyResetCodeRuntime(input);
  },
};
