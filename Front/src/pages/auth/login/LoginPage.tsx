import { Mail } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { authContent } from '@/content/authContent';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { login as loginRequest } from '@/lib/authApi';
import {
  getLandingRouteForSession,
  preloadLandingRouteForSession,
} from '@/lib/authRouting';
import type { LoginFormErrors, LoginFormState, LoginFormValues } from '@/content/types';
import { classNames } from '@/lib/classNames';
import {
  clearPasswordResetSuccessNotice,
  readPasswordResetSuccessNotice,
} from '@/lib/forgotPasswordService';

const initialValues: LoginFormValues = {
  email: '',
  password: '',
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateEmail(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return authContent.login.email.requiredMessage;
  }

  if (!isValidEmail(trimmedValue)) {
    return authContent.login.email.invalidMessage;
  }

  return undefined;
}

function validatePassword(value: string) {
  if (value.trim().length === 0) {
    return authContent.login.password.requiredMessage;
  }

  return undefined;
}

function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const emailError = validateEmail(values.email);
  const passwordError = validatePassword(values.password);

  if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

export function LoginPage() {
  const { session, setSession } = useAuth();
  const [formState, setFormState] = useState<LoginFormState>({
    errors: {},
    generalError: null,
    values: initialValues,
  });
  const [successNotice, setSuccessNotice] = useState(() => {
    const message = readPasswordResetSuccessNotice();

    if (message) {
      clearPasswordResetSuccessNotice();
    }

    return message;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const content = authContent.login;
  const emailErrorId = 'login-email-error';
  const forgotPasswordPath =
    content.forgotPasswordCta.kind === 'internal'
      ? content.forgotPasswordCta.to
      : ROUTES.forgotPassword;
  const registerPath =
    content.registerCta.kind === 'internal' ? content.registerCta.to : ROUTES.register;

  useEffect(() => {
    if (!successNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessNotice(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successNotice]);

  useEffect(() => {
    if (IS_TEST_MODE || !session) {
      return;
    }

    navigate(getLandingRouteForSession(session), { replace: true });
  }, [navigate, session]);

  const updateFieldValue = <K extends keyof LoginFormValues>(
    field: K,
    value: LoginFormValues[K],
  ) => {
    setFormState((currentState) => {
      const nextValues = {
        ...currentState.values,
        [field]: value,
      };
      const nextErrors = { ...currentState.errors };

      if (field === 'email' && currentState.errors.email) {
        const nextError = validateEmail(nextValues.email);

        if (nextError) {
          nextErrors.email = nextError;
        } else {
          delete nextErrors.email;
        }
      }

      if (field === 'password' && currentState.errors.password) {
        const nextError = validatePassword(nextValues.password);

        if (nextError) {
          nextErrors.password = nextError;
        } else {
          delete nextErrors.password;
        }
      }

      return {
        ...currentState,
        errors: nextErrors,
        values: nextValues,
      };
    });
  };

  const handleEmailBlur = () => {
    setFormState((currentState) => {
      const nextErrors = { ...currentState.errors };
      const nextError = validateEmail(currentState.values.email);

      if (nextError) {
        nextErrors.email = nextError;
      } else {
        delete nextErrors.email;
      }

      return {
        ...currentState,
        errors: nextErrors,
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      const nextErrors = validateLoginForm(formState.values);

      setFormState((currentState) => ({
        ...currentState,
        errors: nextErrors,
        generalError: null,
      }));

      if (nextErrors.email) {
        emailInputRef.current?.focus();
        return;
      }

      if (nextErrors.password) {
        passwordInputRef.current?.focus();
        return;
      }

      if (IS_TEST_MODE) {
        return;
      }

      setIsSubmitting(true);

      try {
        const authSession = await loginRequest(
          formState.values.email.trim(),
          formState.values.password,
        );

        setSession(authSession);
        preloadLandingRouteForSession(authSession);
        navigate(getLandingRouteForSession(authSession), { replace: true });
      } catch (error) {
        setFormState((currentState) => ({
          ...currentState,
          generalError:
            error instanceof Error ? error.message : content.generalErrorMessage,
        }));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <AuthShell
      footerClassName="!pb-7 sm:!pb-5"
      mainClassName="px-2.5 py-4 sm:px-6 sm:py-7 lg:px-8"
    >
      <Seo
        description={content.meta.description}
        noIndex
        title={content.meta.title}
      />
      <AuthCard className="flex min-h-[30rem] w-full max-w-[min(23.25rem,calc(100vw-1.75rem))] flex-col px-5 pt-6 pb-2 sm:min-h-0 sm:!max-w-[min(34rem,calc(100vw-3rem))] sm:px-6 sm:py-6 md:!max-w-[min(40rem,calc(100vw-5rem))] lg:!max-w-[min(42rem,calc(100vw-6rem))] lg:-translate-y-5 xl:!max-w-[31rem]">
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col justify-center sm:flex-1">
            <div className="text-center">
              <h1 className="font-headline text-[1.9rem] font-extrabold tracking-tight text-ink sm:text-[2.15rem]">
                {content.title}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-ink-muted sm:text-[15px]">
                {content.subtitle}
              </p>
            </div>
            <form
              className="mt-7 space-y-5 sm:mt-6 sm:space-y-[1.125rem]"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="space-y-1.5">
                <label
                  className="block px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted"
                  htmlFor="login-email"
                >
                  {content.email.label}
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ghost"
                  />
                  <input
                    ref={emailInputRef}
                    aria-describedby={formState.errors.email ? emailErrorId : undefined}
                    aria-invalid={Boolean(formState.errors.email)}
                    autoComplete="email"
                    className={classNames(
                      'w-full rounded-xl border-none bg-surface-high py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ghost/70 transition-all duration-300',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/12',
                      formState.errors.email
                        ? 'ring-2 ring-rose-500/25 focus-visible:ring-rose-500/25'
                        : 'focus-visible:bg-surface-card',
                    )}
                    id="login-email"
                    name="email"
                    placeholder={content.email.placeholder}
                    type="email"
                    value={formState.values.email}
                    onBlur={handleEmailBlur}
                    onChange={(event) => updateFieldValue('email', event.target.value)}
                  />
                </div>
                {formState.errors.email ? (
                  <p
                    className="px-1 text-[11px] font-medium text-rose-700 sm:text-xs"
                    id={emailErrorId}
                  >
                    {formState.errors.email}
                  </p>
                ) : null}
              </div>

              <PasswordField
                error={formState.errors.password}
                hidePasswordLabel={content.password.hidePasswordLabel}
                id="login-password"
                inputRef={passwordInputRef}
                label={content.password.label}
                name="password"
                placeholder={content.password.placeholder}
                showPassword={showPassword}
                showPasswordLabel={content.password.showPasswordLabel}
                value={formState.values.password}
                onBlur={handlePasswordBlur}
                onChange={(value) => updateFieldValue('password', value)}
                onToggleVisibility={() => setShowPassword((currentState) => !currentState)}
              />

              {formState.generalError ? (
                <div
                  aria-live="polite"
                  className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[11px] font-medium text-rose-700 sm:text-xs"
                  role="alert"
                >
                  {formState.generalError}
                </div>
              ) : null}

              {successNotice ? (
                <div
                  aria-live="polite"
                  className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-[11px] font-medium text-emerald-700 sm:text-xs"
                  role="status"
                >
                  {successNotice}
                </div>
              ) : null}

              <button
                className="w-full rounded-xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-base"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Ingresando...' : content.submitLabel}
              </button>
            </form>
          </div>

          <div className="mt-4 border-t border-slate-200/65 pt-4 text-center sm:mt-6 sm:pt-4">
            <Link
              className="text-[13px] font-semibold text-primary transition-colors duration-300 hover:text-primary-strong hover:underline sm:text-sm"
              to={forgotPasswordPath}
            >
              {content.forgotPasswordCta.label}
            </Link>
            <p className="mt-2.5 text-[11px] leading-5 text-ink-muted sm:text-xs">
              {content.registerPrompt}{' '}
              <Link
                className="font-semibold text-primary transition-colors duration-300 hover:text-primary-strong hover:underline"
                to={registerPath}
              >
                {content.registerCta.label}
              </Link>
            </p>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
