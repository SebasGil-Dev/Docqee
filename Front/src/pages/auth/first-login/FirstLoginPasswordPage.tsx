import { CheckCircle2, Circle, KeyRound, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/AuthProvider';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField } from '@/components/auth/PasswordField';
import { Seo } from '@/components/ui/Seo';
import { ROUTES } from '@/constants/routes';
import { authContent } from '@/content/authContent';
import type { RegisterPasswordRuleKey } from '@/content/types';
import { classNames } from '@/lib/classNames';
import { changeFirstLoginPassword } from '@/lib/authApi';
import {
  getDefaultRouteForRole,
  shouldRequireFirstLoginPasswordChange,
} from '@/lib/authRouting';

type FirstLoginPasswordService = {
  changePassword: (input: { password: string }) => Promise<void> | void;
};

type FirstLoginPasswordPageProps = {
  service?: FirstLoginPasswordService;
};

const passwordRuleOrder: RegisterPasswordRuleKey[] = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
  'special',
];

const firstLoginPasswordService: FirstLoginPasswordService = {
  async changePassword({ password }) {
    await changeFirstLoginPassword(password);
  },
};

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

function validatePassword(password: string) {
  if (!password) {
    return authContent.register.password.requiredMessage;
  }

  if (!meetsAllPasswordRequirements(password)) {
    return authContent.register.password.requirementsMessage;
  }

  return undefined;
}

function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) {
    return authContent.register.password.confirmRequiredMessage;
  }

  if (password !== confirmPassword) {
    return authContent.register.password.confirmMismatchMessage;
  }

  return undefined;
}

export function FirstLoginPasswordPage({
  service = firstLoginPasswordService,
}: FirstLoginPasswordPageProps) {
  const { session, setSession } = useAuth();
  const navigate = useNavigate();
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const requirementStatus = useMemo(
    () => getPasswordRequirementStatus(password),
    [password],
  );

  if (!session) {
    return <Navigate replace to={ROUTES.login} />;
  }

  if (!shouldRequireFirstLoginPasswordChange(session)) {
    return <Navigate replace to={getDefaultRouteForRole(session.user.role)} />;
  }

  const roleLabel =
    session.user.role === 'UNIVERSITY_ADMIN'
      ? 'Administrador de universidad'
      : 'Estudiante';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void (async () => {
      const nextPasswordError = validatePassword(password);
      const nextConfirmPasswordError = validateConfirmPassword(
        password,
        confirmPassword,
      );

      setPasswordError(nextPasswordError);
      setConfirmPasswordError(nextConfirmPasswordError);
      setGeneralError(null);

      if (nextPasswordError || nextConfirmPasswordError) {
        if (nextPasswordError) {
          passwordInputRef.current?.focus();
        } else {
          confirmPasswordInputRef.current?.focus();
        }

        return;
      }

      setIsSubmitting(true);

      try {
        await Promise.resolve(service.changePassword({ password }));

        setSession({
          ...session,
          requiresPasswordChange: false,
        });
        navigate(getDefaultRouteForRole(session.user.role), { replace: true });
      } catch (error) {
        setGeneralError(
          error instanceof Error
            ? error.message
            : 'No pudimos actualizar la contrasena. Intentalo nuevamente.',
        );
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <AuthShell mainClassName="items-start px-2.5 py-4 sm:px-6 sm:py-7 lg:px-8">
      <Seo
        description="Docqee solicita actualizar la contrasena temporal durante el primer ingreso."
        noIndex
        title="Docqee | Primer ingreso"
      />
      <AuthCard className="w-full max-w-[min(34rem,calc(100vw-1rem))] rounded-[1.8rem] px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary/8 text-primary shadow-[0_10px_22px_rgba(0,100,124,0.12)] ring-1 ring-primary/10">
              <KeyRound aria-hidden="true" className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="font-headline text-[1.95rem] font-extrabold tracking-tight text-ink sm:text-[2.15rem]">
                Actualiza tu contrasena
              </h1>
              <p className="text-sm leading-7 text-ink-muted">
                Este es tu primer ingreso en Docqee. Antes de continuar, crea una
                contrasena personal y segura.
              </p>
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-slate-200/80 bg-white/75 p-4 shadow-float">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                  Primer ingreso
                </p>
                <p className="text-sm font-semibold text-ink">{roleLabel}</p>
                <p className="break-all text-sm text-ink-muted">{session.user.email}</p>
              </div>
            </div>
          </div>

          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <PasswordField
              autoComplete="new-password"
              error={passwordError}
              hidePasswordLabel={authContent.register.password.hidePasswordLabel}
              id="first-login-password"
              inputRef={passwordInputRef}
              label={authContent.register.password.label}
              name="password"
              placeholder="Crea una nueva contrasena"
              showPassword={showPassword}
              showPasswordLabel={authContent.register.password.showPasswordLabel}
              value={password}
              onBlur={() => {
                setPasswordError(validatePassword(password));
              }}
              onChange={(value) => {
                setPassword(value);
                setPasswordError(undefined);
                setConfirmPasswordError(undefined);
                setGeneralError(null);
              }}
              onToggleVisibility={() => setShowPassword((currentState) => !currentState)}
            />

            <ul className="grid gap-2 rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-sm sm:grid-cols-2">
              {authContent.register.password.requirements.map((requirement) => {
                const isMet = requirementStatus[requirement.key];

                return (
                  <li
                    className={classNames(
                      'flex items-start gap-2.5 leading-6',
                      isMet ? 'text-emerald-700' : 'text-ink-muted',
                    )}
                    key={requirement.key}
                  >
                    {isMet ? (
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{requirement.label}</span>
                  </li>
                );
              })}
            </ul>

            <PasswordField
              autoComplete="new-password"
              error={confirmPasswordError}
              hidePasswordLabel={authContent.register.password.hidePasswordLabel}
              id="first-login-confirm-password"
              inputRef={confirmPasswordInputRef}
              label={authContent.register.password.confirmLabel}
              name="confirmPassword"
              placeholder={authContent.register.password.confirmPlaceholder}
              showPassword={showConfirmPassword}
              showPasswordLabel={authContent.register.password.showPasswordLabel}
              value={confirmPassword}
              onBlur={() => {
                setConfirmPasswordError(
                  validateConfirmPassword(password, confirmPassword),
                );
              }}
              onChange={(value) => {
                setConfirmPassword(value);
                setConfirmPasswordError(undefined);
                setGeneralError(null);
              }}
              onToggleVisibility={() =>
                setShowConfirmPassword((currentState) => !currentState)
              }
            />

            {generalError ? (
              <div
                className="rounded-[1.1rem] bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
                role="alert"
              >
                {generalError}
              </div>
            ) : null}

            <button
              className="w-full rounded-xl bg-brand-gradient px-5 py-3 font-headline text-[15px] font-extrabold text-white shadow-ambient transition-all duration-300 hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:brightness-95 disabled:opacity-70 sm:text-base"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar y continuar'}
            </button>
          </form>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
