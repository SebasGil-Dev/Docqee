import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/login/LoginPage';
import { HomePage } from '@/pages/home/HomePage';
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
        element: <NotFoundPage />,
        path: '*',
      },
    ],
    { initialEntries },
  );

  return render(
    <RouterProvider
      future={{ v7_startTransition: true }}
      router={router}
    />,
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
      screen.getByRole('heading', { level: 2, name: /vincula tu universidad a docqee/i }),
    ).toBeInTheDocument();
  });

  it('prepara los enlaces de crear cuenta hacia la ruta de registro', () => {
    renderApp();

    const createAccountLinks = screen.getAllByRole('link', { name: /crear cuenta/i });

    expect(createAccountLinks.length).toBeGreaterThan(0);
    createAccountLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', ROUTES.register);
    });
  });

  it('prepara los enlaces de iniciar sesión hacia la ruta de login', () => {
    renderApp();

    const loginLinks = screen.getAllByRole('link', { name: /iniciar sesión/i });

    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', ROUTES.login);
    });
  });

  it('renderiza la ruta de inicio de sesión', () => {
    renderApp([ROUTES.login]);

    expect(screen.getByRole('heading', { level: 1, name: /bienvenido/i })).toBeInTheDocument();
  });
});
