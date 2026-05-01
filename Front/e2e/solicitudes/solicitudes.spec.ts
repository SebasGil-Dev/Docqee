/**
 * BUSQUEDA Y SOLICITUDES - E2E-06 a E2E-10
 *
 * Estos tests preparan la relacion principal que usan chat, citas y
 * valoraciones: paciente envia solicitud -> estudiante acepta solicitud.
 * No se rechaza la solicitud principal porque eso rompe los modulos
 * posteriores de la suite ordenada.
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

test('E2E-06 | Paciente busca estudiantes disponibles', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteBuscar);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Buscar estudiantes', exact: true }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Ver perfil' }).first())
    .toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('combobox').first()).toBeVisible();

  await context.close();
});

test('E2E-07 | Paciente envia solicitud', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteBuscar);
  await page.waitForLoadState('networkidle');

  const filaEstudiante = await buscarEstudianteDePrueba(page);
  const btnVerPerfil = filaEstudiante.getByRole('button', { name: 'Ver perfil' });

  await expect(btnVerPerfil).toBeVisible({ timeout: 10_000 });
  await btnVerPerfil.click();

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

  const msgExiste = page.getByText(/ya tienes una solicitud/i);
  if (await msgExiste.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await expect(msgExiste).toBeVisible();
    console.log('E2E-07: El sistema bloqueo una solicitud duplicada activa.');
    await context.close();
    return;
  }

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

  console.log('E2E-07: Solicitud enviada exitosamente.');

  await context.close();
});

test('E2E-08 | Estudiante visualiza solicitudes recibidas', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Solicitudes', exact: true }))
    .toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Solicitudes pendientes/i)).toBeVisible({ timeout: 8_000 });

  const filaSolicitud = await buscarSolicitudDelPaciente(page);

  await expect(page.getByRole('columnheader', { name: 'Paciente' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible({ timeout: 8_000 });
  await expect(filaSolicitud.getByText(/Pendiente|Aceptada/i).first()).toBeVisible();

  console.log('E2E-08: El estudiante ve la solicitud del paciente de prueba.');

  await context.close();
});

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

  const aceptarResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/student-portal/requests/') &&
    response.url().includes('/status') &&
    response.request().method() === 'PATCH',
  );

  await btnAceptar.click();

  const btnConfirmar = page.getByRole('button', { name: /confirmar|aceptar/i });
  if (await btnConfirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await btnConfirmar.click();
  }

  const aceptarResponse = await aceptarResponsePromise;
  expect(
    aceptarResponse.ok(),
    `El API no acepto la solicitud. Status HTTP: ${aceptarResponse.status()}`,
  ).toBeTruthy();

  const solicitudAceptada = await aceptarResponse.json().catch(() => null);
  expect(solicitudAceptada?.status).toBe('ACEPTADA');
  expect(solicitudAceptada?.conversationId).toBeTruthy();

  await expect(filaSolicitud.getByText(/Aceptada/i).first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-09: Solicitud aceptada correctamente.');

  await context.close();
});

test('E2E-10 | Solicitud aceptada queda disponible para el flujo posterior', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  const filaSolicitud = await buscarSolicitudDelPaciente(page);

  await expect(filaSolicitud.getByText(/Aceptada/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(filaSolicitud.getByRole('button', { name: /rechazar/i })).toHaveCount(0);

  await page.getByRole('button', { name: /filtrar solicitudes por estado/i }).click();
  await expect(page.getByRole('menuitemradio', { name: /rechazada/i })).toHaveCount(0);

  console.log('E2E-10: La solicitud aceptada se conserva para chat, citas y valoraciones.');

  await context.close();
});
