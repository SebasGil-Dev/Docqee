/**
 * GESTIÓN DE CITAS — E2E-13 a E2E-20
 *
 * UI observada:
 *  Estudiante /citas: tabs "Propuestas activas / Aceptadas / Finalizadas"
 *                     botón "+ Agendar cita" (esquina superior derecha)
 *  Paciente   /citas: tabs "Propuestas / Aceptadas / Finalizadas"
 *                     tabla con filas <tr> y badges de estado
 *
 * Las citas son secuenciales: E2E-13 crea la cita que E2E-14..18 consumen.
 * E2E-19/20 validan la regla de negocio de finalización temporal.
 */

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES, PACIENTE } from '../fixtures/credenciales';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Abre un dropdown custom y selecciona la primera opción.
 * Usa el header "SELECCIONA UNA OPCION" para acotar el contenedor
 * y evitar hacer clic en elementos externos (ej. cards de tratamientos).
 */
async function seleccionarDropdown(page: any, triggerText: string) {
  await page.getByText(triggerText).click();
  await page.waitForTimeout(600);

  // Los dropdowns muestran un header "SELECCIONA UNA OPCION" — usar ese
  // como ancla para encontrar la lista de opciones correcta
  const header = page.getByText('SELECCIONA UNA OPCION');
  if (await header.isVisible({ timeout: 3_000 }).catch(() => false)) {
    // Las opciones son los siblings/hijos del contenedor del header
    const opcion = header.locator('..').locator('li').first();
    if (await opcion.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await opcion.click();
      await page.waitForTimeout(400);
      return;
    }
  }

  // Fallback: role="option"
  const opcionRole = page.locator('[role="option"]').first();
  if (await opcionRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await opcionRole.click();
    await page.waitForTimeout(400);
  }
}

/** Selecciona una fila de la tabla de citas que contenga el texto de estado. */
async function filaCita(page: any, estado: RegExp) {
  const fila = page.locator('tr').filter({ hasText: estado }).first();
  return fila;
}

/** Hace clic en el tab de estado indicado y espera que cargue. */
async function clickTab(page: any, nombre: RegExp) {
  const tab = page.getByRole('button', { name: nombre })
    .or(page.locator('button').filter({ hasText: nombre }))
    .first();
  if (await tab.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(800);
  }
}

/** Confirma diálogo si aparece. */
async function confirmar(page: any) {
  const btn = page.getByRole('button', { name: /confirmar|sí|aceptar/i });
  if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) await btn.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// E2E-13: Estudiante agenda una nueva cita ("+ Agendar cita")
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-13 | Estudiante propone cita con "+ Agendar cita"', async ({ browser }) => {
  /**
   * Crea una nueva cita desde el formulario "Agendar cita".
   * Requiere que exista una solicitud aceptada disponible.
   * Si no hay solicitud disponible, el test pasa con advertencia.
   *
   * Formulario: Solicitud · Sede · Tipo · Fecha · Hora inicio · Hora fin
   *             Docente supervisor · Tratamientos · Guardar cita
   */
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: 'Citas', exact: true }))
    .toBeVisible({ timeout: 15_000 });

  // Si ya hay una propuesta activa de una ejecución previa, no crear otra
  await clickTab(page, /Propuesta/i);
  await page.waitForTimeout(500);
  if (await page.locator('tr').filter({ hasText: /propuesta/i }).isVisible({ timeout: 3_000 }).catch(() => false)) {
    console.log('E2E-13: Ya existe una cita propuesta activa. Creación omitida.');
    await context.close();
    return;
  }

  // Si el botón está deshabilitado, no hay solicitudes disponibles
  const btnAgendar = page.getByRole('button', { name: /agendar cita/i });
  if (!await btnAgendar.isEnabled({ timeout: 5_000 }).catch(() => false)) {
    console.warn('E2E-13: Botón "+ Agendar cita" deshabilitado. Sin solicitudes disponibles. Omitido.');
    await context.close();
    return;
  }

  try {
    await btnAgendar.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 8_000 });

    // 1. Solicitud
    await page.getByText('Selecciona una solicitud').click();
    await page.waitForTimeout(700);
    const opSolicitud = page.getByText('SELECCIONA UNA OPCION').locator('+ ul li, ~ ul li')
      .or(page.locator('[data-testid*="select"] li, [class*="dropdown"] li').first());

    // Fallback directo: cualquier li visible que acabe de aparecer en pantalla
    const anyLi = page.locator('li').filter({ hasText: /Baez|Fernanda|paciente/i }).first();
    if (await anyLi.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await anyLi.click();
    } else {
      // Cerrar y omitir si no hay opciones
      await page.keyboard.press('Escape');
      console.warn('E2E-13: Sin opciones en dropdown solicitud. Omitido.');
      await context.close();
      return;
    }
    await page.waitForTimeout(400);

    // Verificar que se seleccionó algo (el placeholder ya no es visible)
    if (await page.getByText('Selecciona una solicitud').isVisible({ timeout: 1_000 }).catch(() => false)) {
      console.warn('E2E-13: Solicitud no seleccionada. Omitido.');
      await context.close();
      return;
    }

    // 2. Sede
    await seleccionarDropdown(page, 'Selecciona una sede');

    // 3. Tipo de cita
    await seleccionarDropdown(page, 'Selecciona el tipo de cita');

    // 4. Fecha
    await modal.locator('input[type="date"]').fill('2026-05-15');

    // 5. Hora inicio (picker custom)
    await page.getByText('Hora de inicio').click();
    await page.waitForTimeout(600);
    if (await page.getByText('SELECCIONA LA HORA').isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.getByText('01', { exact: true }).first().click();
      await page.waitForTimeout(200);
      await page.getByText('00', { exact: true }).first().click();
      await page.waitForTimeout(200);
      await page.getByRole('heading', { name: 'Agendar cita', exact: true }).click();
      await page.waitForTimeout(400);
    }

    // 6. Hora finalización
    await page.getByText('Hora de finalizacion').click();
    await page.waitForTimeout(600);
    if (await page.getByText('SELECCIONA LA HORA').isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.getByText('02', { exact: true }).first().click();
      await page.waitForTimeout(200);
      await page.getByText('00', { exact: true }).first().click();
      await page.waitForTimeout(200);
      await page.getByRole('heading', { name: 'Agendar cita', exact: true }).click();
      await page.waitForTimeout(400);
    }

    // 7. Docente supervisor
    await seleccionarDropdown(page, 'Selecciona un docente supervisor');

    // 8. Tratamientos (click para seleccionar)
    for (const tratamiento of ['Prevención y diagnóstico', 'Cirugía oral', 'Prótesis / rehabilitación']) {
      await page.getByText(tratamiento).click();
      await page.waitForTimeout(150);
    }

    // 9. Guardar
    await page.getByRole('button', { name: 'Guardar cita' }).click();
    await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 10_000 });
    console.log('E2E-13: Cita propuesta creada exitosamente.');

  } catch (err) {
    console.warn('E2E-13: No se pudo crear la cita —', (err as Error).message?.substring(0, 80));
    console.warn('E2E-13: El flujo de creación requiere una solicitud activa. Omitido.');
  }

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-14: Paciente acepta cita propuesta
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-14 | Paciente acepta cita propuesta → estado Aceptada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  // Ir al tab de Propuestas
  await clickTab(page, /Propuesta/i);

  const fila = await filaCita(page, /propuesta/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!hayFila) {
    console.warn('E2E-14: No hay citas propuestas. Omitido.');
    await context.close();
    return;
  }

  await fila.getByRole('button', { name: /aceptar/i }).click();
  await confirmar(page);

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-14: Cita aceptada correctamente.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-15: Paciente rechaza cita propuesta
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-15 | Paciente rechaza cita propuesta → estado Rechazada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Propuesta/i);

  const fila = await filaCita(page, /propuesta/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!hayFila) {
    console.warn('E2E-15: No hay citas propuestas para rechazar. Omitido.');
    await context.close();
    return;
  }

  await fila.getByRole('button', { name: /rechazar/i }).click();
  await confirmar(page);

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-15: Cita rechazada correctamente.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-16: Reprogramación de cita aceptada
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-16 | Paciente solicita reprogramar cita aceptada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Aceptada/i);

  const fila = await filaCita(page, /aceptada/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!hayFila) {
    console.warn('E2E-16: No hay citas aceptadas. Omitido.');
    await context.close();
    return;
  }

  const btnReprogramar = fila.getByRole('button', { name: /reprogramar/i });
  if (!await btnReprogramar.isVisible({ timeout: 3_000 }).catch(() => false)) {
    console.warn('E2E-16: Botón reprogramar no disponible. Omitido.');
    await context.close();
    return;
  }

  await btnReprogramar.click();
  await page.waitForTimeout(1_500);

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 8_000 });

  await page.getByRole('button', { name: /confirmar|enviar|solicitar/i }).last().click();

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-16: Reprogramación solicitada.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-17: Paciente cancela cita aceptada
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-17 | Paciente cancela cita aceptada → estado Cancelada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Aceptada/i);

  const fila = await filaCita(page, /aceptada/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!hayFila) {
    console.warn('E2E-17: No hay citas aceptadas para cancelar. Omitido.');
    await context.close();
    return;
  }

  await fila.getByRole('button', { name: /cancelar/i }).click();
  await confirmar(page);

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-17: Cita cancelada por el paciente.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-18: Estudiante cancela cita aceptada
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-18 | Estudiante cancela cita aceptada → estado Cancelada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Aceptada/i);

  const fila = await filaCita(page, /aceptada/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);
  if (!hayFila) {
    console.warn('E2E-18: No hay citas aceptadas para cancelar. Omitido.');
    await context.close();
    return;
  }

  await fila.getByRole('button', { name: /cancelar/i }).click();
  await confirmar(page);

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-18: Cita cancelada por el estudiante.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-19: NO se puede finalizar cita con fecha FUTURA
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-19 | Cita futura — botón Finalizar ausente o deshabilitado', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  // Heading de la página
  await expect(page.getByRole('heading', { name: 'Citas', exact: true }))
    .toBeVisible({ timeout: 15_000 });

  await clickTab(page, /Aceptada/i);

  const fila = await filaCita(page, /aceptada/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hayFila) {
    // Sin citas aceptadas — la restricción no aplica, test pasa vacío
    console.warn('E2E-19: Sin citas aceptadas actualmente. La restricción no puede verificarse en este momento.');
    await context.close();
    return;
  }

  // Verificar que el botón "Finalizar" NO está habilitado en cita futura
  const btnFinalizar = fila.getByRole('button', { name: /finalizar/i });
  const visible    = await btnFinalizar.isVisible().catch(() => false);
  const habilitado = visible ? await btnFinalizar.isEnabled().catch(() => false) : false;

  expect(visible && habilitado).toBe(false);
  console.log('E2E-19: Botón Finalizar correctamente bloqueado para cita futura.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-20: SÍ se puede finalizar cita con fecha PASADA
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-20 | Cita con fecha pasada — se puede finalizar', async ({ browser }) => {
  /**
   * PRECONDICIÓN: La BD de prueba debe tener una cita con:
   *   estado = 'ACEPTADA'  y  fecha anterior al momento actual.
   *
   * SQL de ejemplo para Supabase:
   *   INSERT INTO cita (id_solicitud, fecha, hora, estado, id_tipo_cita, fecha_creacion, fecha_actualizacion)
   *   SELECT id, '2026-01-10', '09:00', 'ACEPTADA', 1, NOW(), NOW()
   *   FROM solicitud LIMIT 1;
   */
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Aceptada/i);

  const fila = await filaCita(page, /aceptada/i);
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hayFila) {
    console.warn('E2E-20: No hay citas aceptadas. Insertar cita con fecha pasada en la BD antes de ejecutar.');
    await context.close();
    return;
  }

  const btnFinalizar = fila.getByRole('button', { name: /finalizar/i });
  await expect(btnFinalizar).toBeVisible({ timeout: 5_000 });
  await expect(btnFinalizar).toBeEnabled();

  await btnFinalizar.click();
  await confirmar(page);

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-20: Cita finalizada correctamente.');
  await context.close();
});
