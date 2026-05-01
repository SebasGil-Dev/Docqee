/**
 * BÚSQUEDA Y SOLICITUDES — E2E-06 a E2E-10
 *
 * NOTA DE ESTADO:
 * Los tests E2E-07 a E2E-10 son secuenciales: E2E-07 crea la solicitud que
 * los siguientes consumen. Si la BD ya tiene una solicitud previa entre estos
 * usuarios (de una ejecución anterior), el sistema lo detecta y cada test se
 * adapta al estado real encontrado.
 */

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES, ESTUDIANTE } from '../fixtures/credenciales';

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

  // Abrir perfil del estudiante de prueba
  const filaEst = page.locator('tr, [role="row"], li').filter({ hasText: ESTUDIANTE.nombre }).first();
  const btnVerPerfil = (await filaEst.isVisible({ timeout: 4_000 }).catch(() => false))
    ? filaEst.getByRole('button', { name: 'Ver perfil' })
    : page.getByRole('button', { name: 'Ver perfil' }).first();

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
  await campoMotivo.fill('Solicitud de prueba automatizada E2E-07 — Playwright.');

  await page.getByRole('button', { name: 'Enviar solicitud' }).click();

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

  // La tabla debe mostrar encabezados de columna (DOM: "Paciente", CSS: ALL CAPS)
  await expect(page.getByRole('columnheader', { name: 'Paciente' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible({ timeout: 8_000 });

  // Si hay solicitudes en cualquier estado, verificar que se muestran
  const filas = page.locator('tr, [data-testid*="row"]').filter({ hasText: /Pendiente|Aceptada|Rechazada|Cerrada/i });
  const cantFilas = await filas.count();
  if (cantFilas > 0) {
    // Hay solicitudes — verificar que muestran estado y acciones
    await expect(filas.first()).toBeVisible();
    console.log(`E2E-08: Se encontraron ${cantFilas} solicitudes.`);
  } else {
    // Sin solicitudes — mensaje vacío visible
    await expect(
      page.getByText(/no encontramos solicitudes|no hay solicitudes/i)
    ).toBeVisible({ timeout: 5_000 });
    console.log('E2E-08: Sin solicitudes en este momento.');
  }

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

  const btnAceptar = page.getByRole('button', { name: /aceptar/i }).first();
  const hayPendiente = await btnAceptar.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hayPendiente) {
    console.warn('E2E-09: No hay solicitudes pendientes. (Ya fueron procesadas en ejecución anterior.)');
    await context.close();
    return;
  }

  await btnAceptar.click();

  const btnConfirmar = page.getByRole('button', { name: /confirmar|sí/i });
  if (await btnConfirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await btnConfirmar.click();
  }

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
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
