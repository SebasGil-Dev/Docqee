import { KeyRound, Mail } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthCard } from '@/components/auth/AuthCard';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { forgotPasswordContent as content } from '@/content/forgotPasswordContent';
import type {
  ForgotPasswordFormErrors,
  ForgotPasswordFormState,
  ForgotPasswordService,
  RegisterPasswordRuleKey,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { classNames } from '@/lib/classNames';
import {
  clearForgotPasswordRecoverySession,
  forgotPasswordService,
  persistPasswordResetSuccessNotice,
  readForgotPasswordBlockedSeconds,
  readForgotPasswordCooldownSeconds,
  readForgotPasswordExpirySeconds,
  readForgotPasswordRecoverySession,
} from '@/lib/forgotPasswordService';

const CODE_LENGTH = 6;
const initialCodeDigits = Array.from({ length: CODE_LENGTH }, () => '');
const passwordRuleOrder: RegisterPasswordRuleKey[] = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
  'special',
];

type ForgotPasswordPageProps = {
  service?: ForgotPasswordService;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isSixDigitCode(value: string) {
  return /^\d{6}$/.test(value);
}

function getPasswordRequirementStatus(password: string): Record<RegisterPasswordRuleKey, boolean> {
  return {
    lowercase: /[a-z]/.test(password),
    minLength: password.length >= 8,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
  };
}

function meetsAllPasswordRequirements(password: string) {
  const requirementStatus = getPasswordRequirementStatus(password);
  return passwordRuleOrder.every((ruleKey) => requirementStatus[ruleKey]);
}

function validateEmail(value: string) {
  const normalizedEmail = normalizeEmail(value);

  if (!normalizedEmail) {
    return content.emailField.requiredMessage;
  }

  if (!isValidEmail(normalizedEmail)) {
    return content.emailField.invalidMessage;
  }

  return undefined;
}

function validatePassword(value: string) {
  if (!value) {
    return content.password.requiredMessage;
  }

  if (!meetsAllPasswordRequirements(value)) {
    return content.password.requirementsMessage;
  }

  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return content.password.confirmRequiredMessage;
  }

  if (password !== confirmPassword) {
    return content.password.confirmMismatchMessage;
  }

  return undefined;
}

function getInitialFormState(): ForgotPasswordFormState {
  return {
    codeVerificationStatus: 'idle',
    email: '',
    emailRequestStatus: 'idle',
    errors: {},
    messages: {
      code: null,
      email: null,
      password: null,
    },
    passwordResetStatus: 'idle',
    step: 'email',
    values: {
      codeDigits: initialCodeDigits,
      confirmPassword: '',
      draftEmail: '',
      password: '',
    },
  };
}

export function ForgotPasswordPage({ service = forgotPasswordService }: ForgotPasswordPageProps) {
  const [formState, setFormState] = useState<ForgotPasswordFormState>(() => getInitialFormState());
  const [cooldownSeconds, setCooldownSeconds] = useState(() => readForgotPasswordCooldownSeconds());
  const [expirySeconds, setExpirySeconds] = useState(() => readForgotPasswordExpirySeconds());
  const [blockedSeconds, setBlockedSeconds] = useState(() => readForgotPasswordBlockedSeconds());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const codeValue = formState.values.codeDigits.join('');
  const recoverySession = readForgotPasswordRecoverySession();
  const hasConfirmedEmail = Boolean(formState.email);
  const isEmailDirty =
    hasConfirmedEmail && normalizeEmail(formState.values.draftEmail) !== normalizeEmail(formState.email);
  const isSendingCode = formState.emailRequestStatus === 'submitting';
  const isValidatingCode = formState.codeVerificationStatus === 'submitting';
  const isChangingPassword = formState.passwordResetStatus === 'submitting';

  useEffect(() => {
    clearForgotPasswordRecoverySession();
    setBlockedSeconds(0);
    setCooldownSeconds(0);
    setExpirySeconds(0);

    return () => {
      clearForgotPasswordRecoverySession();
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0 && expirySeconds <= 0 && blockedSeconds <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds(readForgotPasswordCooldownSeconds());
      setExpirySeconds(readForgotPasswordExpirySeconds());
      setBlockedSeconds(readForgotPasswordBlockedSeconds());
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [blockedSeconds, cooldownSeconds, expirySeconds]);

  useEffect(() => {
    if (expirySeconds > 0) {
      return;
    }

    setFormState((currentState) => {
      if (currentState.step === 'email') {
        return currentState;
      }

      if (currentState.step === 'code' && currentState.messages.code === content.codeExpiredMessage) {
        return currentState;
      }

      return {
        ...currentState,
        codeVerificationStatus: 'error',
        messages: {
          ...currentState.messages,
          code: content.codeExpiredMessage,
        },
        passwordResetStatus: 'idle',
        step: 'code',
        values: {
          ...currentState.values,
          confirmPassword: '',
          password: '',
        },
      };
    });
  }, [expirySeconds]);

  const handleEmailBlur = () => {
    setFormState((currentState) => {
      const nextErrors = { ...currentState.errors };
      const nextError = validateEmail(currentState.values.draftEmail);

      if (nextError) {
        nextErrors.draftEmail = nextError;
      } else {
        delete nextErrors.draftEmail;
      }

      return {
        ...currentState,
        errors: nextErrors,
      };
    });
  };

  const handleEmailChange = (value: string) => {
    const nextNormalizedEmail = normalizeEmail(value);
    const changedFlowEmail =
      Boolean(formState.email) && nextNormalizedEmail !== normalizeEmail(formState.email);

    if (changedFlowEmail) {
      clearForgotPasswordRecoverySession();
      setBlockedSeconds(0);
      setCooldownSeconds(0);
      setExpirySeconds(0);
      setFormState((currentState) => ({
        ...currentState,
        codeVerificationStatus: 'idle',
        email: '',
        emailRequestStatus: 'idle',
        errors: {},
        messages: {
          code: null,
          email: null,
          password: null,
        },
        passwordResetStatus: 'idle',
        step: 'email',
        values: {
          codeDigits: initialCodeDigits,
          confirmPassword: '',
          draftEmail: value,
          password: '',
        },
      }));
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      errors: {
        ...currentState.errors,
        draftEmail: undefined,
      },
      values: {
        ...currentState.values,
        draftEmail: value,
      },
    }));
  };

  const handleCodeChange = (nextCodeDigits: string[]) => {
    setFormState((currentState) => ({
      ...currentState,
      codeVerificationStatus:
        currentState.codeVerificationStatus === 'submitting' ? 'submitting' : 'idle',
      errors: {
        ...currentState.errors,
        code: undefined,
      },
      messages: {
        ...currentState.messages,
        code: currentState.codeVerificationStatus === 'submitting' ? currentState.messages.code : null,
      },
      values: {
        ...currentState.values,
        codeDigits: nextCodeDigits,
      },
    }));
  };

  const updatePasswordField = (field: 'confirmPassword' | 'password', value: string) => {
    setFormState((currentState) => {
      const nextValues = {
        ...currentState.values,
        [field]: value,
      };
      const nextErrors: ForgotPasswordFormErrors = { ...currentState.errors };

      delete nextErrors.password;
      delete nextErrors.confirmPassword;

      return {
        ...currentState,
        errors: nextErrors,
        messages: {
          ...currentState.messages,
          password: null,
        },
        values: nextValues,
      };
    });
  };

  const handlePasswordBlur = () => {
    setFormState((currentState) => {
      const nextErrors = { ...currentState.errors };
      const nextError = validatePassword(currentState.values.password);

      if (nextError) {
        nextErrors.password = nextError;
      } else {
        delete nextErrors.password;
      }

      return {
        ...currentState,
        errors: nextErrors,
      };
    });
  };

  const handleConfirmPasswordBlur = () => {
    setFormState((currentState) => {
      const nextErrors = { ...currentState.errors };
      const nextError = validateConfirmPassword(
        currentState.values.password,
        currentState.values.confirmPassword,
      );

      if (nextError) {
        nextErrors.confirmPassword = nextError;
      } else {
        delete nextErrors.confirmPassword;
      }

      return {
        ...currentState,
        errors: nextErrors,
      };
    });
  };

  const handleSendCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      const emailError = validateEmail(formState.values.draftEmail);

      if (emailError) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {
            ...currentState.errors,
            draftEmail: emailError,
          },
        }));
        emailInputRef.current?.focus();
        return;
      }

      const normalizedEmail = normalizeEmail(formState.values.draftEmail);

      setFormState((currentState) => ({
        ...currentState,
        codeVerificationStatus: 'idle',
        emailRequestStatus: 'submitting',
        errors: {},
        messages: {
          code: null,
          email: null,
          password: null,
        },
        passwordResetStatus: 'idle',
      }));

      const result = await Promise.resolve(service.requestResetCode({ email: normalizedEmail }));

      if (result.ok) {
        setBlockedSeconds(0);
        setCooldownSeconds(result.cooldownSeconds);
        setExpirySeconds(Math.max(Math.ceil((result.expiresAt - Date.now()) / 1000), 0));
        setFormState((currentState) => ({
          ...currentState,
          codeVerificationStatus: 'idle',
          email: normalizedEmail,
          emailRequestStatus: 'success',
          messages: {
            code: null,
            email: content.emailStepSuccessMessage,
            password: null,
          },
          passwordResetStatus: 'idle',
          step: 'code',
          values: {
            codeDigits: initialCodeDigits,
            confirmPassword: '',
            draftEmail: normalizedEmail,
            password: '',
          },
        }));
        return;
      }

      setCooldownSeconds(result.cooldownSeconds ?? 0);
      setFormState((currentState) => ({
        ...currentState,
        emailRequestStatus: 'error',
        messages: {
          ...currentState.messages,
          email:
            result.reason === 'rate_limited' && result.cooldownSeconds
              ? `${content.cooldownMessage} ${formatDuration(result.cooldownSeconds)}`
              : content.unexpectedRequestMessage,
        },
      }));
    })();
  };

  const handleVerifyCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      if (blockedSeconds > 0) {
        setFormState((currentState) => ({
          ...currentState,
          codeVerificationStatus: 'error',
          messages: {
            ...currentState.messages,
            code: `${content.blockedMessagePrefix} ${formatDuration(blockedSeconds)}`,
          },
        }));
        return;
      }

      if (expirySeconds <= 0) {
        setFormState((currentState) => ({
          ...currentState,
          codeVerificationStatus: 'error',
          messages: {
            ...currentState.messages,
            code: content.codeExpiredMessage,
          },
        }));
        return;
      }

      if (!codeValue) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {
            ...currentState.errors,
            code: content.codeField.requiredMessage,
          },
        }));
        return;
      }

      if (!isSixDigitCode(codeValue)) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {
            ...currentState.errors,
            code: content.codeField.invalidMessage,
          },
        }));
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        codeVerificationStatus: 'submitting',
        errors: {
          ...currentState.errors,
          code: undefined,
        },
        messages: {
          ...currentState.messages,
          code: null,
          password: null,
        },
      }));

      const result = await Promise.resolve(
        service.verifyResetCode({
          code: codeValue,
          email: formState.email,
        }),
      );

      setBlockedSeconds(readForgotPasswordBlockedSeconds());
      setExpirySeconds(readForgotPasswordExpirySeconds());

      if (result.ok) {
        setFormState((currentState) => ({
          ...currentState,
          codeVerificationStatus: 'success',
          messages: {
            ...currentState.messages,
            code: content.codeValidatedMessage,
          },
          step: 'password',
        }));
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        codeVerificationStatus: 'error',
        errors: {
          ...currentState.errors,
          code: result.reason === 'invalid_format' ? content.codeField.invalidMessage : undefined,
        },
        messages: {
          ...currentState.messages,
          code:
            result.reason === 'invalid'
              ? content.invalidCodeMessage
              : result.reason === 'expired'
                ? content.codeExpiredMessage
                : result.reason === 'attempts_exceeded' && result.blockedSeconds
                  ? `${content.tooManyAttemptsMessagePrefix} ${formatDuration(result.blockedSeconds)}`
                  : result.reason === 'blocked' && result.blockedSeconds
                    ? `${content.blockedMessagePrefix} ${formatDuration(result.blockedSeconds)}`
                    : content.unexpectedVerificationMessage,
        },
      }));
    })();
  };

  const handleResendCode = async () => {
    if (!formState.email || cooldownSeconds > 0 || isSendingCode || isValidatingCode || isEmailDirty) {
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      emailRequestStatus: 'submitting',
      messages: {
        code: null,
        email: null,
        password: null,
      },
      passwordResetStatus: 'idle',
      step: 'code',
      values: {
        ...currentState.values,
        codeDigits: initialCodeDigits,
        confirmPassword: '',
        password: '',
      },
    }));

    const result = await Promise.resolve(service.resendResetCode({ email: formState.email }));

    if (result.ok) {
      setBlockedSeconds(0);
      setCooldownSeconds(result.cooldownSeconds);
      setExpirySeconds(Math.max(Math.ceil((result.expiresAt - Date.now()) / 1000), 0));
      setFormState((currentState) => ({
        ...currentState,
        emailRequestStatus: 'success',
        messages: {
          code: null,
          email: content.emailStepSuccessMessage,
          password: null,
        },
      }));
      return;
    }

    setCooldownSeconds(result.cooldownSeconds ?? 0);
    setFormState((currentState) => ({
      ...currentState,
      emailRequestStatus: 'error',
      messages: {
        ...currentState.messages,
        email:
          result.reason === 'rate_limited' && result.cooldownSeconds
            ? `${content.cooldownMessage} ${formatDuration(result.cooldownSeconds)}`
            : content.unexpectedRequestMessage,
      },
    }));
  };

  const handleChangePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      const passwordError = validatePassword(formState.values.password);
      const confirmPasswordError = validateConfirmPassword(
        formState.values.password,
        formState.values.confirmPassword,
      );

      if (passwordError || confirmPasswordError) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {
            ...currentState.errors,
            confirmPassword: confirmPasswordError,
            password: passwordError,
          },
        }));

        if (passwordError) {
          passwordInputRef.current?.focus();
        } else {
          confirmPasswordInputRef.current?.focus();
        }
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        errors: {
          ...currentState.errors,
          confirmPassword: undefined,
          password: undefined,
        },
        messages: {
          ...currentState.messages,
          password: null,
        },
        passwordResetStatus: 'submitting',
      }));

      const recoverySession = readForgotPasswordRecoverySession();
      const result = await Promise.resolve(
        service.resetPassword({
          code: recoverySession?.code ?? '',
          email: formState.email,
          password: formState.values.password,
        }),
      );

      if (result.ok) {
        persistPasswordResetSuccessNotice(content.successFlashMessage);
        navigate(ROUTES.login);
        return;
      }

      if (result.reason === 'session_invalid') {
        clearForgotPasswordRecoverySession();
        setBlockedSeconds(0);
        setCooldownSeconds(0);
        setExpirySeconds(0);
        setFormState((currentState) => ({
          ...currentState,
          email: '',
          emailRequestStatus: 'idle',
          messages: {
            code: null,
            email: content.sessionInvalidMessage,
            password: null,
          },
          passwordResetStatus: 'idle',
          step: 'email',
          values: {
            ...currentState.values,
            codeDigits: initialCodeDigits,
            confirmPassword: '',
            password: '',
          },
        }));
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        codeVerificationStatus:
          result.reason === 'code_expired' || result.reason === 'code_invalid' ? 'error' : currentState.codeVerificationStatus,
        messages: {
          ...currentState.messages,
          code:
            result.reason === 'code_expired'
              ? content.codeExpiredMessage
              : result.reason === 'code_invalid'
                ? content.invalidCodeMessage
                : currentState.messages.code,
          password:
            result.reason === 'password_invalid'
              ? content.password.requirementsMessage
              : result.reason === 'unexpected'
                ? content.passwordResetUnexpectedMessage
                : null,
        },
        passwordResetStatus: result.reason === 'unexpected' ? 'error' : 'idle',
        step: result.reason === 'code_expired' || result.reason === 'code_invalid' ? 'code' : currentState.step,
        values:
          result.reason === 'code_expired' || result.reason === 'code_invalid'
            ? {
                ...currentState.values,
                confirmPassword: '',
                password: '',
              }
            : currentState.values,
      }));
    })();
  };

  return (
    <AuthShell mainClassName="items-start px-2.5 py-4 sm:px-6 sm:py-7 lg:px-8">
      <Seo
        description={content.meta.description}
        noIndex
        title={content.meta.title}
      />
      <AuthCard className="w-full max-w-[min(33rem,calc(100vw-1rem))] rounded-[1.8rem] px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary/8 text-primary shadow-[0_10px_22px_rgba(0,100,124,0.12)] ring-1 ring-primary/10">
              <KeyRound aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="font-headline text-[1.95rem] font-extrabold tracking-tight text-ink sm:text-[2.15rem]">
                {content.title}
              </h1>
              <p className="text-sm leading-7 text-ink-muted">{content.description}</p>
            </div>
          </div>

          <form className="space-y-4" noValidate onSubmit={handleSendCode}>
            <div className="space-y-1.5">
              <label className="block px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted" htmlFor="forgot-password-email">
                {content.emailField.label}
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost" />
                <input
                  ref={emailInputRef}
                  aria-describedby={formState.errors.draftEmail ? 'forgot-password-email-error' : undefined}
                  aria-invalid={Boolean(formState.errors.draftEmail)}
                  autoComplete="email"
                  className={classNames(
                    'w-full rounded-xl border-none bg-surface-high py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ghost/70 transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
                    formState.errors.draftEmail
                      ? 'ring-2 ring-rose-500/25 focus-visible:ring-rose-500/25'
                      : 'focus-visible:bg-surface-card',
                  )}
                  id="forgot-password-email"
                  name="email"
                  placeholder={content.emailField.placeholder}
                  type="email"
                  value={formState.values.draftEmail}
                  onBlur={handleEmailBlur}
                  onChange={(event) => handleEmailChange(event.target.value)}
                />
              </div>
              {formState.errors.draftEmail ? (
                <p className="px-1 text-[11px] font-medium text-rose-700 sm:text-xs" id="forgot-password-email-error">
                  {formState.errors.draftEmail}
                </p>
              ) : null}
            </div>

            {formState.messages.email ? (
              <div
                className={classNames(
                  'rounded-[1.1rem] px-4 py-3 text-sm leading-6',
                  formState.emailRequestStatus === 'error'
                    ? 'bg-rose-50 text-rose-700'
                    : 'border border-slate-200/80 bg-white/75 text-ink-muted',
                )}
                role={formState.emailRequestStatus === 'error' ? 'alert' : 'status'}
              >
                {formState.messages.email}
              </div>
            ) : null}

            <button
              className="w-full rounded-xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:brightness-95 disabled:opacity-70 sm:text-base"
              disabled={isSendingCode}
              type="submit"
            >
              {isSendingCode ? content.sendCodeSubmittingLabel : content.sendCodeLabel}
            </button>
          </form>

          {formState.step !== 'email' ? (
            <section className="space-y-4 rounded-[1.45rem] border border-slate-200/80 bg-white/70 p-4 shadow-float sm:p-5">
              <div className="space-y-1.5 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Paso 2</p>
                <p className="text-sm leading-6 text-ink-muted">
                  {content.codeInstructionsPrefix}{' '}
                  <span className="font-semibold text-primary-strong">{formState.email}</span>
                </p>
                {!IS_TEST_MODE && recoverySession?.code ? (
                  <p className="rounded-[1.1rem] border border-sky-200/80 bg-sky-50/85 px-4 py-2.5 text-[13px] font-medium leading-[1.35rem] text-sky-900 sm:text-sm">
                    Codigo de prueba para desarrollo: <span className="font-semibold">{recoverySession.code}</span>
                  </p>
                ) : null}
              </div>

              <form className="space-y-4" noValidate onSubmit={handleVerifyCode}>
                <VerificationCodeInput
                  code={formState.values.codeDigits}
                  disabled={isValidatingCode || blockedSeconds > 0 || expirySeconds <= 0}
                  error={formState.errors.code}
                  idPrefix="forgot-password-code"
                  label={content.codeField.label}
                  placeholder={content.codeField.placeholder}
                  onChange={handleCodeChange}
                />

                <div className="space-y-2 text-center text-sm text-ink-muted">
                  {expirySeconds > 0 ? (
                    <p>
                      {content.expiryMessagePrefix}{' '}
                      <span className="font-semibold text-primary">{formatDuration(expirySeconds)}</span>
                    </p>
                  ) : null}
                  {cooldownSeconds > 0 ? (
                    <p>
                      {content.cooldownMessage}{' '}
                      <span className="font-semibold text-primary">{formatDuration(cooldownSeconds)}</span>
                    </p>
                  ) : null}
                </div>

                {formState.messages.code ? (
                  <div
                    className={classNames(
                      'rounded-[1.1rem] px-4 py-3 text-sm leading-6',
                      formState.codeVerificationStatus === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700',
                    )}
                    role={formState.codeVerificationStatus === 'success' ? 'status' : 'alert'}
                  >
                    {formState.messages.code}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:brightness-95 disabled:opacity-70 sm:text-base"
                  disabled={isValidatingCode || blockedSeconds > 0 || expirySeconds <= 0 || isEmailDirty}
                  type="submit"
                >
                  {isValidatingCode ? content.verifyCodeSubmittingLabel : content.verifyCodeLabel}
                </button>
              </form>

              <button
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-semibold text-primary transition-all duration-300 hover:border-primary/20 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:text-ghost disabled:hover:border-slate-200/80 disabled:hover:bg-white/80"
                disabled={cooldownSeconds > 0 || isSendingCode || isValidatingCode || isEmailDirty}
                type="button"
                onClick={() => {
                  void handleResendCode();
                }}
              >
                {isSendingCode ? content.resendCodeSubmittingLabel : content.resendCodeLabel}
              </button>
            </section>
          ) : null}

          {formState.step === 'password' ? (
            <section className="space-y-4 rounded-[1.45rem] border border-slate-200/80 bg-white/70 p-4 shadow-float sm:p-5">
              <div className="space-y-1.5 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Paso 3</p>
                <p className="text-sm leading-6 text-ink-muted">
                  Define una nueva contraseña segura para recuperar el acceso a tu cuenta.
                </p>
              </div>

              <form className="space-y-4" noValidate onSubmit={handleChangePassword}>
                <PasswordField
                  autoComplete="new-password"
                  error={formState.errors.password}
                  hidePasswordLabel={content.password.hidePasswordLabel}
                  id="forgot-password-password"
                  inputRef={passwordInputRef}
                  label={content.password.label}
                  name="password"
                  placeholder={content.password.placeholder}
                  showPassword={showPassword}
                  showPasswordLabel={content.password.showPasswordLabel}
                  value={formState.values.password}
                  onBlur={handlePasswordBlur}
                  onChange={(value) => updatePasswordField('password', value)}
                  onToggleVisibility={() => setShowPassword((currentState) => !currentState)}
                />

                <ul className="grid gap-2 rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm sm:grid-cols-2">
                  {content.password.requirements.map((requirement) => {
                    const isMet = getPasswordRequirementStatus(formState.values.password)[requirement.key];

                    return (
                      <li
                        className={classNames(
                          'flex items-start gap-2.5 leading-6',
                          isMet ? 'text-emerald-700' : 'text-ink-muted',
                        )}
                        key={requirement.key}
                      >
                        <span
                          aria-hidden="true"
                          className={classNames(
                            'mt-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                            isMet ? 'bg-emerald-500' : 'bg-slate-300',
                          )}
                        />
                        <span>{requirement.label}</span>
                      </li>
                    );
                  })}
                </ul>

                <PasswordField
                  autoComplete="new-password"
                  error={formState.errors.confirmPassword}
                  hidePasswordLabel={content.password.hidePasswordLabel}
                  id="forgot-password-confirm-password"
                  inputRef={confirmPasswordInputRef}
                  label={content.password.confirmLabel}
                  name="confirmPassword"
                  placeholder={content.password.confirmPlaceholder}
                  showPassword={showConfirmPassword}
                  showPasswordLabel={content.password.showPasswordLabel}
                  value={formState.values.confirmPassword}
                  onBlur={handleConfirmPasswordBlur}
                  onChange={(value) => updatePasswordField('confirmPassword', value)}
                  onToggleVisibility={() => setShowConfirmPassword((currentState) => !currentState)}
                />

                {formState.messages.password ? (
                  <div className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700" role="alert">
                    {formState.messages.password}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:brightness-95 disabled:opacity-70 sm:text-base"
                  disabled={isChangingPassword || isEmailDirty}
                  type="submit"
                >
                  {isChangingPassword ? content.changePasswordSubmittingLabel : content.changePasswordLabel}
                </button>
              </form>
            </section>
          ) : null}

          <div className="border-t border-slate-200/70 pt-4 text-center">
            <Link
              className="text-sm font-semibold text-primary transition-colors duration-300 hover:text-primary-strong hover:underline"
              to={content.loginCta.kind === 'internal' ? content.loginCta.to : ROUTES.login}
            >
              {content.loginCta.label}
            </Link>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
