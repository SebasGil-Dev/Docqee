/**
 * SETUP DE AUTENTICACIÓN — se ejecuta UNA SOLA VEZ antes de toda la suite.
 * Guarda la sesión de Paciente y Estudiante en archivos JSON reutilizables.
 */

import { test as setup, expect } from '@playwright/test';
import { PACIENTE, ESTUDIANTE, RUTAS, SESIONES } from '../fixtures/credenciales';

/* ── Sesión Paciente ─────────────────────────────────────────────────────── */
setup('guardar sesión paciente', async ({ page }) => {
  await page.goto(RUTAS.login);

  // El login muestra "Bienvenido" como heading
  await expect(page.getByText('Bienvenido')).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder('nombre@gmail.com').fill(PACIENTE.correo);
  await page.getByPlaceholder('••••••••').fill(PACIENTE.contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // El paciente puede redirigir a /paciente/inicio o /paciente/buscar-estudiantes
  await page.waitForURL('**/paciente/**', { timeout: 20_000 });

  await page.context().storageState({ path: SESIONES.paciente });
  console.log('✓ Sesión paciente guardada');
});

/* ── Sesión Estudiante ───────────────────────────────────────────────────── */
setup('guardar sesión estudiante', async ({ page }) => {
  await page.goto(RUTAS.login);

  await expect(page.getByText('Bienvenido')).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder('nombre@gmail.com').fill(ESTUDIANTE.correo);
  await page.getByPlaceholder('••••••••').fill(ESTUDIANTE.contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await page.waitForURL(`**${RUTAS.estudianteInicio}`, { timeout: 20_000 });

  await page.context().storageState({ path: SESIONES.estudiante });
  console.log('✓ Sesión estudiante guardada');
});
