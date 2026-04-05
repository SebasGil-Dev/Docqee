import { Mail } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { AuthCard } from '@/components/auth/AuthCard';
import { AuthShell } from '@/components/auth/AuthShell';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { authContent } from '@/content/authContent';
import type { VerifyEmailFormState, VerifyEmailService } from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { classNames } from '@/lib/classNames';
import {
  clearPendingVerificationEmail,
  clearVerifyEmailCooldown,
  persistPendingVerificationEmail,
  readVerifyEmailDebugCode,
  persistVerifyEmailCooldown,
  readPendingVerificationEmail,
  readVerifyEmailCooldownSeconds,
  verifyEmailService,
} from '@/lib/verifyEmailService';

type VerifyEmailLocationState = {
  email?: string;
};

type VerifyEmailPageProps = {
  service?: VerifyEmailService;
};

const CODE_LENGTH = 6;
const initialCodeDigits = Array.from({ length: CODE_LENGTH }, () => '');

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function isCompleteCode(code: string) {
  return /^\d{6}$/.test(code);
}

export function VerifyEmailPage({ service = verifyEmailService }: VerifyEmailPageProps) {
  const content = authContent.verifyEmail;
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as VerifyEmailLocationState | null;
  const emailFromState = typeof state?.email === 'string' ? state.email.trim() : '';
  const storedEmail = useMemo(() => readPendingVerificationEmail()?.trim() ?? '', []);
  const verificationEmail = emailFromState || storedEmail;
  const displayEmail = verificationEmail || content.emailFallback;
  const debugCode = readVerifyEmailDebugCode();
  const [formState, setFormState] = useState<VerifyEmailFormState>({
    errors: {},
    status: 'idle',
    statusMessage: null,
    values: {
      codeDigits: initialCodeDigits,
    },
  });
  const [cooldownSeconds, setCooldownSeconds] = useState(() => readVerifyEmailCooldownSeconds());
  const verificationCode = formState.values.codeDigits.join('');
  const isSubmitting = formState.status === 'submitting';
  const isResending = formState.status === 'resending';
  const isBusy = isSubmitting || isResending;
  const loginPath = content.loginCta.kind === 'internal' ? content.loginCta.to : ROUTES.login;

  useEffect(() => {
    if (emailFromState) {
      persistPendingVerificationEmail(emailFromState);
    }
  }, [emailFromState]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      clearVerifyEmailCooldown();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownSeconds((currentSeconds) => Math.max(currentSeconds - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cooldownSeconds]);

  const handleCodeChange = (nextCodeDigits: string[]) => {
    setFormState((currentState) => ({
      errors: {},
      status:
        currentState.status === 'submitting' || currentState.status === 'resending'
          ? currentState.status
          : 'idle',
      statusMessage:
        currentState.status === 'submitting' || currentState.status === 'resending'
          ? currentState.statusMessage
          : null,
      values: {
        codeDigits: nextCodeDigits,
      },
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      if (!verificationEmail) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {},
          status: 'error',
          statusMessage: content.emailRequiredMessage,
        }));
        return;
      }

      if (!verificationCode.trim()) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {
            code: content.codeField.requiredMessage,
          },
          status: 'idle',
          statusMessage: null,
        }));
        return;
      }

      if (!isCompleteCode(verificationCode)) {
        setFormState((currentState) => ({
          ...currentState,
          errors: {
            code: content.codeField.invalidMessage,
          },
          status: 'idle',
          statusMessage: null,
        }));
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        errors: {},
        status: 'submitting',
        statusMessage: null,
      }));

      const result = await Promise.resolve(
        service.verifyCode({
          code: verificationCode,
          email: verificationEmail,
        }),
      );

      if (result.ok) {
        clearPendingVerificationEmail();
        clearVerifyEmailCooldown();
        navigate(ROUTES.login);
        return;
      }

      setFormState((currentState) => ({
        ...currentState,
        errors:
          result.reason === 'invalid_format'
            ? {
                code: content.codeField.invalidMessage,
              }
            : {},
        status: 'error',
        statusMessage: result.message,
      }));
    })();
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isBusy) {
      return;
    }

    if (!verificationEmail) {
      setFormState((currentState) => ({
        ...currentState,
        errors: {},
        status: 'error',
        statusMessage: content.emailRequiredMessage,
      }));
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      errors: {},
      status: 'resending',
      statusMessage: null,
    }));

    const result = await Promise.resolve(
      service.resendCode({
        email: verificationEmail,
      }),
    );

    if (result.ok) {
      persistVerifyEmailCooldown(result.cooldownSeconds);
      setCooldownSeconds(result.cooldownSeconds);
      setFormState((currentState) => ({
        ...currentState,
        status: 'success',
        statusMessage: result.message || content.resendSuccessMessage,
      }));
      return;
    }

    if (result.cooldownSeconds && result.cooldownSeconds > 0) {
      persistVerifyEmailCooldown(result.cooldownSeconds);
    } else {
      clearVerifyEmailCooldown();
    }

    setCooldownSeconds(result.cooldownSeconds ?? 0);
    setFormState((currentState) => ({
      ...currentState,
      status: 'error',
      statusMessage: result.message,
    }));
  };

  return (
    <AuthShell
      footerClassName="pb-2 pt-1 text-[9px] sm:pb-2 sm:pt-1 sm:text-[10px]"
      mainClassName="items-start px-2.5 pt-1 pb-2 sm:px-6 sm:pt-2 sm:pb-3 lg:px-8"
    >
      <Seo
        description={content.meta.description}
        noIndex
        title={content.meta.title}
      />
      <AuthCard className="w-full max-w-[min(28rem,calc(100vw-0.75rem))] -translate-y-2 rounded-[1.65rem] px-4 py-[1.125rem] text-center sm:-translate-y-5 sm:px-5 sm:py-5">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary/8 text-primary shadow-[0_10px_22px_rgba(0,100,124,0.12)] ring-1 ring-primary/10">
              <Mail
                aria-hidden="true"
                className="h-6 w-6"
              />
            </div>
            <div className="space-y-2.5">
              <h1 className="font-headline text-[1.72rem] font-extrabold tracking-tight text-ink sm:text-[1.95rem]">
                {content.title}
              </h1>
              <p className="text-[13px] leading-6 text-ink-muted sm:text-sm">
                {content.description}
              </p>
              <p className="rounded-[1.1rem] border border-slate-200/80 bg-white/75 px-4 py-3 text-[13px] font-medium leading-[1.35rem] text-ink-muted sm:text-sm">
                {content.emailPrefix}{' '}
                <span className="font-semibold text-primary-strong">{displayEmail}</span>
              </p>
              {!verificationEmail ? (
                <p className="rounded-[1.1rem] border border-amber-200/80 bg-amber-50/85 px-4 py-2.5 text-[13px] font-medium leading-[1.35rem] text-amber-900 sm:text-sm">
                  {content.emailRequiredMessage}
                </p>
              ) : null}
              {!IS_TEST_MODE && debugCode ? (
                <p className="rounded-[1.1rem] border border-sky-200/80 bg-sky-50/85 px-4 py-2.5 text-[13px] font-medium leading-[1.35rem] text-sky-900 sm:text-sm">
                  Codigo de prueba para desarrollo: <span className="font-semibold">{debugCode}</span>
                </p>
              ) : null}
            </div>
          </div>

          <form
            className="space-y-3"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">
                {content.codeField.label}
              </p>
              <VerificationCodeInput
                code={formState.values.codeDigits}
                disabled={isSubmitting}
                error={formState.errors.code}
                idPrefix="verify-email-code"
                label={content.codeField.label}
                placeholder={content.codeField.placeholder}
                onChange={handleCodeChange}
              />
            </div>

            {formState.statusMessage ? (
              <div
                aria-live={formState.status === 'error' ? 'assertive' : 'polite'}
                className={classNames(
                  'rounded-[1.1rem] px-4 py-2.5 text-[13px] font-medium leading-[1.35rem] sm:text-sm',
                  formState.status === 'error'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700',
                )}
                role={formState.status === 'error' ? 'alert' : 'status'}
              >
                {formState.statusMessage}
              </div>
            ) : null}

            <button
              className="w-full rounded-xl bg-brand-gradient px-5 py-2.5 font-headline text-sm font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:brightness-95 disabled:opacity-70 sm:text-[15px]"
              disabled={isBusy}
              type="submit"
            >
              {isSubmitting ? content.submitSubmittingLabel : content.submitLabel}
            </button>

            <div className="space-y-1.5">
              <button
                className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-300 hover:border-primary/20 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:text-ghost disabled:hover:border-slate-200/80 disabled:hover:bg-white/80"
                disabled={cooldownSeconds > 0 || isBusy}
                type="button"
                onClick={() => {
                  void handleResend();
                }}
              >
                {isResending ? content.resendSubmittingLabel : content.resendIdleLabel}
              </button>
              {cooldownSeconds > 0 ? (
                <p className="text-[13px] text-ink-muted sm:text-sm">
                  {content.cooldownMessage}{' '}
                  <span className="font-semibold text-primary">{formatCooldown(cooldownSeconds)}</span>
                </p>
              ) : null}
            </div>
          </form>

          <div className="space-y-1.5 border-t border-slate-200/70 pt-3 text-[13px] sm:text-sm">
            <p className="text-ink-muted">
              <Link
                className="font-semibold text-primary transition-colors duration-300 hover:text-primary-strong hover:underline"
                to={loginPath}
              >
                {content.loginCta.label}
              </Link>
            </p>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
