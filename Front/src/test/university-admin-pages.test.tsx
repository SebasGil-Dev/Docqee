import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { ROUTES } from '@/constants/routes';
import { resetUniversityAdminModuleState } from '@/lib/universityAdminModuleStore';
import { UniversityAdminLayout } from '@/pages/university-admin/UniversityAdminLayout';
import {
  UniversityBulkUploadPage,
  validateStudentRows,
  validateTeacherRows,
} from '@/pages/university-admin/bulk-upload/UniversityBulkUploadPage';
import { UniversityCredentialsPage } from '@/pages/university-admin/credentials/UniversityCredentialsPage';
import { UniversityHomePage } from '@/pages/university-admin/home/UniversityHomePage';
import { UniversityInstitutionPage } from '@/pages/university-admin/institution/UniversityInstitutionPage';
import { UniversityRegisterStudentPage } from '@/pages/university-admin/students/UniversityRegisterStudentPage';
import { UniversityStudentsPage } from '@/pages/university-admin/students/UniversityStudentsPage';
import { UniversityRegisterTeacherPage } from '@/pages/university-admin/teachers/UniversityRegisterTeacherPage';
import { UniversityTeachersPage } from '@/pages/university-admin/teachers/UniversityTeachersPage';

function renderUniversityApp(
  initialEntries: MemoryRouterProps['initialEntries'] = [ROUTES.universityHome],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<UniversityAdminLayout />} path={ROUTES.universityRoot}>
          <Route
            element={<Navigate replace to={ROUTES.universityHome} />}
            index
          />
          <Route element={<UniversityHomePage />} path="inicio" />
          <Route
            element={<UniversityInstitutionPage />}
            path="informacion-institucional"
          />
          <Route element={<UniversityStudentsPage />} path="estudiantes" />
          <Route
            element={<UniversityRegisterStudentPage />}
            path="estudiantes/registrar"
          />
          <Route element={<UniversityTeachersPage />} path="docentes" />
          <Route
            element={<UniversityRegisterTeacherPage />}
            path="docentes/registrar"
          />
          <Route element={<UniversityBulkUploadPage />} path="carga-masiva" />
          <Route element={<UniversityCredentialsPage />} path="credenciales" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function mockUniversityAdminViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      addEventListener: () => undefined,
      addListener: () => undefined,
      dispatchEvent: () => false,
      matches,
      media: '(max-width: 1023px)',
      onchange: null,
      removeEventListener: () => undefined,
      removeListener: () => undefined,
    }),
  });
}

async function fillStudentForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nombres$/i), 'Juliana');
  await user.type(screen.getByLabelText(/^Apellidos$/i), 'Marin');
  await user.selectOptions(
    screen.getByLabelText(/tipo de documento/i),
    'document-cc',
  );
  await user.type(
    screen.getByLabelText(/n[uú]mero de documento/i),
    '1032456789',
  );
  await user.type(
    screen.getByLabelText(/correo electr[oó]nico/i),
    'juliana.marin@clinicadelnorte.edu.co',
  );
  await user.type(screen.getByLabelText(/^Celular$/i), '3002223344');
  await user.selectOptions(screen.getByLabelText(/^Semestre$/i), '7');
}

async function fillTeacherForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nombres$/i), 'Patricia');
  await user.type(screen.getByLabelText(/^Apellidos$/i), 'Mendoza');
  await user.selectOptions(
    screen.getByLabelText(/tipo de documento/i),
    'document-cc',
  );
  await user.type(screen.getByLabelText(/n[uú]mero de documento/i), '80111222');
}

function createWorkbookFile(
  fileName: string,
  rows: Array<Array<string | number>>,
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

  return new File(
    [XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })],
    fileName,
    {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  );
}

describe('University admin pages', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUniversityAdminViewport(false);
    resetUniversityAdminModuleState();
  });

  it('mantiene la preferencia del sidebar al recargar', async () => {
    const user = userEvent.setup();
    const firstRender = renderUniversityApp([ROUTES.universityStudents]);

    await user.click(
      screen.getByRole('button', { name: /cerrar menu lateral/i }),
    );
    expect(
      screen.getByRole('link', { name: /cerrar sesión/i }),
    ).toHaveAttribute('title', 'Cerrar sesión');

    expect(window.localStorage.getItem('docqee-admin-sidebar-collapsed')).toBe(
      'true',
    );

    firstRender.unmount();
    renderUniversityApp([ROUTES.universityStudents]);

    expect(
      screen.getByRole('button', { name: /abrir menu lateral/i }),
    ).toBeInTheDocument();
  });

  it('muestra accesos universitarios dentro del menu hamburguesa movil', async () => {
    const user = userEvent.setup();

    mockUniversityAdminViewport(true);
    renderUniversityApp([ROUTES.universityHome]);

    await user.click(screen.getByRole('button', { name: /abrir menú de cuenta/i }));

    const menu = screen.getByRole('menu');
    expect(
      within(menu).getByRole('menuitem', { name: /información institucional/i }),
    ).toHaveAttribute('href', ROUTES.universityInstitution);
    expect(
      within(menu).getByRole('menuitem', { name: /carga masiva/i }),
    ).toHaveAttribute('href', ROUTES.universityBulkUpload);
    expect(
      within(menu).getByRole('menuitem', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();

    const bottomNavigation = screen.getByRole('navigation', {
      name: /navegacion inferior administrativa/i,
    });
    expect(
      within(bottomNavigation).queryByRole('link', {
        name: /información institucional/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(bottomNavigation).queryByRole('link', { name: /carga masiva/i }),
    ).not.toBeInTheDocument();
    expect(
      within(bottomNavigation).getByRole('link', { name: /^inicio$/i }),
    ).toBeInTheDocument();
    expect(
      within(bottomNavigation).getByRole('link', { name: /estudiantes/i }),
    ).toBeInTheDocument();
    expect(
      within(bottomNavigation).getByRole('link', { name: /docentes/i }),
    ).toBeInTheDocument();
    expect(
      within(bottomNavigation).getByRole('link', { name: /credenciales/i }),
    ).toBeInTheDocument();
  });

  it('muestra el inicio con el resumen operativo de la universidad', async () => {
    renderUniversityApp([ROUTES.universityHome]);

    expect(
      screen.getByText(/bienvenido, jonathan acevedo/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/universidad clinica del norte/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/semestre 8 \u00b7 04\/01\/2026/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Nicolas Pardo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Estudiantes$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/estado de estudiantes/i)).toBeInTheDocument();
    expect(screen.getByText(/equipo y sedes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/últimos registros/i).length).toBeGreaterThan(0);
  });

  it('permite guardar, restablecer y actualizar la contraseña en informacion institucional', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityInstitution]);

    const localitySelect = screen.getByLabelText(/localidad principal/i);
    expect(localitySelect).toBeDisabled();

    await waitFor(() => {
      expect(localitySelect).toBeEnabled();
    });

    await waitFor(() => {
      expect(
        within(screen.getByLabelText(/ciudad principal/i)).getAllByRole(
          'option',
        ).length,
      ).toBeGreaterThan(1);
    });
    await user.selectOptions(
      screen.getByLabelText(/ciudad principal/i),
      'city-medellin',
    );
    await screen.findByRole('option', { name: /Laureles/i });
    expect(localitySelect).toBeEnabled();
    await user.selectOptions(localitySelect, 'locality-medellin-laureles');

    const institutionName = screen.getByLabelText(/nombre de la universidad/i);
    await user.clear(institutionName);
    await user.type(institutionName, 'Universidad Clinica del Centro');
    await user.clear(screen.getByLabelText(/^Nombres$/i));
    await user.type(screen.getByLabelText(/^Nombres$/i), 'Jonathan');
    await user.clear(screen.getByLabelText(/^Apellidos$/i));
    await user.type(screen.getByLabelText(/^Apellidos$/i), 'Acevedo');
    await user.type(screen.getByLabelText(/nombre de la sede/i), 'Sede Centro');
    await user.type(screen.getByLabelText(/dirección/i), 'Cra. 45 # 10-22');
    await user.selectOptions(screen.getByLabelText(/^Ciudad$/i), 'city-cali');
    await screen.findByRole('option', { name: /Comuna 17/i });
    await user.selectOptions(
      screen.getByLabelText(/^Localidad$/i),
      'locality-cali-comuna-17',
    );
    await user.click(screen.getByRole('button', { name: /agregar sede/i }));
    expect(screen.getAllByText(/Sede Centro/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /se guardaron correctamente/i,
    );

    await user.clear(institutionName);
    await user.type(institutionName, 'Temporal');
    await user.click(screen.getByRole('button', { name: /restablecer/i }));
    expect(institutionName).toHaveValue('Universidad Clinica del Centro');
    expect(screen.getAllByText(/Sede Centro/i).length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole('button', { name: /cambiar contraseña/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /actualizar contraseña/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByText(/requisitos de la nueva contraseña/i),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/contraseña actual/i), 'Actual123!');
    await user.type(
      screen.getByLabelText(/^nueva contraseña$/i),
      'ClaveNueva123!',
    );
    await user.type(
      screen.getByLabelText(/confirmar contraseña/i),
      'ClaveNueva123!',
    );
    await user.click(
      screen.getByRole('button', { name: /actualizar contraseña/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText(/La contraseña se actualizó correctamente/i),
    ).toBeInTheDocument();
  });

  it('registra estudiantes activos y genera su credencial inicial', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityRegisterStudent]);

    await fillStudentForm(user);
    await user.click(
      screen.getByRole('button', { name: /^registrar$/i }),
    );

    expect(await screen.findByText(/Juliana Marin/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /credencial inicial quedo generada/i,
    );

    await user.click(screen.getByRole('link', { name: /^Credenciales$/i }));

    const credentialRow = screen.getByText(/Juliana Marin/i).closest('tr');
    expect(credentialRow).not.toBeNull();
    expect(within(credentialRow!).getByText(/^Generada$/i)).toBeInTheDocument();
  });

  it('muestra solo el boton Registrar con el color principal', () => {
    renderUniversityApp([ROUTES.universityRegisterStudent]);

    const registerButton = screen.getByRole('button', {
      name: /^registrar$/i,
    });
    const backLink = screen.getByRole('link', {
      name: /volver a estudiantes/i,
    });

    expect(registerButton).toBeInTheDocument();
    expect(registerButton).toHaveClass('bg-brand-gradient');
    expect(backLink).toHaveClass('bg-brand-gradient');
    expect(
      screen.queryByRole('button', { name: /guardar y continuar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /registrar estudiante/i }),
    ).not.toBeInTheDocument();
  });

  it('filtra estudiantes por estado derivado y por busqueda', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityStudents]);

    expect(
      screen.getByRole('heading', { name: /gestión de estudiantes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        /buscar por nombre o número de identificación/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Valentina Rios/i)).toBeInTheDocument();
    expect(screen.getByText(/Tomas Herrera/i)).toBeInTheDocument();
    expect(screen.getByText(/Camila Vega/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /filtrar estudiantes por estado/i }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: /Pendiente/i }));

    expect(screen.getByText(/Valentina Rios/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tomas Herrera/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Camila Vega/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/^Pendiente$/i, {
        selector: '[title="Envia la credencial primero"]',
      }),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/buscar estudiante/i));
    await user.type(screen.getByLabelText(/buscar estudiante/i), 'valentina');

    expect(screen.getByText(/Valentina Rios/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /inactivar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/^Pendiente$/i, {
        selector: '[title="Envia la credencial primero"]',
      }),
    ).toHaveAttribute('title', 'Envia la credencial primero');
  });

  it('compacta la informacion del estudiante para la vista movil', () => {
    renderUniversityApp([ROUTES.universityStudents]);

    const studentSummary = screen.getByTestId(
      'university-student-mobile-summary-student-1',
    );

    expect(studentSummary).toHaveTextContent(/Valentina Rios.*Semestre 8/i);
    expect(studentSummary).toHaveTextContent(/CC 1092384122/i);
    expect(studentSummary).toHaveTextContent(
      /valentina\.rios@clinicadelnorte\.edu\.co/i,
    );
    expect(studentSummary).toHaveTextContent(/Registro del estudiante/i);
  });

  it('solicita confirmacion antes de cambiar el estado del estudiante', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityStudents]);

    const studentRow = screen.getByText(/Tomas Herrera/i).closest('tr');
    expect(studentRow).not.toBeNull();

    await user.click(
      within(studentRow!).getByRole('button', {
        name: /^inactivar$/i,
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: /quieres inactivar este estudiante/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/el estudiante tomas herrera quedar[aá] inactivo/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /s[i\u00ed], inactivar/i,
      }),
    );

    await waitFor(() => {
      expect(
        within(studentRow!).getByRole('button', { name: /^activar$/i }),
      ).toBeInTheDocument();
    });
    expect(
      within(studentRow!).queryByRole('button', { name: /^inactivar$/i }),
    ).not.toBeInTheDocument();
  });

  it('no cambia el estado del estudiante hasta confirmar la advertencia', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityStudents]);

    const studentRow = screen.getByText(/Tomas Herrera/i).closest('tr');
    expect(studentRow).not.toBeNull();

    const deactivateButton = within(studentRow!).getByRole('button', {
      name: /^inactivar$/i,
    });
    await user.dblClick(deactivateButton);

    expect(
      screen.getByRole('heading', {
        name: /quieres inactivar este estudiante/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(studentRow!).getByRole('button', { name: /^inactivar$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /no, cancelar/i }));

    expect(
      screen.queryByRole('heading', {
        name: /quieres inactivar este estudiante/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(studentRow!).getByRole('button', { name: /^inactivar$/i }),
    ).toBeInTheDocument();
  });

  it('centra y muestra los textos corregidos en registrar estudiante', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityRegisterStudent]);

    expect(
      screen.getByRole('heading', { name: /registrar estudiante/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/n[uú]mero de documento/i)).toHaveAttribute(
      'placeholder',
      'Ingresa el número de documento',
    );
    expect(screen.getByLabelText(/correo electr[oó]nico/i)).toBeInTheDocument();

    const documentInput = screen.getByLabelText(/n[uú]mero de documento/i);
    await user.type(documentInput, '10a-32x');
    expect(documentInput).toHaveValue('1032');
    await user.clear(documentInput);

    await user.click(
      screen.getByRole('button', { name: /^registrar$/i }),
    );

    expect(
      await screen.findByText(/el número de documento es obligatorio/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/el correo electrónico es obligatorio/i),
    ).toBeInTheDocument();
  });

  it('registra docentes sin crear credenciales', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityRegisterTeacher]);

    await fillTeacherForm(user);
    await user.click(
      screen.getByRole('button', { name: /registrar docente/i }),
    );

    expect(await screen.findByText(/Patricia Mendoza/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /docente se registro correctamente/i,
    );

    await user.click(screen.getByRole('link', { name: /^Credenciales$/i }));
    expect(screen.queryByText(/Patricia Mendoza/i)).not.toBeInTheDocument();
  });

  it('filtra docentes por estado y permite cambiar su estado operativo', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityTeachers]);

    expect(
      screen.getByRole('heading', { name: /gestión de docentes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        /buscar por nombre o número de identificación/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Administra el listado de docentes vinculados/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/El modulo permite registrar docentes/i),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /filtrar docentes por estado/i }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: /Inactivo/i }));

    expect(screen.getByText(/Laura Martinez/i)).toBeInTheDocument();
    expect(screen.queryByText(/Andres Villamizar/i)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /filtrar docentes por estado\. actual: inactivo/i,
      }),
    );
    await user.click(screen.getByRole('menuitemradio', { name: /^Activo$/i }));
    await user.clear(screen.getByLabelText(/buscar docente/i));
    await user.type(screen.getByLabelText(/buscar docente/i), 'andres');

    const teacherRow = screen.getByText(/Andres Villamizar/i).closest('tr');
    expect(teacherRow).not.toBeNull();
    await user.click(
      within(teacherRow!).getByRole('button', { name: /inactivar/i }),
    );
    expect(
      screen.getByRole('heading', {
        name: /quieres inactivar este docente/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/el docente andres villamizar quedar[aá] inactivo/i),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /s[i\u00ed], inactivar/i }),
    );
    await waitFor(() => {
      expect(screen.queryByText(/Andres Villamizar/i)).not.toBeInTheDocument();
    });
  });

  it('compacta la informacion del docente para la vista movil', () => {
    renderUniversityApp([ROUTES.universityTeachers]);

    const teacherSummary = screen.getByTestId(
      'university-teacher-mobile-summary-teacher-1',
    );

    expect(teacherSummary).toHaveTextContent(/Mariana Beltran/i);
    expect(teacherSummary).toHaveTextContent(/CC 80124590/i);
    expect(teacherSummary).toHaveTextContent(/Registro del docente/i);
  });

  it('no cambia el estado del docente hasta confirmar la advertencia', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityTeachers]);

    const teacherRow = screen.getByText(/Andres Villamizar/i).closest('tr');
    expect(teacherRow).not.toBeNull();

    const deactivateButton = within(teacherRow!).getByRole('button', {
      name: /^inactivar$/i,
    });
    await user.dblClick(deactivateButton);

    expect(
      screen.getByRole('heading', {
        name: /quieres inactivar este docente/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(teacherRow!).getByRole('button', { name: /^inactivar$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /no, cancelar/i }));

    expect(
      screen.queryByRole('heading', {
        name: /quieres inactivar este docente/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(teacherRow!).getByRole('button', { name: /^inactivar$/i }),
    ).toBeInTheDocument();
  });

  it('muestra el formulario de registrar docente con textos corregidos', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityRegisterTeacher]);

    expect(
      screen.getByRole('heading', { name: /registrar docente/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        /completa el formulario para registrar un nuevo docente dentro de la universidad/i,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/n[uú]mero de documento/i)).toHaveAttribute(
      'placeholder',
      'Ingresa el número de documento',
    );

    const documentInput = screen.getByLabelText(/n[uú]mero de documento/i);
    await user.type(documentInput, '80a-11b222');
    expect(documentInput).toHaveValue('8011222');
    await user.clear(documentInput);

    await user.click(
      screen.getByRole('button', { name: /registrar docente/i }),
    );

    expect(
      await screen.findByText(/el número de documento es obligatorio/i),
    ).toBeInTheDocument();
  });

  it('la carga masiva de estudiantes y docentes crea los registros mock esperados', async () => {
    const user = userEvent.setup();
    const studentWorkbook = createWorkbookFile('lote-estudiantes.xlsx', [
      [
        'nombres',
        'apellidos',
        'tipo_documento',
        'numero_documento',
        'correo',
        'celular',
        'semestre',
      ],
      [
        'Juliana',
        'Marin',
        'CC',
        '1032456789',
        'juliana.marin@clinicadelnorte.edu.co',
        '3002223344',
        7,
      ],
    ]);
    const teacherWorkbook = createWorkbookFile('lote-docentes.xlsx', [
      ['nombres', 'apellidos', 'tipo_documento', 'numero_documento'],
      ['Patricia', 'Mendoza', 'CC', '80111222'],
    ]);

    renderUniversityApp([ROUTES.universityBulkUpload]);

    expect(
      screen.getByRole('heading', { name: /plantilla base/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /subir archivo/i }),
    ).toBeInTheDocument();

    const input = document.getElementById(
      'bulk-upload-input',
    ) as HTMLInputElement;
    await user.upload(input, studentWorkbook);
    await screen.findByText(/lote-estudiantes\.xlsx/i);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /validar archivo/i }),
      ).not.toBeDisabled();
    });
    await user.click(screen.getByRole('button', { name: /validar archivo/i }));
    expect(
      await screen.findByText(/la validación fue exitosa\./i, undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\(1 filas listas para procesar\)/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /procesar carga/i }));

    expect(
      await screen.findAllByText(
        /se agregaron 2 estudiantes y 2 credenciales/i,
      ),
    ).not.toHaveLength(0);
    await user.click(screen.getByRole('link', { name: /^Estudiantes$/i }));
    expect(screen.getByText(/Sara Montoya/i)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /carga masiva/i }));
    await user.click(screen.getByRole('button', { name: /^Docentes/i }));

    const secondInput = document.getElementById(
      'bulk-upload-input',
    ) as HTMLInputElement;
    await user.upload(secondInput, teacherWorkbook);
    await screen.findByText(/lote-docentes\.xlsx/i);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /validar archivo/i }),
      ).not.toBeDisabled();
    });
    await user.click(screen.getByRole('button', { name: /validar archivo/i }));
    expect(
      await screen.findByText(/la validación fue exitosa\./i, undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\(1 filas listas para procesar\)/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /procesar carga/i }));

    expect(
      await screen.findAllByText(/se agregaron 2 docentes/i),
    ).not.toHaveLength(0);
    await user.click(screen.getByRole('link', { name: /^Docentes$/i }));
    expect(screen.getByText(/Jorge Parra/i)).toBeInTheDocument();
  }, 15000);

  it('rechaza documentos con letras en la carga masiva', () => {
    const { errors, parsed } = validateStudentRows([
      [
        'Juliana',
        'Marin',
        'CC',
        '10324A6789',
        'juliana.marin@clinicadelnorte.edu.co',
        '3002223344',
        7,
      ],
    ]);

    const teacherResult = validateTeacherRows([
      ['Patricia', 'Mendoza', 'CC', '80A11222'],
    ]);

    expect(parsed).toHaveLength(0);
    expect(errors).toContain(
      'Fila 2, columna "numero_documento": solo se aceptan números.',
    );
    expect(teacherResult.parsed).toHaveLength(0);
    expect(teacherResult.errors).toContain(
      'Fila 2, columna "numero_documento": solo se aceptan números.',
    );
  });

  it('editar el correo en credenciales tambien actualiza al estudiante', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityCredentials]);

    const credentialRow = screen.getByText(/Valentina Rios/i).closest('tr');
    expect(credentialRow).not.toBeNull();

    await user.click(
      within(credentialRow!).getByRole('button', { name: /editar correo/i }),
    );
    const emailInput = within(credentialRow!).getByLabelText(
      /correo electr[oó]nico de valentina rios/i,
    );
    await user.clear(emailInput);
    await user.type(emailInput, 'valentina.actualizada@clinicadelnorte.edu.co');
    await user.click(
      within(credentialRow!).getByRole('button', { name: /guardar correo/i }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      /se actualizo correctamente/i,
    );

    await user.click(screen.getByRole('link', { name: /^Estudiantes$/i }));
    expect(
      screen.getAllByText(/valentina.actualizada@clinicadelnorte.edu.co/i)
        .length,
    ).toBeGreaterThan(0);
  });

  it('permite enviar, reenviar, enviar todas y eliminar sin borrar al estudiante', async () => {
    const user = userEvent.setup();

    renderUniversityApp([ROUTES.universityCredentials]);

    const generatedRow = screen.getByText(/Valentina Rios/i).closest('tr');
    expect(generatedRow).not.toBeNull();
    await user.click(
      within(generatedRow!).getByRole('button', { name: /^Enviar$/i }),
    );
    expect(
      screen.getByRole('heading', { name: /deseas enviar la credencial/i }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /s[i\u00ed], enviar/i }),
    );
    expect(within(generatedRow!).getByText(/^Enviada$/i)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /^Estudiantes$/i }));
    const activatedStudentRow = screen
      .getByText(/Valentina Rios/i)
      .closest('tr');
    expect(activatedStudentRow).not.toBeNull();
    expect(
      within(activatedStudentRow!).getByText(/^Activo$/i),
    ).toBeInTheDocument();
    expect(
      within(activatedStudentRow!).getByRole('button', { name: /inactivar/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Credenciales$/i }));

    const sentRow = screen.getByText(/Tomas Herrera/i).closest('tr');
    expect(sentRow).not.toBeNull();
    await user.click(
      within(sentRow!).getByRole('button', { name: /reenviar/i }),
    );
    expect(
      screen.getByRole('heading', { name: /deseas reenviar la credencial/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /la credencial ser[aá] reenviada al correo tomas\.herrera@clinicadelnorte\.edu\.co/i,
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /s[i\u00ed], reenviar/i }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      /se reenv[i\u00ed][o\u00f3] correctamente/i,
    );

    await user.click(
      screen.getAllByRole('button', { name: /enviar todas/i })[0]!,
    );
    expect(screen.queryByText(/^Generada$/i)).not.toBeInTheDocument();

    const removableRow = screen.getByText(/Camila Vega/i).closest('tr');
    expect(removableRow).not.toBeNull();
    await user.click(
      within(removableRow!).getByRole('button', { name: /eliminar/i }),
    );
    expect(
      screen.getByRole('heading', { name: /quieres eliminar esta credencial/i }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /s[i\u00ed], eliminar/i }),
    );
    expect(
      within(screen.getByRole('table')).queryByText(/Camila Vega/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /^Estudiantes$/i }));
    expect(screen.getByText(/Camila Vega/i)).toBeInTheDocument();
  });
});
