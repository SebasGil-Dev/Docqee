/**
 * AUTENTICACION Y SESION - E2E-01 a E2E-05
 */

import { expect, test, type Page } from '@playwright/test';
import { ESTUDIANTE, PACIENTE, RUTAS } from '../fixtures/credenciales';
import { medirAccion } from '../fixtures/metricas';

async function llenarLogin(page: Page, correo: string, contrasena: string) {
  await page.getByPlaceholder('nombre@gmail.com').fill(correo);
  await page.getByPlaceholder('••••••••').fill(contrasena);
}

async function enviarLogin(page: Page) {
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

async function irAlLogin(page: Page) {
  await page.goto(RUTAS.login);
  await expect(page.getByText('Bienvenido')).toBeVisible({ timeout: 15_000 });
}

test('E2E-01 | Login valido - Paciente redirige a su dashboard', async ({
  page,
}) => {
  await irAlLogin(page);
  await llenarLogin(page, PACIENTE.correo, PACIENTE.contrasena);

  await medirAccion('E2E-01', 'login paciente hasta dashboard', async () => {
    await enviarLogin(page);
    await page.waitForURL('**/paciente/**', { timeout: 20_000 });
  });

  await expect(page.url()).toContain('/paciente/');
});

test('E2E-02 | Login valido - Estudiante redirige a su dashboard', async ({
  page,
}) => {
  await irAlLogin(page);
  await llenarLogin(page, ESTUDIANTE.correo, ESTUDIANTE.contrasena);

  await medirAccion('E2E-02', 'login estudiante hasta dashboard', async () => {
    await enviarLogin(page);
    await page.waitForURL(`**${RUTAS.estudianteInicio}`, {
      timeout: 20_000,
    });
  });

  await expect(page).toHaveURL(new RegExp(RUTAS.estudianteInicio));
});

test('E2E-03 | Login invalido - muestra error y no redirige', async ({
  page,
}) => {
  await irAlLogin(page);
  await llenarLogin(page, 'usuarioinexistente@test.com', 'ClaveIncorrecta99!');

  const error = page
    .locator('[role="alert"]')
    .or(page.getByText(/credencial|incorrecta|invalid|no encontrad/i))
    .or(page.locator('.error, .text-red, [class*="error"]'));

  await medirAccion('E2E-03', 'login invalido muestra error', async () => {
    await enviarLogin(page);
    await expect(error.first()).toBeVisible({ timeout: 8_000 });
  });

  await expect(page).toHaveURL(new RegExp(RUTAS.login));
});

test('E2E-04 | Ruta protegida sin sesion - redirige al login', async ({
  page,
}) => {
  await medirAccion('E2E-04', 'ruta protegida redirige', async () => {
    await page.goto(RUTAS.pacienteInicio);
    await page.waitForURL(
      (url) => url.pathname.includes('/login') || url.pathname === '/',
      { timeout: 15_000 },
    );
  });

  const url = page.url();
  expect(url.includes('/login') || url.endsWith('/')).toBe(true);
});

test('E2E-05 | Cierre de sesion - bloquea acceso posterior a rutas protegidas', async ({
  page,
}) => {
  await irAlLogin(page);
  await llenarLogin(page, PACIENTE.correo, PACIENTE.contrasena);
  await enviarLogin(page);
  await page.waitForURL('**/paciente/**', { timeout: 20_000 });

  const btnLogout = page.getByText('Cerrar sesion');
  await expect(btnLogout).toBeVisible({ timeout: 10_000 });

  await medirAccion('E2E-05', 'cerrar sesion redirige', async () => {
    await btnLogout.click();
    await page.waitForURL(
      (url) => url.pathname.includes('/login') || url.pathname === '/',
      { timeout: 15_000 },
    );
  });

  await medirAccion('E2E-05', 'acceso posterior bloqueado', async () => {
    await page.goto(RUTAS.pacienteInicio);
    await page.waitForURL(
      (url) => url.pathname.includes('/login') || url.pathname === '/',
      { timeout: 15_000 },
    );
  });

  const urlFinal = page.url();
  expect(urlFinal.includes('/login') || urlFinal.endsWith('/')).toBe(true);
});
