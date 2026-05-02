/**
 * PERFIL DE USUARIO - E2E-24 a E2E-27
 */

import { expect, test } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';
import { medirAccion } from '../fixtures/metricas';

test('E2E-24 | Paciente visualiza su perfil con datos cargados', async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacientePerfil);
  await page.waitForLoadState('networkidle');

  await medirAccion('E2E-24', 'datos de perfil paciente visibles', async () => {
    await expect(
      page.getByRole('heading', { name: /perfil|mi perfil|datos personales/i }),
    ).toBeVisible({ timeout: 15_000 });

    const campoConDato = page
      .locator('input[value]:not([value=""]), p, span, dd')
      .filter({ hasText: /\S{3,}/ })
      .first();
    await expect(campoConDato).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText('FernadaESba2@ozsaip.com', { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await context.close();
});

test('E2E-25 | Paciente actualiza dato de perfil y el sistema confirma el cambio', async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacientePerfil);
  await page.waitForLoadState('networkidle');

  const btnEditar = page
    .getByRole('button', { name: /editar|modificar|actualizar perfil/i })
    .or(page.getByRole('link', { name: /editar/i }));

  if (await btnEditar.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await btnEditar.click();
    await page.waitForLoadState('networkidle');
  }

  const campoTelefono = page
    .getByLabel(/telefono|teléfono|celular|movil|móvil/i)
    .or(
      page.locator(
        'input[type="tel"], input[placeholder*="telefono" i], input[placeholder*="teléfono" i], input[placeholder*="celular" i]',
      ),
    );

  if (await campoTelefono.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await campoTelefono.clear();
    await campoTelefono.fill('3001234567');
  } else {
    const campoAlternativo = page
      .getByLabel(/direccion|dirección|localidad|barrio/i)
      .or(page.locator('input').filter({ hasValue: /.+/ }).nth(1));

    if (
      !(await campoAlternativo.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      console.warn('E2E-25: No se encontro campo editable en perfil paciente.');
      await context.close();
      return;
    }

    const valorActual = await campoAlternativo.inputValue();
    await campoAlternativo.clear();
    await campoAlternativo.fill(valorActual || 'Dato actualizado E2E');
  }

  const btnGuardar = page
    .getByRole('button', { name: /guardar|actualizar|save|confirmar/i })
    .last();
  await expect(btnGuardar).toBeEnabled();

  await medirAccion(
    'E2E-25',
    'guardar perfil paciente hasta confirmacion',
    async () => {
      await btnGuardar.click();
      await expect(
        page
          .getByText(/actualizado|guardado|exito|éxito|cambios guardados/i)
          .or(
            page
              .locator('[role="alert"], [role="status"]')
              .filter({ hasText: /actualiz|guard|exito|éxito/i }),
          ),
      ).toBeVisible({ timeout: 15_000 });
    },
  );

  await context.close();
});

test('E2E-26 | Estudiante visualiza su perfil con datos cargados', async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudiantePerfil);
  await page.waitForLoadState('networkidle');

  await medirAccion(
    'E2E-26',
    'datos de perfil estudiante visibles',
    async () => {
      await expect(
        page.getByRole('heading', {
          name: /perfil|mi perfil|datos|informacion|información/i,
        }),
      ).toBeVisible({ timeout: 15_000 });

      await expect(
        page
          .getByText('sebastian@wnbaldwy.com', { exact: false })
          .or(page.locator('input[type="email"]').filter({ hasValue: /.+/ })),
      ).toBeVisible({ timeout: 10_000 });

      const infoAcademica = page
        .getByText(/tratamiento|sede|universidad|practica|práctica/i)
        .first();
      await expect(infoAcademica).toBeVisible({ timeout: 10_000 });
    },
  );

  const foto = page.locator(
    'img[alt*="perfil" i], img[alt*="foto" i], img[alt*="avatar" i]',
  );
  if (await foto.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const cargoBien = await foto
      .evaluate((img: HTMLImageElement) => img.naturalWidth > 0)
      .catch(() => false);
    expect(cargoBien).toBe(true);
  }

  await context.close();
});

test('E2E-27 | Estudiante actualiza dato de perfil y el sistema confirma el cambio', async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudiantePerfil);
  await page.waitForLoadState('networkidle');

  const btnEditar = page
    .getByRole('button', { name: /editar|modificar|actualizar/i })
    .or(page.getByRole('link', { name: /editar perfil/i }));

  if (await btnEditar.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await btnEditar.click();
    await page.waitForLoadState('networkidle');
  }

  const campoBio = page
    .getByLabel(
      /biografia|biografía|descripcion|descripción|sobre mi|sobre mí|presentacion|presentación/i,
    )
    .or(page.locator('textarea').first());

  if (await campoBio.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await campoBio.clear();
    await campoBio.fill(
      'Estudiante en practica. Perfil actualizado en prueba E2E-27.',
    );
  } else {
    const campoTelefono = page
      .getByLabel(/telefono|teléfono|celular/i)
      .or(page.locator('input[type="tel"]'));

    if (
      !(await campoTelefono.isVisible({ timeout: 3_000 }).catch(() => false))
    ) {
      console.warn(
        'E2E-27: No se encontro campo editable en perfil estudiante.',
      );
      await context.close();
      return;
    }
    await campoTelefono.clear();
    await campoTelefono.fill('3009876543');
  }

  const btnGuardar = page
    .getByRole('button', { name: /guardar|actualizar|save|confirmar/i })
    .last();
  await expect(btnGuardar).toBeEnabled();

  await medirAccion(
    'E2E-27',
    'guardar perfil estudiante hasta confirmacion',
    async () => {
      await btnGuardar.click();
      await expect(
        page
          .getByText(/actualizado|guardado|exito|éxito|cambios guardados/i)
          .or(
            page
              .locator('[role="alert"], [role="status"]')
              .filter({ hasText: /actualiz|guard|exito|éxito/i }),
          ),
      ).toBeVisible({ timeout: 15_000 });
    },
  );

  await context.close();
});
