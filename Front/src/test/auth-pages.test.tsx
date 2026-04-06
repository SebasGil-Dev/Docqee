import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppProviders } from '@/app/providers/AppProviders';
import { ROUTES } from '@/constants/routes';
import { FirstLoginPasswordPage } from '@/pages/auth/first-login/FirstLoginPasswordPage';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/login/LoginPage';
import { RegisterPage } from '@/pages/auth/register/RegisterPage';
import { VerifyEmailPage } from '@/pages/auth/verify-email/VerifyEmailPage';
import { HomePage } from '@/pages/home/HomePage';
import { NotFoundPage } from '@/pages/home/NotFoundPage';
import {
  persistForgotPasswordRecoverySession,
  readForgotPasswordRecoverySession,
} from '@/lib/forgotPasswordService';
import { clearAuthSession, persistAuthSession } from '@/lib/authSession';
import { persistVerifyEmailCooldown } from '@/lib/verifyEmailService';

function renderAuthApp({
  initialEntries = [ROUTES.login],
  registerPageProps,
  verifyEmailPageProps,
}: {
  initialEntries?: MemoryRouterProps['initialEntries'];
  registerPageProps?: ComponentProps<typeof RegisterPage>;
  verifyEmailPageProps?: ComponentProps<typeof VerifyEmailPage>;
} = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<HomePage />} path={ROUTES.home} />
        <Route element={<LoginPage />} path={ROUTES.login} />
        <Route element={<RegisterPage {...registerPageProps} />} path={ROUTES.register} />
        <Route element={<ForgotPasswordPage />} path={ROUTES.forgotPassword} />
        <Route element={<VerifyEmailPage {...verifyEmailPageProps} />} path={ROUTES.verifyEmail} />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>,
  );
}

function renderFirstLoginApp({
  firstLoginPageProps,
  initialEntries = [ROUTES.firstLoginPassword],
  session,
}: {
  firstLoginPageProps?: ComponentProps<typeof FirstLoginPasswordPage>;
  initialEntries?: MemoryRouterProps['initialEntries'];
  session?: Parameters<typeof persistAuthSession>[0];
} = {}) {
  if (session) {
    persistAuthSession(session);
  } else {
    clearAuthSession();
  }

  return render(
    <AppProviders>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<HomePage />} path={ROUTES.home} />
          <Route element={<LoginPage />} path={ROUTES.login} />
          <Route
            element={<FirstLoginPasswordPage {...firstLoginPageProps} />}
            path={ROUTES.firstLoginPassword}
          />
          <Route element={<div>Panel universidad</div>} path={ROUTES.universityInstitution} />
          <Route element={<div>Inicio admin</div>} path={ROUTES.adminUniversities} />
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  );
}

async function waitForRegisterCatalogs() {
  await screen.findByRole('option', { name: /c.dula de ciudadan.a/i });
  await screen.findByRole('option', { name: /bogot./i });
}

async function fillValidRegisterForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    birthDate = '2000-04-03',
    email = 'paciente@correo.com',
    password = 'ClaveSegura1!',
  }: {
    birthDate?: string;
    email?: string;
    password?: string;
  } = {},
) {
  await waitForRegisterCatalogs();

  await user.type(screen.getByLabelText(/^nombres$/i), 'Ana');
  await user.type(screen.getByLabelText(/^apellidos$/i), 'Perez');
  await user.selectOptions(screen.getByLabelText(/^tipo de documento$/i), 'document-cc');
  await user.type(screen.getByLabelText(/n.mero de documento$/i), '123456789');
  await user.selectOptions(screen.getByLabelText(/^sexo$/i), 'FEMENINO');
  fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), { target: { value: birthDate } });
  await user.selectOptions(screen.getByLabelText(/^ciudad$/i), 'city-bogota');
  await screen.findByRole('option', { name: /suba/i });
  await user.selectOptions(screen.getByLabelText(/^localidad$/i), 'locality-bogota-suba');
  await user.type(screen.getByLabelText(/^correo electr.nico$/i), email);
  await user.type(screen.getByLabelText(/^celular$/i), '3001234567');
  await user.type(screen.getByLabelText(/^contrase.a$/i), password);
  await user.type(screen.getByLabelText(/confirmar contrase.a/i), password);
  await user.click(screen.getByLabelText(/acepto los t.rminos y condiciones/i));
  await user.click(screen.getByLabelText(/autorizo el tratamiento de mis datos/i));
}

async function requestForgotPasswordCode(
  user: ReturnType<typeof userEvent.setup>,
  email = 'paciente@correo.com',
) {
  await user.type(screen.getByLabelText(/correo electr.nico/i), email);
  await user.click(screen.getByRole('button', { name: /enviar c.digo/i }));
}

describe('Auth pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renderiza los campos principales del login', () => {
    renderAuthApp();

    expect(screen.getByRole('heading', { level: 1, name: /bienvenido/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electr.nico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contrase.a$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesi.n/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /olvid.*contrase.a/i })).toBeInTheDocument();
  });

  it('muestra errores inline y enfoca el primer campo invalido al enviar vacio en login', async () => {
    const user = userEvent.setup();

    renderAuthApp();
    await user.click(screen.getByRole('button', { name: /iniciar sesi.n/i }));

    const emailInput = screen.getByLabelText(/correo electr.nico/i);

    expect(screen.getByText(/el correo es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/la contrase.a es obligatoria/i)).toBeInTheDocument();
    expect(emailInput).toHaveFocus();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('valida el formato del correo en front para login', async () => {
    const user = userEvent.setup();

    renderAuthApp();
    await user.type(screen.getByLabelText(/correo electr.nico/i), 'correo-invalido');
    await user.type(screen.getByLabelText(/^contrase.a$/i), 'clave-segura');
    await user.click(screen.getByRole('button', { name: /iniciar sesi.n/i }));

    expect(screen.getByText(/ingresa un correo v.lido/i)).toBeInTheDocument();
  });

  it('permite mostrar y ocultar la contrasena en login', async () => {
    const user = userEvent.setup();

    renderAuthApp();

    const passwordInput = screen.getByLabelText(/^contrase.a$/i);

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar contrase.a/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar contrase.a/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('mantiene los enlaces de recuperacion y registro desde login', () => {
    renderAuthApp();

    expect(screen.getByRole('link', { name: /olvid.*contrase.a/i })).toHaveAttribute(
      'href',
      ROUTES.forgotPassword,
    );
    expect(screen.getByRole('link', { name: /^crear cuenta$/i })).toHaveAttribute(
      'href',
      ROUTES.register,
    );
  });

  it('renderiza la pantalla real de recuperacion de contrasena', () => {
    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /recuperar contrase.a/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar c.digo/i })).toBeInTheDocument();
  });

  it('con correo valido avanza al paso de codigo sin revelar si la cuenta existe', async () => {
    const user = userEvent.setup();

    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });
    await requestForgotPasswordCode(user);

    expect(await screen.findByText(/si aplica, se envi. un c.digo de recuperaci.n/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/c.digo de verificaci.n: d.gito/i)).toHaveLength(6);
  });

  it('un codigo incorrecto incrementa intentos y no habilita la nueva contrasena', async () => {
    const user = userEvent.setup();

    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });
    await requestForgotPasswordCode(user);

    const firstCodeInput = screen.getAllByLabelText(/c.digo de verificaci.n: d.gito/i)[0]!;
    await user.click(firstCodeInput);
    await user.paste('000000');
    await user.click(screen.getByRole('button', { name: /validar c.digo/i }));

    expect(await screen.findByText(/el c.digo ingresado no es correcto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nueva contrase.a/i)).not.toBeInTheDocument();
  });

  it('bloquea temporalmente el codigo tras demasiados intentos fallidos', async () => {
    const user = userEvent.setup();

    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });
    await requestForgotPasswordCode(user);

    const firstCodeInput = screen.getAllByLabelText(/c.digo de verificaci.n: d.gito/i)[0]!;
    await user.click(firstCodeInput);
    await user.paste('000000');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await user.click(screen.getByRole('button', { name: /validar c.digo/i }));
    }

    expect(await screen.findByText(/superaste el n.mero de intentos permitidos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validar c.digo/i })).toBeDisabled();
  });

  it('si cambia el correo, reinicia toda la sesion de recuperacion', async () => {
    const user = userEvent.setup();

    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });
    await requestForgotPasswordCode(user, 'correo-a@docqee.com');

    expect(readForgotPasswordRecoverySession()?.email).toBe('correo-a@docqee.com');

    const emailInput = screen.getByLabelText(/correo electr.nico/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'correo-b@docqee.com');

    expect(screen.queryByRole('button', { name: /validar c.digo/i })).not.toBeInTheDocument();
    expect(readForgotPasswordRecoverySession()).toBeNull();
  });

  it('entra siempre limpio a recuperar contrasena aunque exista una sesion previa', async () => {
    persistForgotPasswordRecoverySession({
      attemptCount: 0,
      blockedUntil: null,
      code: '123456',
      codeValidated: false,
      cooldownUntil: Date.now() - 1000,
      email: 'paciente@correo.com',
      expiresAt: Date.now() - 1000,
    });

    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });

    await waitFor(() => {
      expect(readForgotPasswordRecoverySession()).toBeNull();
    });

    expect(screen.getByLabelText(/correo electr.nico/i)).toHaveValue('');
    expect(screen.queryByRole('button', { name: /reenviar c.digo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /validar c.digo/i })).not.toBeInTheDocument();
  });

  it('con flujo valido completo cambia la contrasena y redirige a login con mensaje de exito', async () => {
    const user = userEvent.setup();

    renderAuthApp({ initialEntries: [ROUTES.forgotPassword] });
    await requestForgotPasswordCode(user);

    const storedCode = readForgotPasswordRecoverySession()?.code ?? '';
    expect(storedCode).toBeTruthy();

    const firstCodeInput = screen.getAllByLabelText(/c.digo de verificaci.n: d.gito/i)[0]!;
    await user.click(firstCodeInput);
    await user.paste(storedCode);
    await user.click(screen.getByRole('button', { name: /validar c.digo/i }));

    expect(await screen.findByLabelText(/^nueva contrase.a$/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^nueva contrase.a$/i), 'ClaveSegura1!');
    await user.type(screen.getByLabelText(/confirmar nueva contrase.a/i), 'ClaveSegura1!');
    await user.click(screen.getByRole('button', { name: /cambiar contrase.a/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /bienvenido/i })).toBeInTheDocument();
    expect(screen.getByText(/contrase.a cambiada correctamente/i)).toBeInTheDocument();
  });

  it('renderiza la pantalla de primer ingreso y valida la nueva contrasena', async () => {
    const user = userEvent.setup();

    renderFirstLoginApp({
      session: {
        accessToken: 'token-1',
        requiresPasswordChange: true,
        user: {
          email: 'admin.uni@docqee.com',
          firstName: 'Laura',
          id: 10,
          lastName: 'Gomez',
          role: 'UNIVERSITY_ADMIN',
          universityId: 8,
        },
      },
    });

    expect(
      screen.getByRole('heading', { level: 1, name: /actualiza tu contrase.a/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/admin.uni@docqee.com/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /guardar y continuar/i }));

    expect(screen.getByText(/la contrase.a es obligatoria/i)).toBeInTheDocument();
    expect(screen.getByText(/debes confirmar la contrase.a/i)).toBeInTheDocument();
  });

  it('al completar el primer ingreso redirige a la ruta del rol y limpia la bandera', async () => {
    const user = userEvent.setup();

    renderFirstLoginApp({
      firstLoginPageProps: {
        service: {
          changePassword: async () => undefined,
        },
      },
      session: {
        accessToken: 'token-2',
        requiresPasswordChange: true,
        user: {
          email: 'admin.uni@docqee.com',
          firstName: 'Laura',
          id: 10,
          lastName: 'Gomez',
          role: 'UNIVERSITY_ADMIN',
          universityId: 8,
        },
      },
    });

    await user.type(screen.getByLabelText(/^contrase.a$/i), 'ClaveSegura1!');
    await user.type(screen.getByLabelText(/confirmar contrase.a/i), 'ClaveSegura1!');
    await user.click(screen.getByRole('button', { name: /guardar y continuar/i }));

    expect(await screen.findByText(/panel universidad/i)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('docqee.auth-session') ?? '{}')).toMatchObject({
      requiresPasswordChange: false,
    });
  });

  it('renderiza la ruta real de registro con sus campos principales', async () => {
    renderAuthApp({ initialEntries: [ROUTES.register] });

    expect(screen.getByRole('heading', { level: 1, name: /crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombres$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^apellidos$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^tipo de documento$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^localidad$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contrase.a/i)).toBeInTheDocument();
    await waitForRegisterCatalogs();
  });

  it('mantiene localidad deshabilitada hasta seleccionar una ciudad y muestra el placeholder esperado', async () => {
    renderAuthApp({ initialEntries: [ROUTES.register] });

    await waitForRegisterCatalogs();

    const localitySelect = screen.getByLabelText(/^localidad$/i);

    expect(localitySelect).toBeDisabled();
    expect(localitySelect).toHaveDisplayValue('Selecciona una ciudad primero');
  });

  it('renderiza exactamente las opciones de sexo esperadas', () => {
    renderAuthApp({ initialEntries: [ROUTES.register] });

    expect(screen.getByLabelText(/^sexo$/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'FEMENINO' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'MASCULINO' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'OTRO' })).toBeInTheDocument();
  });

  it('muestra y oculta el bloque de tutor segun la edad del paciente', async () => {
    renderAuthApp({
      initialEntries: [ROUTES.register],
      registerPageProps: { today: new Date('2026-04-03T12:00:00.000Z') },
    });

    const birthDateInput = screen.getByLabelText(/fecha de nacimiento/i);

    expect(screen.queryByLabelText(/nombres del tutor/i)).not.toBeInTheDocument();

    fireEvent.change(birthDateInput, { target: { value: '2010-04-04' } });
    expect(await screen.findByLabelText(/nombres del tutor/i)).toBeInTheDocument();

    fireEvent.change(birthDateInput, { target: { value: '2000-04-03' } });
    await waitFor(() => {
      expect(screen.queryByLabelText(/nombres del tutor/i)).not.toBeInTheDocument();
    });
  });

  it('valida la fortaleza de la contrasena antes de permitir el envio', async () => {
    const user = userEvent.setup();

    renderAuthApp({
      initialEntries: [ROUTES.register],
      registerPageProps: { today: new Date('2026-04-03T12:00:00.000Z') },
    });

    await fillValidRegisterForm(user, { password: 'clave' });
    await user.click(screen.getByRole('button', { name: /^crear cuenta$/i }));

    expect(screen.getByText(/la contrase.a debe cumplir todos los requisitos/i)).toBeInTheDocument();
  });

  it('envia un registro valido a la verificacion de correo con el email capturado', async () => {
    const user = userEvent.setup();

    renderAuthApp({
      initialEntries: [ROUTES.register],
      registerPageProps: { today: new Date('2026-04-03T12:00:00.000Z') },
    });

    await fillValidRegisterForm(user);
    await user.click(screen.getByRole('button', { name: /^crear cuenta$/i }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /verificaci.n de correo/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/paciente@correo.com/i)).toBeInTheDocument();
  });

  it('renderiza la pantalla de verificacion con seis casillas para el codigo', () => {
    renderAuthApp({
      initialEntries: [{ pathname: ROUTES.verifyEmail, state: { email: 'paciente@correo.com' } }],
    });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /verificaci.n de correo/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/paciente@correo.com/i)).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /^verificar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reenviar c.digo/i })).toBeInTheDocument();
  });

  it('valida que el codigo tenga exactamente 6 digitos antes de verificar', async () => {
    const user = userEvent.setup();

    renderAuthApp({
      initialEntries: [{ pathname: ROUTES.verifyEmail, state: { email: 'paciente@correo.com' } }],
    });

    const codeInputs = screen.getAllByRole('textbox');
    const firstCodeInput = codeInputs[0]!;
    const secondCodeInput = codeInputs[1]!;

    await user.type(firstCodeInput, '1');
    await user.type(secondCodeInput, '2');
    await user.click(screen.getByRole('button', { name: /^verificar$/i }));

    expect(screen.getByText(/ingresa un c.digo v.lido de 6 d.gitos/i)).toBeInTheDocument();
  });

  it('acepta un codigo valido de 6 digitos y redirige al login', async () => {
    const user = userEvent.setup();

    renderAuthApp({
      initialEntries: [{ pathname: ROUTES.verifyEmail, state: { email: 'paciente@correo.com' } }],
    });

    const firstCodeInput = screen.getAllByRole('textbox')[0]!;

    await user.click(firstCodeInput);
    await user.paste('123456');
    await user.click(screen.getByRole('button', { name: /^verificar$/i }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /bienvenido/i,
      }),
    ).toBeInTheDocument();
  });

  it('mantiene el cooldown de reenvio incluso despues de recargar la pagina', () => {
    persistVerifyEmailCooldown(60);

    renderAuthApp({
      initialEntries: [{ pathname: ROUTES.verifyEmail, state: { email: 'paciente@correo.com' } }],
    });

    expect(screen.getByText(/podr.s solicitar un nuevo c.digo en/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reenviar c.digo/i })).toBeDisabled();
  });

  it('marca las rutas de registro y verificacion con noindex', async () => {
    const user = userEvent.setup();

    renderAuthApp({
      initialEntries: [ROUTES.register],
      registerPageProps: { today: new Date('2026-04-03T12:00:00.000Z') },
    });

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
    });

    await fillValidRegisterForm(user);
    await user.click(screen.getByRole('button', { name: /^crear cuenta$/i }));

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
    });
  });
});
