import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants/routes';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminCredentialsPage } from '@/pages/admin/credentials/AdminCredentialsPage';
import { AdminRegisterUniversityPage } from '@/pages/admin/register-university/AdminRegisterUniversityPage';
import { AdminUniversitiesPage } from '@/pages/admin/universities/AdminUniversitiesPage';
import { resetAdminModuleState } from '@/lib/adminModuleStore';

function renderAdminApp(
  initialEntries: MemoryRouterProps['initialEntries'] = [
    ROUTES.adminUniversities,
  ],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<AdminLayout />} path={ROUTES.adminRoot}>
          <Route
            element={<Navigate replace to={ROUTES.adminUniversities} />}
            index
          />
          <Route element={<AdminUniversitiesPage />} path="universidades" />
          <Route
            element={<AdminRegisterUniversityPage />}
            path="universidades/registrar"
          />
          <Route element={<AdminCredentialsPage />} path="credenciales" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

async function fillRegisterUniversityForm(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.type(
    screen.getByLabelText(/nombre de la universidad/i),
    'Universidad del Sur Clinico',
  );
  await screen.findByRole('option', { name: /^Pereira$/i });
  await user.selectOptions(screen.getByLabelText(/^ciudad$/i), 'city-pereira');
  await screen.findByRole('option', { name: /Comuna Centro/i });
  await user.selectOptions(
    screen.getByLabelText(/localidad principal/i),
    'locality-pereira-centro',
  );
  await user.type(
    screen.getByLabelText(/nombres del administrador universitario/i),
    'Camila',
  );
  await user.type(
    screen.getByLabelText(/apellidos del administrador universitario/i),
    'Mora',
  );
  await user.type(
    screen.getByLabelText(/correo del administrador universitario/i),
    'camila.mora@universidadsur.edu.co',
  );
  await user.type(screen.getByLabelText(/celular opcional/i), '3007778899');
}

describe('Admin pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
    resetAdminModuleState();
  });

  it('mantiene Universidades activa en listado y registro', () => {
    const firstRender = renderAdminApp([ROUTES.adminUniversities]);

    expect(
      screen.getByRole('link', { name: /^Universidades$/i }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('link', { name: /Envio de Credenciales/i }),
    ).not.toHaveAttribute('aria-current');

    firstRender.unmount();
    renderAdminApp([ROUTES.adminRegisterUniversity]);

    expect(
      screen.getByRole('link', { name: /^Universidades$/i }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('filtra universidades por nombre', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminUniversities]);

    await user.type(screen.getByLabelText(/buscar universidad/i), 'Pacifico');

    expect(
      screen.getByText(/Universidad del Pacifico Dental/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Universidad Clinica del Norte/i),
    ).not.toBeInTheDocument();
  });

  it('filtra credenciales por universidad y por estado', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminCredentials]);

    await user.type(screen.getByLabelText(/buscar universidad/i), 'Pacifico');

    expect(
      screen.getByText(/Universidad del Pacifico Dental/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Corporacion Oral del Caribe/i),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar universidad/i));
    await user.click(screen.getByRole('button', { name: /filtrar credenciales/i }));
    await user.click(screen.getByRole('menuitemradio', { name: /^Enviada$/i }));

    expect(
      screen.getByText(/Corporacion Oral del Caribe/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Universidad del Pacifico Dental/i),
    ).not.toBeInTheDocument();
  });

  it('valida campos requeridos y el formato de correo al registrar una universidad', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminRegisterUniversity]);

    await user.click(
      screen.getByRole('button', { name: /registrar universidad/i }),
    );

    expect(
      screen.getByText(/el nombre de la universidad es obligatorio/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/la ciudad es obligatoria/i)).toBeInTheDocument();
    expect(
      screen.getByText(/la localidad principal es obligatoria/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /los nombres del administrador universitario son obligatorios/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre de la universidad/i)).toHaveFocus();

    await user.type(
      screen.getByLabelText(/nombre de la universidad/i),
      'Universidad Nova',
    );
    await screen.findByRole('option', { name: /^(Bogota|Bogotá)$/i });
    await user.selectOptions(screen.getByLabelText(/^ciudad$/i), 'city-bogota');
    await screen.findByRole('option', { name: /^Suba$/i });
    await user.selectOptions(
      screen.getByLabelText(/localidad principal/i),
      'locality-bogota-suba',
    );
    await user.type(
      screen.getByLabelText(/nombres del administrador universitario/i),
      'Luisa',
    );
    await user.type(
      screen.getByLabelText(/apellidos del administrador universitario/i),
      'Gomez',
    );
    await user.type(
      screen.getByLabelText(/correo del administrador universitario/i),
      'correo-invalido',
    );
    await user.click(
      screen.getByRole('button', { name: /registrar universidad/i }),
    );

    expect(
      screen.getByText(/ingresa un correo electronico valido/i),
    ).toBeInTheDocument();
  });

  it('solo permite escoger una localidad despues de seleccionar ciudad', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminRegisterUniversity]);

    const citySelect = screen.getByLabelText(/^ciudad$/i);
    const localitySelect = screen.getByLabelText(/localidad principal/i);

    expect(localitySelect).toBeDisabled();

    await screen.findByRole('option', { name: /^(Medellin|Medellín)$/i });
    await user.selectOptions(citySelect, 'city-medellin');

    await screen.findByRole('option', { name: /Laureles/i });
    expect(localitySelect).toBeEnabled();
    expect(
      within(localitySelect).getByRole('option', { name: /Laureles/i }),
    ).toBeInTheDocument();
  });

  it('registra una universidad pending y crea su credencial generated', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminUniversities]);

    await user.click(
      screen.getByRole('link', { name: /registrar universidad/i }),
    );
    await fillRegisterUniversityForm(user);
    await user.click(
      screen.getByRole('button', { name: /registrar universidad/i }),
    );

    expect(
      await screen.findByText(/Universidad del Sur Clinico/i),
    ).toBeInTheDocument();

    const universityRow = screen
      .getByText(/Universidad del Sur Clinico/i)
      .closest('tr');
    expect(universityRow).not.toBeNull();
    expect(
      within(universityRow!).getAllByText(/^Pendiente$/i),
    ).not.toHaveLength(0);

    await user.click(
      screen.getByRole('link', { name: /Envio de Credenciales/i }),
    );

    const credentialRow = (
      await screen.findByText(/Universidad del Sur Clinico/i)
    ).closest('tr');
    expect(credentialRow).not.toBeNull();
    expect(within(credentialRow!).getByText(/^Generada$/i)).toBeInTheDocument();
  });

  it('permite activar e inactivar universidades consolidadas', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminUniversities]);

    const activeRow = screen
      .getByText(/Universidad Clinica del Norte/i)
      .closest('tr');
    expect(activeRow).not.toBeNull();

    await user.click(
      within(activeRow!).getByRole('button', { name: /inactivar/i }),
    );

    expect(within(activeRow!).getByText(/^Inactiva$/i)).toBeInTheDocument();
    expect(
      within(activeRow!).getByRole('button', { name: /activar/i }),
    ).toBeInTheDocument();
  });

  it('enviar solo cambia la credencial y mantiene la universidad en pending', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminCredentials]);

    const credentialRow = screen
      .getByText(/Universidad del Pacifico Dental/i)
      .closest('tr');
    expect(credentialRow).not.toBeNull();

    await user.click(
      within(credentialRow!).getByRole('button', { name: /^Enviar$/i }),
    );

    expect(within(credentialRow!).getByText(/^Enviada$/i)).toBeInTheDocument();
    expect(
      within(credentialRow!).getByRole('button', { name: /reenviar/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Universidades$/i }));

    const universityRow = await screen.findByText(
      /Universidad del Pacifico Dental/i,
    );
    const pendingRow = universityRow.closest('tr');
    expect(pendingRow).not.toBeNull();
    expect(within(pendingRow!).getAllByText(/^Pendiente$/i)).not.toHaveLength(
      0,
    );
  });

  it('permite editar el correo del administrador antes de enviar la credencial', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminCredentials]);

    const credentialRow = screen
      .getByText(/Universidad del Pacifico Dental/i)
      .closest('tr');
    expect(credentialRow).not.toBeNull();

    await user.click(
      within(credentialRow!).getByRole('button', { name: /editar correo/i }),
    );

    const emailInput = within(credentialRow!).getByLabelText(
      /correo electronico de Sofia Rojas/i,
    );
    await user.clear(emailInput);
    await user.type(emailInput, 'nuevo.correo@universidadpacifico.edu.co');

    await user.click(
      within(credentialRow!).getByRole('button', { name: /guardar correo/i }),
    );

    expect(
      await within(credentialRow!).findByText(/nuevo\.correo@universidadpacifico\.edu\.co/i),
    ).toBeInTheDocument();

    await user.click(within(credentialRow!).getByRole('button', { name: /^Enviar$/i }));

    expect(within(credentialRow!).getByText(/^Enviada$/i)).toBeInTheDocument();
  });

  it('eliminar remueve la credencial pendiente y la universidad asociada', async () => {
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminCredentials]);

    const credentialRow = screen
      .getByText(/Corporacion Oral del Caribe/i)
      .closest('tr');
    expect(credentialRow).not.toBeNull();

    await user.click(
      within(credentialRow!).getByRole('button', { name: /eliminar/i }),
    );

    expect(
      screen.queryByText(/Corporacion Oral del Caribe/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Universidades$/i }));

    expect(
      screen.queryByText(/Corporacion Oral del Caribe/i),
    ).not.toBeInTheDocument();
  });

  it('restaura el seed inicial al simular un nuevo arranque de la app', async () => {
    const user = userEvent.setup();

    const firstRender = renderAdminApp([ROUTES.adminCredentials]);
    const credentialRow = screen
      .getByText(/Corporacion Oral del Caribe/i)
      .closest('tr');
    expect(credentialRow).not.toBeNull();

    await user.click(
      within(credentialRow!).getByRole('button', { name: /eliminar/i }),
    );
    expect(
      screen.queryByText(/Corporacion Oral del Caribe/i),
    ).not.toBeInTheDocument();

    firstRender.unmount();
    resetAdminModuleState();
    renderAdminApp([ROUTES.adminCredentials]);

    expect(
      screen.getByText(/Corporacion Oral del Caribe/i),
    ).toBeInTheDocument();
  });

  it('mantiene la bottom navigation movil en todo el modulo admin y actualiza la opcion activa', async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();

    renderAdminApp([ROUTES.adminUniversities]);

    expect(
      screen.queryByRole('button', { name: /cerrar menu lateral/i }),
    ).not.toBeInTheDocument();

    const mobileNavigation = screen.getByRole('navigation', {
      name: /navegacion inferior administrativa/i,
    });

    expect(
      within(mobileNavigation).getByRole('link', { name: /^Universidades$/i }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(mobileNavigation).getByRole('link', {
        name: /Envio de Credenciales/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(mobileNavigation).getByRole('button', { name: /cerrar sesion/i }),
    ).toBeInTheDocument();

    await user.click(
      within(mobileNavigation).getByRole('link', {
        name: /Envio de Credenciales/i,
      }),
    );

    expect(
      await screen.findByRole('heading', { name: /Envio de Credenciales/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cerrar menu lateral/i }),
    ).not.toBeInTheDocument();

    const credentialsNavigation = screen.getByRole('navigation', {
      name: /navegacion inferior administrativa/i,
    });

    expect(
      within(credentialsNavigation).getByRole('link', {
        name: /Envio de Credenciales/i,
      }),
    ).toHaveAttribute('aria-current', 'page');

    await user.click(
      within(credentialsNavigation).getByRole('link', {
        name: /^Universidades$/i,
      }),
    );

    await user.click(screen.getByRole('link', { name: /registrar universidad/i }));

    expect(
      await screen.findByLabelText(/nombre de la universidad/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cerrar menu lateral/i }),
    ).not.toBeInTheDocument();

    const registerNavigation = screen.getByRole('navigation', {
      name: /navegacion inferior administrativa/i,
    });

    expect(
      within(registerNavigation).getByRole('link', { name: /^Universidades$/i }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
