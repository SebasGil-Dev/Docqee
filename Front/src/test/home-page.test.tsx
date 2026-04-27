import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/login/LoginPage';
import { HomePage } from '@/pages/home/HomePage';
import {
  PrivacyPolicyPage,
  TermsAndConditionsPage,
} from '@/pages/home/LegalPlaceholderPage';
import { NotFoundPage } from '@/pages/home/NotFoundPage';
import { RoutePlaceholderPage } from '@/pages/home/RoutePlaceholderPage';

function renderApp(initialEntries: string[] = [ROUTES.home]) {
  const router = createMemoryRouter(
    [
      {
        element: <HomePage />,
        path: ROUTES.home,
      },
      {
        element: <LoginPage />,
        path: ROUTES.login,
      },
      {
        element: <RoutePlaceholderPage kind="register" />,
        path: ROUTES.register,
      },
      {
        element: <ForgotPasswordPage />,
        path: ROUTES.forgotPassword,
      },
      {
        element: <PrivacyPolicyPage />,
        path: ROUTES.privacyPolicy,
      },
      {
        element: <TermsAndConditionsPage />,
        path: ROUTES.termsAndConditions,
      },
      {
        element: <NotFoundPage />,
        path: '*',
      },
    ],
    { initialEntries },
  );

  return render(
    <RouterProvider future={{ v7_startTransition: true }} router={router} />,
  );
}

describe('HomePage', () => {
  it('renderiza el h1 principal y las secciones clave', () => {
    renderApp();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /tu puente hacia la .*odontol.* universitaria/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: /c.mo funciona docqee/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /universidades aliadas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /vincula tu universidad a docqee/i,
      }),
    ).toBeInTheDocument();
  });

  it('permite cambiar la vista entre paciente y estudiante en como funciona', async () => {
    const user = userEvent.setup();

    renderApp();

    expect(screen.getByRole('button', { name: /paciente/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /crea tu cuenta o inicia sesi.n/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /estudiante/i }));

    expect(screen.getByRole('button', { name: /estudiante/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /completa tu perfil profesional/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/agrega informaci.n, tratamientos y disponibilidad/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /recibe solicitudes de pacientes/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /gestiona citas y tratamientos/i,
      }),
    ).toBeInTheDocument();
  });

  it('prepara los enlaces de crear cuenta hacia la ruta de registro', () => {
    renderApp();

    const createAccountLinks = screen.getAllByRole('link', {
      name: /crear cuenta/i,
    });

    expect(createAccountLinks.length).toBeGreaterThan(0);
    createAccountLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', ROUTES.register);
    });
  });

  it('prepara los enlaces de youtube hacia la playlist de tutoriales', () => {
    renderApp();

    const youtubeLinks = screen.getAllByRole('link', { name: /youtube/i });

    expect(youtubeLinks.length).toBeGreaterThan(0);
    youtubeLinks.forEach((link) => {
      expect(link).toHaveAttribute(
        'href',
        'https://www.youtube.com/playlist?list=PLNiE_Z3RqyitU1iWudrgYaAvob1Okd68k',
      );
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  it('prepara los enlaces legales de vinculacion en una nueva pestana', () => {
    renderApp();

    expect(
      screen.getByRole('link', { name: /pol.tica de privacidad/i }),
    ).toHaveAttribute('href', ROUTES.privacyPolicy);
    expect(
      screen.getByRole('link', { name: /pol.tica de privacidad/i }),
    ).toHaveAttribute('target', '_blank');
    expect(
      screen.getByRole('link', { name: /t.rminos y condiciones/i }),
    ).toHaveAttribute('href', ROUTES.termsAndConditions);
    expect(
      screen.getByRole('link', { name: /t.rminos y condiciones/i }),
    ).toHaveAttribute('target', '_blank');
  });

  it('prepara los enlaces de iniciar sesion hacia la ruta de login', () => {
    renderApp();

    const loginLinks = screen.getAllByRole('link', { name: /iniciar sesi.n/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', ROUTES.login);
    });
  });

  it('renderiza la ruta de inicio de sesion', () => {
    renderApp([ROUTES.login]);

    expect(
      screen.getByRole('heading', { level: 1, name: /bienvenido/i }),
    ).toBeInTheDocument();
  });

  it('renderiza las rutas placeholder legales', () => {
    renderApp([ROUTES.privacyPolicy]);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /pol.tica de privacidad/i,
      }),
    ).toBeInTheDocument();
  });
});
