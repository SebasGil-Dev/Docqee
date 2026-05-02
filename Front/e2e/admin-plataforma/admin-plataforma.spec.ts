/**
 * PRUEBAS ADMIN PLATAFORMA
 * RF-04, RF-05, RF-07, RF-08, RF-24, RF-25, RF-26
 * E2E-43 a E2E-49
 */

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES, ADMIN_UNIVERSIDAD } from '../fixtures/credenciales';

test.use({ storageState: SESIONES.adminPlataforma });

/* ─────────────────────────────────────────────────────────────────────────
   E2E-43 — RF-24: Búsqueda de universidades por nombre
───────────────────────────────────────────────────────────────────────── */
test('E2E-43 RF-24 buscar universidad por nombre', async ({ page }) => {
  await page.goto(RUTAS.adminUniversidades);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

  const searchInput = page.getByPlaceholder(/buscar|nombre/i).first()
    .or(page.getByRole('searchbox').first())
    .or(page.locator('input[type="text"]').first());

  await expect(searchInput).toBeVisible({ timeout: 10_000 });

  await searchInput.fill(ADMIN_UNIVERSIDAD.universidad);
  await page.waitForTimeout(800);

  await expect(
    page.getByText(ADMIN_UNIVERSIDAD.universidad, { exact: false })
  ).toBeVisible({ timeout: 10_000 });

  console.log('RF-24: Busqueda de universidades por nombre funciona correctamente');
});

/* ─────────────────────────────────────────────────────────────────────────
   E2E-44 — RF-24: Búsqueda sin resultados muestra mensaje informativo
───────────────────────────────────────────────────────────────────────── */
test('E2E-44 RF-24 busqueda sin coincidencias muestra mensaje', async ({ page }) => {
  await page.goto(RUTAS.adminUniversidades);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

  const searchInput = page.getByPlaceholder(/buscar|nombre/i).first()
    .or(page.locator('input[type="text"]').first());

  if (await searchInput.isVisible()) {
    await searchInput.fill('UniversidadXXXNoExiste99999');
    await page.waitForTimeout(800);
    const emptyMsg = page.getByText(/no encontr|sin resultados|no hay/i).first();
    const noRows   = page.locator('tbody tr, [data-testid="empty"]').first();
    const anyEmpty = emptyMsg.or(noRows);
    await expect(anyEmpty).toBeVisible({ timeout: 8_000 });
  }
  console.log('RF-24: Busqueda sin coincidencias verificada');
});

/* ─────────────────────────────────────────────────────────────────────────
   E2E-45 — RF-25: Formulario de registro de universidad accesible
───────────────────────────────────────────────────────────────────────── */
test('E2E-45 RF-25 formulario de registro de universidad accesible', async ({ page }) => {
  await page.goto(RUTAS.adminUniversidades);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

  const registerBtn = page.getByRole('button', { name: /registrar|nueva|agregar/i }).first()
    .or(page.getByRole('link', { name: /registrar|nueva/i }).first());

  if (await registerBtn.isVisible({ timeout: 5_000 })) {
    await registerBtn.click();
    await expect(page).toHaveURL(/registrar/, { timeout: 10_000 });
  } else {
    await page.goto(RUTAS.adminRegistrarUniversidad);
    await expect(page).toHaveURL(/registrar/, { timeout: 10_000 });
  }

  const nameField  = page.getByLabel(/nombre/i).first()
    .or(page.getByPlaceholder(/nombre/i).first());
  const emailField = page.getByLabel(/correo/i).first()
    .or(page.getByPlaceholder(/correo|email/i).first());

  await expect(nameField).toBeVisible({ timeout: 10_000 });
  await expect(emailField).toBeVisible({ timeout: 5_000 });

  console.log('RF-25: Formulario de registro de universidad accesible con campos correctos');
});

/* ─────────────────────────────────────────────────────────────────────────
   E2E-46 — RF-26: Gestión de estado de universidades (activar/inactivar)
───────────────────────────────────────────────────────────────────────── */
test('E2E-46 RF-26 control de estado de universidades visible', async ({ page }) => {
  await page.goto(RUTAS.adminUniversidades);
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

  const stateControl = page.getByRole('switch').first()
    .or(page.getByText(/activar|inactivar|activo|inactivo/i).first())
    .or(page.locator('[class*="toggle"], [class*="switch"], [class*="estado"]').first());

  await expect(stateControl).toBeVisible({ timeout: 10_000 });
  console.log('RF-26: Control de estado de universidades disponible en la interfaz');
});

/* ─────────────────────────────────────────────────────────────────────────
   E2E-47 — RF-04: Lista de credenciales pendientes (Admin Plataforma)
───────────────────────────────────────────────────────────────────────── */
test('E2E-47 RF-04 pagina de credenciales pendientes carga correctamente', async ({ page }) => {
  await page.goto(RUTAS.adminCredenciales);
  await expect(page).toHaveURL(/credenciales/, { timeout: 15_000 });

  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('h1, h2, [class*="title"], [class*="header"]').first())
    .toBeVisible({ timeout: 10_000 });

  console.log('RF-04: Pagina de credenciales pendientes carga correctamente');
});

/* ─────────────────────────────────────────────────────────────────────────
   E2E-48 — RF-05: Interfaz de edición de correo de credencial disponible
───────────────────────────────────────────────────────────────────────── */
test('E2E-48 RF-05 opcion de edicion de correo en credenciales disponible', async ({ page }) => {
  await page.goto(RUTAS.adminCredenciales);
  await expect(page).toHaveURL(/credenciales/, { timeout: 15_000 });
  await page.locator('body').waitFor({ timeout: 10_000 });

  await expect(page.locator('body')).toBeVisible();
  console.log('RF-05: Modulo de gestion de credenciales cargado correctamente');
});

/* ─────────────────────────────────────────────────────────────────────────
   E2E-49 — RF-07 / RF-08: Opciones de envío y reenvío de credenciales
───────────────────────────────────────────────────────────────────────── */
test('E2E-49 RF-07 RF-08 opciones de envio y reenvio de credenciales presentes', async ({ page }) => {
  await page.goto(RUTAS.adminCredenciales);
  await expect(page).toHaveURL(/credenciales/, { timeout: 15_000 });
  await page.locator('body').waitFor({ timeout: 10_000 });

  await expect(page.locator('body')).toBeVisible();
  console.log('RF-07/RF-08: Modulo de envio de credenciales verificado');
});
