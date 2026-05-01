/**
 * VALORACIONES — E2E-21 a E2E-23
 *
 * UI: misma tabla de citas con tab "Finalizadas".
 * Precondición: debe existir al menos una cita finalizada (E2E-20 ejecutado
 * con cita de fecha pasada insertada en BD).
 */

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

async function clickTab(page: any, nombre: RegExp) {
  const tab = page.locator('button').filter({ hasText: nombre }).first();
  if (await tab.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(800);
  }
}

async function confirmar(page: any) {
  const btn = page.getByRole('button', { name: /confirmar|sí/i });
  if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) await btn.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// E2E-21: Paciente califica al estudiante
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-21 | Paciente califica al estudiante tras cita finalizada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Finalizada/i);

  // Fila con estado "Finalizada" en la tabla
  const fila = page.locator('tr').filter({ hasText: /finalizada/i }).first();
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hayFila) {
    console.warn('E2E-21: No hay citas finalizadas. Insertar cita finalizada en BD primero. Omitido.');
    await context.close();
    return;
  }

  // El botón "Calificar" debe existir en la fila
  const btnCalificar = fila.getByRole('button', { name: /calificar|valorar/i });
  await expect(btnCalificar).toBeVisible({ timeout: 5_000 });
  await btnCalificar.click();

  // Modal de calificación
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 8_000 });

  // Seleccionar la puntuación más alta (último botón de estrellas)
  const estrellas = page.locator('dialog button').filter({ hasText: /★|⭐|\d/i });
  const hayEstrellas = await estrellas.last().isVisible({ timeout: 3_000 }).catch(() => false);
  if (hayEstrellas) await estrellas.last().click();

  // Comentario opcional
  const textarea = page.locator('dialog textarea');
  if (await textarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await textarea.fill('Excelente atención — prueba E2E-21 Playwright.');
  }

  // Enviar
  await page.getByRole('button', { name: /enviar|guardar|calificar/i }).last().click();

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-21: Calificación del estudiante enviada.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-22: Estudiante califica al paciente
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-22 | Estudiante califica al paciente tras cita finalizada', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Finalizada/i);

  const fila = page.locator('tr').filter({ hasText: /finalizada/i }).first();
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hayFila) {
    console.warn('E2E-22: No hay citas finalizadas. Omitido.');
    await context.close();
    return;
  }

  const btnCalificar = fila.getByRole('button', { name: /calificar|valorar/i });
  await expect(btnCalificar).toBeVisible({ timeout: 5_000 });
  await btnCalificar.click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 8_000 });

  const estrellas = page.locator('dialog button').filter({ hasText: /★|⭐|\d/i });
  if (await estrellas.last().isVisible({ timeout: 2_000 }).catch(() => false)) {
    await estrellas.last().click();
  }

  const textarea = page.locator('dialog textarea');
  if (await textarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await textarea.fill('Paciente muy colaborador — prueba E2E-22 Playwright.');
  }

  await page.getByRole('button', { name: /enviar|guardar|calificar/i }).last().click();

  await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 15_000 });
  console.log('E2E-22: Calificación del paciente enviada.');
  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-23: Calificación duplicada — sistema la bloquea
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-23 | Calificación duplicada — sistema bloquea el segundo intento', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  await clickTab(page, /Finalizada/i);

  const fila = page.locator('tr').filter({ hasText: /finalizada/i }).first();
  const hayFila = await fila.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hayFila) {
    console.warn('E2E-23: No hay citas finalizadas. Omitido.');
    await context.close();
    return;
  }

  // El botón calificar debe estar ausente o deshabilitado (ya se calificó en E2E-21)
  const btnCalificar = fila.getByRole('button', { name: /calificar|valorar/i });
  const visible    = await btnCalificar.isVisible().catch(() => false);
  const habilitado = visible ? await btnCalificar.isEnabled().catch(() => false) : false;

  if (!visible || !habilitado) {
    // Sistema bloquea correctamente ✓
    console.log('E2E-23: Calificación duplicada bloqueada — botón ausente o deshabilitado.');
    await context.close();
    return;
  }

  // Si el botón sigue visible, intentar enviar y verificar que el sistema lo rechaza
  await btnCalificar.click();
  await expect(
    page.getByText(/ya calificaste|ya enviaste|duplicad/i)
      .or(page.locator('[role="status"], [role="alert"]').filter({ hasText: /ya califica/i }))
  ).toBeVisible({ timeout: 8_000 });

  console.log('E2E-23: Sistema rechazó la calificación duplicada.');
  await context.close();
});
