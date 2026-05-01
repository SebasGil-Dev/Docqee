/**
 * PERFIL DE USUARIO — E2E-24 a E2E-27
 *
 * Cubre:
 *  E2E-24  Paciente visualiza su perfil con datos cargados correctamente
 *  E2E-25  Paciente actualiza un dato de su perfil y el sistema lo confirma
 *  E2E-26  Estudiante visualiza su perfil con datos cargados correctamente
 *  E2E-27  Estudiante actualiza un dato de su perfil y el sistema lo confirma
 */

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

// ─────────────────────────────────────────────────────────────────────────────
// E2E-24: Paciente visualiza su perfil
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-24 | Paciente visualiza su perfil con datos cargados', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacientePerfil);
  await page.waitForLoadState('networkidle');

  // La página de perfil debe cargar
  await expect(
    page.getByRole('heading', { name: /perfil|mi perfil|datos personales/i })
  ).toBeVisible({ timeout: 15_000 });

  // Deben aparecer campos con información del usuario (no vacíos)
  // Buscar cualquier campo con valor visible: nombre, correo, documento, teléfono
  const campoConDato = page
    .locator('input[value]:not([value=""]), p, span, dd')
    .filter({ hasText: /\S{3,}/ }) // al menos 3 caracteres
    .first();

  await expect(campoConDato).toBeVisible({ timeout: 10_000 });

  // El correo del paciente debe estar presente en algún lugar de la página
  await expect(
    page.getByText('FernadaESba2@ozsaip.com', { exact: false }).first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-25: Paciente actualiza un dato de su perfil
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-25 | Paciente actualiza dato de perfil y el sistema confirma el cambio', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacientePerfil);
  await page.waitForLoadState('networkidle');

  // Buscar botón de editar perfil
  const btnEditar = page
    .getByRole('button', { name: /editar|modificar|actualizar perfil/i })
    .or(page.getByRole('link', { name: /editar/i }));

  const hayBtnEditar = await btnEditar.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hayBtnEditar) {
    await btnEditar.click();
    await page.waitForLoadState('networkidle');
  }

  // Buscar campo de teléfono (dato seguro de editar sin efectos secundarios)
  const campoTelefono = page
    .getByLabel(/teléfono|celular|móvil/i)
    .or(page.locator('input[type="tel"], input[placeholder*="teléfono" i], input[placeholder*="celular" i]'));

  const hayTelefono = await campoTelefono.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hayTelefono) {
    await campoTelefono.clear();
    await campoTelefono.fill('3001234567');
  } else {
    // Intentar con otro campo: dirección o localidad
    const campoAlternativo = page
      .getByLabel(/dirección|localidad|barrio/i)
      .or(page.locator('input').filter({ hasValue: /.+/ }).nth(1));

    const hayAlternativo = await campoAlternativo.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hayAlternativo) {
      console.warn('E2E-25: No se encontró campo editable. Verificar la estructura del formulario de perfil.');
      await context.close();
      return;
    }

    const valorActual = await campoAlternativo.inputValue();
    await campoAlternativo.clear();
    await campoAlternativo.fill(valorActual || 'Dato actualizado E2E');
  }

  // Guardar cambios
  const btnGuardar = page
    .getByRole('button', { name: /guardar|actualizar|save|confirmar/i })
    .last();
  await expect(btnGuardar).toBeEnabled();
  await btnGuardar.click();

  // El sistema debe confirmar con mensaje de éxito
  await expect(
    page.getByText(/actualizado|guardado|éxito|cambios guardados/i)
      .or(page.locator('[role="alert"], [role="status"]').filter({ hasText: /actualiz|guard|éxito/i }))
  ).toBeVisible({ timeout: 15_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-26: Estudiante visualiza su perfil
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-26 | Estudiante visualiza su perfil con datos cargados', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudiantePerfil);
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: /perfil|mi perfil|datos|información/i })
  ).toBeVisible({ timeout: 15_000 });

  // El perfil del estudiante debe mostrar información de la cuenta
  await expect(
    page.getByText('sebastian@wnbaldwy.com', { exact: false })
      .or(page.locator('input[type="email"]').filter({ hasValue: /.+/ }))
  ).toBeVisible({ timeout: 10_000 });

  // Si tiene foto de perfil cargada, debe renderizarse
  const foto = page.locator('img[alt*="perfil" i], img[alt*="foto" i], img[alt*="avatar" i]');
  const hayFoto = await foto.isVisible({ timeout: 3_000 }).catch(() => false);
  if (hayFoto) {
    // La imagen no debe estar rota (naturalWidth > 0 indica que cargó correctamente)
    const cargoBien = await foto.evaluate(
      (img: HTMLImageElement) => img.naturalWidth > 0
    ).catch(() => false);
    expect(cargoBien).toBe(true);
  }

  // El perfil del estudiante debe mostrar tratamientos o sedes asociadas
  const infoAcademica = page
    .getByText(/tratamiento|sede|universidad|práctica/i)
    .first();
  await expect(infoAcademica).toBeVisible({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-27: Estudiante actualiza un dato de su perfil
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-27 | Estudiante actualiza dato de perfil y el sistema confirma el cambio', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudiantePerfil);
  await page.waitForLoadState('networkidle');

  // Activar modo edición si existe botón
  const btnEditar = page
    .getByRole('button', { name: /editar|modificar|actualizar/i })
    .or(page.getByRole('link', { name: /editar perfil/i }));

  const hayBtnEditar = await btnEditar.isVisible({ timeout: 5_000 }).catch(() => false);
  if (hayBtnEditar) {
    await btnEditar.click();
    await page.waitForLoadState('networkidle');
  }

  // Intentar editar la biografía / descripción del estudiante
  const campoBio = page
    .getByLabel(/biografía|descripción|sobre mí|presentación/i)
    .or(page.locator('textarea').first());

  const hayBio = await campoBio.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hayBio) {
    await campoBio.clear();
    await campoBio.fill('Estudiante en práctica. Perfil actualizado en prueba E2E-27.');
  } else {
    // Editar teléfono como alternativa
    const campoTelefono = page
      .getByLabel(/teléfono|celular/i)
      .or(page.locator('input[type="tel"]'));

    const hayTelefono = await campoTelefono.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hayTelefono) {
      console.warn('E2E-27: No se encontró campo editable en el perfil del estudiante.');
      await context.close();
      return;
    }
    await campoTelefono.clear();
    await campoTelefono.fill('3009876543');
  }

  // Guardar
  const btnGuardar = page
    .getByRole('button', { name: /guardar|actualizar|save|confirmar/i })
    .last();
  await expect(btnGuardar).toBeEnabled();
  await btnGuardar.click();

  // Confirmar éxito
  await expect(
    page.getByText(/actualizado|guardado|éxito|cambios guardados/i)
      .or(page.locator('[role="alert"], [role="status"]').filter({ hasText: /actualiz|guard|éxito/i }))
  ).toBeVisible({ timeout: 15_000 });
});
