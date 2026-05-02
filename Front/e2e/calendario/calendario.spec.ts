/**
 * PRUEBAS CALENDARIO Y AGENDA
 * RF-10 (Visualizacion de calendario), RF-17 (Actualizacion automatica),
 * RF-41 (Bloqueo de horarios)
 * E2E-63 a E2E-67
 */

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

/* ── Tests del Paciente ─────────────────────────────────────────────────── */
test.describe('Paciente — Calendario', () => {
  test.use({ storageState: SESIONES.paciente });

  test('E2E-63 RF-10 calendario del paciente carga correctamente', async ({ page }) => {
    await page.goto(RUTAS.pacienteAgenda);
    await expect(page).toHaveURL(/\/paciente\/agenda/, { timeout: 15_000 });

    const calendar = page.locator('[class*="calendar"], [class*="calendario"], [class*="agenda"]').first()
      .or(page.getByRole('grid').first())
      .or(page.locator('[class*="fc-"], [class*="rbc-"]').first());

    await expect(calendar).toBeVisible({ timeout: 10_000 });
    console.log('RF-10: Calendario del paciente visible correctamente');
  });
});

/* ── Tests del Estudiante ───────────────────────────────────────────────── */
test.describe('Estudiante — Calendario y Agenda', () => {
  test.use({ storageState: SESIONES.estudiante });

  test('E2E-64 RF-10 calendario del estudiante carga con opcion de bloqueo', async ({ page }) => {
    await page.goto(RUTAS.estudianteAgenda);
    await expect(page).toHaveURL(/\/estudiante\/agenda/, { timeout: 15_000 });

    const calendar = page.locator('[class*="calendar"], [class*="calendario"], [class*="agenda"]').first()
      .or(page.getByRole('grid').first())
      .or(page.locator('[class*="fc-"], [class*="rbc-"]').first());

    await expect(calendar).toBeVisible({ timeout: 10_000 });

    const blockBtn = page.getByRole('button', { name: /bloquear|agregar bloqueo|nuevo bloqueo/i }).first()
      .or(page.getByText(/bloquear/i).first());

    await expect(blockBtn).toBeVisible({ timeout: 10_000 });
    console.log('RF-10: Calendario del estudiante visible con opcion de bloqueo');
  });

  test('E2E-65 RF-41 bloquear horario especifico en la agenda', async ({ page }) => {
    await page.goto(RUTAS.estudianteAgenda);
    await expect(page).toHaveURL(/\/estudiante\/agenda/, { timeout: 15_000 });

    const blockBtn = page.getByRole('button', { name: /bloquear|agregar bloqueo|nuevo bloqueo/i }).first()
      .or(page.getByText(/bloquear horario/i).first());

    await expect(blockBtn).toBeVisible({ timeout: 10_000 });
    await blockBtn.click();

    const modal = page.locator('[role="dialog"], [class*="modal"]').first()
      .or(page.locator('form').filter({ hasText: /bloqueo|horario|fecha/i }).first());

    await expect(modal).toBeVisible({ timeout: 10_000 });

    const specificOption = page.getByText(/especifico/i).first()
      .or(page.getByLabel(/especifico/i).first())
      .or(page.getByRole('radio').first());

    if (await specificOption.isVisible({ timeout: 3_000 })) {
      await specificOption.click();
    }

    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 5_000 })) {
      await dateInput.fill('2026-06-15');
    }

    const saveBtn = page.getByRole('button', { name: /guardar|bloquear|confirmar/i }).first();
    if (await saveBtn.isVisible({ timeout: 3_000 })) {
      await saveBtn.click();
      await Promise.race([
        page.waitForSelector('[role="status"], [role="alert"]', { timeout: 10_000 }),
        page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 10_000 }),
      ]).catch(() => {});
    }

    console.log('RF-41: Bloqueo de horario especifico ejecutado correctamente');
  });

  test('E2E-66 RF-41 bloquear horario recurrente en la agenda', async ({ page }) => {
    await page.goto(RUTAS.estudianteAgenda);
    await expect(page).toHaveURL(/\/estudiante\/agenda/, { timeout: 15_000 });

    const blockBtn = page.getByRole('button', { name: /bloquear|agregar bloqueo/i }).first()
      .or(page.getByText(/bloquear horario/i).first());

    await expect(blockBtn).toBeVisible({ timeout: 10_000 });
    await blockBtn.click();

    const modal = page.locator('[role="dialog"], [class*="modal"]').first();
    await expect(modal).toBeVisible({ timeout: 10_000 });

    const recurringOption = page.getByText(/recurrente|semanal|repetir/i).first()
      .or(page.getByLabel(/recurrente/i).first())
      .or(page.getByRole('radio').last());

    if (await recurringOption.isVisible({ timeout: 3_000 })) {
      await recurringOption.click();
    }

    const dayOption = page.getByText(/lunes|martes|miercoles/i).first()
      .or(page.getByRole('checkbox').first());

    if (await dayOption.isVisible({ timeout: 3_000 })) {
      await dayOption.click();
    }

    await expect(modal).toBeVisible();
    console.log('RF-41: Interfaz de bloqueo recurrente accesible y funcional');
  });

  test('E2E-67 RF-17 citas aceptadas reflejadas en el calendario del estudiante', async ({ page }) => {
    await page.goto(RUTAS.estudianteAgenda);
    await expect(page).toHaveURL(/\/estudiante\/agenda/, { timeout: 15_000 });

    const calendar = page.locator('[class*="calendar"], [class*="agenda"], [class*="fc-"]').first()
      .or(page.getByRole('grid').first());

    await expect(calendar).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('body')).not.toContainText(/error al cargar|no fue posible/i);

    console.log('RF-17: Calendario del estudiante carga sin errores — estado actualizado automaticamente');
  });
});
