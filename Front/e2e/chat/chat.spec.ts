/**
 * COMUNICACION (CHAT) - E2E-11 y E2E-12
 */

import { expect, test, type Page } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';
import { medirAccion } from '../fixtures/metricas';

const TS = Date.now();
const MENSAJE_PACIENTE = `Mensaje E2E-11 - Playwright [${TS}]`;
const MENSAJE_ESTUDIANTE = `Respuesta E2E-12 - Playwright [${TS}]`;
const ESTUDIANTE_PRUEBA = /sebasti.n d.az romero/i;
const PACIENTE_PRUEBA = /fernanda/i;

async function seleccionarConversacionActiva(
  page: Page,
  cardTestIdPrefix: string,
  participante: RegExp,
) {
  await page
    .getByRole('button', { name: /filtrar conversaciones por estado/i })
    .click();
  await page.getByRole('menuitemradio', { name: /^Activa$/i }).click();

  const conversationCard = page
    .locator(`[data-testid^="${cardTestIdPrefix}"]`)
    .filter({ hasText: participante })
    .first();

  await expect(conversationCard).toBeVisible({ timeout: 15_000 });
  await conversationCard.click();
}

test('E2E-11 | Paciente envia mensaje en conversacion activa', async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteConversaciones);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Chat con estudiantes')).toBeVisible({
    timeout: 15_000,
  });

  await seleccionarConversacionActiva(
    page,
    'patient-conversation-card-',
    ESTUDIANTE_PRUEBA,
  );

  const input = page.locator('#patient-conversation-message');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toBeEnabled();
  await input.fill(MENSAJE_PACIENTE);
  await expect(input).toHaveValue(MENSAJE_PACIENTE);

  await medirAccion(
    'E2E-11',
    'enviar mensaje paciente hasta visible',
    async () => {
      await input.press('Enter');
      await expect(page.getByText(MENSAJE_PACIENTE).first()).toBeVisible({
        timeout: 10_000,
      });
    },
  );

  await context.close();
});

test('E2E-12 | Estudiante responde mensaje en conversacion activa', async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteConversaciones);
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'Chat con pacientes', exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  await seleccionarConversacionActiva(
    page,
    'student-conversation-card-',
    PACIENTE_PRUEBA,
  );

  const input = page.locator('#student-conversation-message');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toBeEnabled();
  await input.fill(MENSAJE_ESTUDIANTE);

  await medirAccion(
    'E2E-12',
    'enviar mensaje estudiante hasta visible',
    async () => {
      await input.press('Enter');
      await expect(page.getByText(MENSAJE_ESTUDIANTE).first()).toBeVisible({
        timeout: 10_000,
      });
    },
  );

  await context.close();
});
