/**
 * AUTENTICACIÓN Y SESIÓN — E2E-01 a E2E-05
 */

import { test, expect } from '@playwright/test';
import { PACIENTE, ESTUDIANTE, RUTAS } from '../fixtures/credenciales';

// ─── Helpers locales ──────────────────────────────────────────────────────────

async function llenarLogin(page: any, correo: string, contrasena: string) {
  await page.getByPlaceholder('nombre@gmail.com').fill(correo);
  await page.getByPlaceholder('••••••••').fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

async function irAlLogin(page: any) {
  await page.goto(RUTAS.login);
  await expect(page.getByText('Bienvenido')).toBeVisible({ timeout: 15_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// E2E-01: Login válido — Paciente
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-01 | Login válido — Paciente redirige a su dashboard', async ({ page }) => {
  await irAlLogin(page);
  await llenarLogin(page, PACIENTE.correo, PACIENTE.contrasena);

  // El paciente puede aterrizar en /paciente/inicio o /paciente/buscar-estudiantes
  await page.waitForURL('**/paciente/**', { timeout: 20_000 });
  await expect(page.url()).toContain('/paciente/');
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-02: Login válido — Estudiante
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-02 | Login válido — Estudiante redirige a su dashboard', async ({ page }) => {
  await irAlLogin(page);
  await llenarLogin(page, ESTUDIANTE.correo, ESTUDIANTE.contrasena);

  await page.waitForURL(`**${RUTAS.estudianteInicio}`, { timeout: 20_000 });
  await expect(page).toHaveURL(new RegExp(RUTAS.estudianteInicio));
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-03: Login con credenciales inválidas
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-03 | Login inválido — muestra error y no redirige', async ({ page }) => {
  await irAlLogin(page);
  await llenarLogin(page, 'usuarioinexistente@test.com', 'ClaveIncorrecta99!');

  // Debe quedarse en /login
  await page.waitForTimeout(3_000);
  await expect(page).toHaveURL(new RegExp(RUTAS.login));

  // Debe aparecer un mensaje de error
  const error = page
    .locator('[role="alert"]')
    .or(page.getByText(/contraseña|credencial|incorrecta|inválid|no encontrad/i))
    .or(page.locator('.error, .text-red, [class*="error"]'));
  await expect(error.first()).toBeVisible({ timeout: 8_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-04: Ruta protegida sin sesión → redirige al login
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-04 | Ruta protegida sin sesión — redirige al login', async ({ page }) => {
  await page.goto(RUTAS.pacienteInicio);
  await page.waitForURL(url =>
    url.pathname.includes('/login') || url.pathname === '/',
    { timeout: 15_000 }
  );
  const url = page.url();
  expect(url.includes('/login') || url.endsWith('/')).toBe(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-05: Cierre de sesión
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-05 | Cierre de sesión — bloquea acceso posterior a rutas protegidas', async ({ page }) => {
  // 1. Iniciar sesión
  await irAlLogin(page);
  await llenarLogin(page, PACIENTE.correo, PACIENTE.contrasena);
  await page.waitForURL('**/paciente/**', { timeout: 20_000 });

  // 2. Cerrar sesión — el botón "Cerrar sesion" está en la barra lateral
  const btnLogout = page.getByText('Cerrar sesion');
  await expect(btnLogout).toBeVisible({ timeout: 10_000 });
  await btnLogout.click();

  // 3. Debe salir de la sesión
  await page.waitForURL(url =>
    url.pathname.includes('/login') || url.pathname === '/',
    { timeout: 15_000 }
  );

  // 4. Intentar volver a ruta protegida — debe bloquear
  await page.goto(RUTAS.pacienteInicio);
  await page.waitForURL(url =>
    url.pathname.includes('/login') || url.pathname === '/',
    { timeout: 15_000 }
  );
  const urlFinal = page.url();
  expect(urlFinal.includes('/login') || urlFinal.endsWith('/')).toBe(true);
});
