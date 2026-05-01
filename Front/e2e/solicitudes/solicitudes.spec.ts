/**
 * BÚSQUEDA Y SOLICITUDES — E2E-06 a E2E-10
 *
 * NOTA DE ESTADO:
 * Los tests E2E-07 a E2E-10 son secuenciales: E2E-07 crea la solicitud que
 * los siguientes consumen. Si la BD ya tiene una solicitud previa entre estos
 * usuarios (de una ejecución anterior), el sistema lo detecta y cada test se
 * adapta al estado real encontrado.
 */

import { test, expect, type Page } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

const ESTUDIANTE_PRUEBA = /sebasti.n d.az romero/i;
const PACIENTE_PRUEBA = /fernanda/i;
const BUSQUEDA_ESTUDIANTE_PRUEBA = 'Sebasti';
const MOTIVO_SOLICITUD_PRUEBA = 'Solicitud de prueba automatizada E2E-07 - Playwright.';

async function buscarEstudianteDePrueba(page: Page) {
  const searchInput = page.locator('#patient-student-search');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(BUSQUEDA_ESTUDIANTE_PRUEBA);

  const filaEstudiante = page.locator('tbody tr').filter({ hasText: ESTUDIANTE_PRUEBA }).first();
  await expect(filaEstudiante).toBeVisible({ timeout: 15_000 });

  return filaEstudiante;
}

async function buscarSolicitudDelPaciente(page: Page) {
  const searchInput = page.locator('input[type="search"]').first();
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill('Fernanda');
  }

  const filasSolicitud = page.locator('[data-testid^="student-request-row-"]');
  const filaPorMotivo = filasSolicitud
    .filter({ hasText: MOTIVO_SOLICITUD_PRUEBA })
    .first();
  const filaSolicitud = (await filaPorMotivo.isVisible({ timeout: 3_000 }).catch(() => false))
    ? filaPorMotivo
    : filasSolicitud.filter({ hasText: PACIENTE_PRUEBA }).first();

  await expect(filaSolicitud).toBeVisible({ timeout: 15_000 });

  return filaSolicitud;
}

// ─────────────────────────────────────────────────────────────────────────────
// E2E-06: Paciente busca estudiantes disponibles
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-06 | Paciente busca estudiantes disponibles', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteBuscar);
  await page.waitForLoadState('networkidle');

  // Heading principal de la página
  await expect(page.getByRole('heading', { name: 'Buscar estudiantes', exact: true }))
    .toBeVisible({ timeout: 15_000 });

  // Debe mostrar al menos un estudiante con el botón "Ver perfil"
  await expect(page.getByRole('button', { name: 'Ver perfil' }).first())
    .toBeVisible({ timeout: 10_000 });

  // Los filtros (combos de Tratamiento, Ciudad, Localidad, Universidad) deben existir
  await expect(page.getByRole('combobox').first()).toBeVisible();

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-07: Paciente envía solicitud — o el sistema bloquea si ya existe una
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-07 | Paciente envía solicitud (o sistema bloquea duplicada)', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteBuscar);
  await page.waitForLoadState('networkidle');

  // Abrir perfil del estudiante de prueba.
  const filaEst = await buscarEstudianteDePrueba(page);
  const btnVerPerfil = filaEst.getByRole('button', { name: 'Ver perfil' });

  await expect(btnVerPerfil).toBeVisible({ timeout: 10_000 });
  await btnVerPerfil.click();

  // El modal del perfil debe abrirse
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

  // CASO A: ya existe una solicitud con este estudiante
  const msgExiste = page.getByText(/ya tienes una solicitud/i);
  if (await msgExiste.isVisible({ timeout: 4_000 }).catch(() => false)) {
    // El sistema bloquea correctamente la solicitud duplicada ✓
    await expect(msgExiste).toBeVisible();
    console.log('E2E-07: Solicitud duplicada bloqueada correctamente por el sistema.');
    await context.close();
    return;
  }

  // CASO B: no existe solicitud → llenar formulario y enviar
  await expect(page.getByText('Motivo de la solicitud')).toBeVisible({ timeout: 8_000 });

  const campoMotivo = page
    .getByPlaceholder(/solicitar atencion|motivo/i)
    .or(page.locator('dialog textarea'));
  await campoMotivo.fill(MOTIVO_SOLICITUD_PRUEBA);

  const solicitudResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/patient-portal/requests') &&
    response.request().method() === 'POST',
  );

  await page.getByRole('button', { name: 'Enviar solicitud' }).click();

  const solicitudResponse = await solicitudResponsePromise;
  expect(
    solicitudResponse.ok(),
    `El API no creo la solicitud. Status HTTP: ${solicitudResponse.status()}`,
  ).toBeTruthy();

  const solicitudCreada = await solicitudResponse.json().catch(() => null);
  expect(solicitudCreada?.status).toBe('PENDIENTE');

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-07: Solicitud enviada exitosamente.');

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-08: Estudiante visualiza solicitudes (cualquier estado)
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-08 | Estudiante visualiza solicitudes recibidas', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  // Heading de la página
  await expect(page.getByRole('heading', { name: 'Solicitudes', exact: true }))
    .toBeVisible({ timeout: 15_000 });

  // El contador de pendientes siempre está visible (puede ser 0)
  await expect(page.getByText(/Solicitudes pendientes/i)).toBeVisible({ timeout: 8_000 });

  const filaSolicitud = await buscarSolicitudDelPaciente(page);

  // La tabla debe mostrar encabezados de columna (DOM: "Paciente", CSS: ALL CAPS)
  await expect(page.getByRole('columnheader', { name: 'Paciente' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible({ timeout: 8_000 });

  await expect(filaSolicitud.getByText(/Pendiente|Aceptada/i).first()).toBeVisible();
  console.log('E2E-08: El estudiante ve la solicitud del paciente de prueba.');

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-09: Estudiante acepta solicitud pendiente (si existe)
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-09 | Estudiante acepta solicitud pendiente', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  const filaSolicitud = await buscarSolicitudDelPaciente(page);
  const yaAceptada = await filaSolicitud
    .getByText(/Aceptada/i)
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (yaAceptada) {
    console.log('E2E-09: La solicitud del paciente de prueba ya estaba aceptada.');
    await context.close();
    return;
  }

  const btnAceptar = filaSolicitud.getByRole('button', { name: /aceptar/i });
  await expect(btnAceptar).toBeVisible({ timeout: 8_000 });
  await btnAceptar.click();

  const btnConfirmar = page.getByRole('button', { name: /confirmar|sí/i });
  if (await btnConfirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await btnConfirmar.click();
  }

  await expect(filaSolicitud.getByText(/Aceptada/i).first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-09: Solicitud aceptada correctamente.');

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-10: Estudiante rechaza solicitud pendiente (si existe)
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-10 | Estudiante rechaza solicitud pendiente', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  const btnRechazar = page.getByRole('button', { name: /rechazar/i }).first();
  const hayPendiente = await btnRechazar.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hayPendiente) {
    console.warn('E2E-10: No hay solicitudes pendientes para rechazar. Test omitido.');
    await context.close();
    return;
  }

  await btnRechazar.click();

  const btnConfirmar = page.getByRole('button', { name: /confirmar|sí/i });
  if (await btnConfirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await btnConfirmar.click();
  }

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-10: Solicitud rechazada correctamente.');

  await context.close();
});
