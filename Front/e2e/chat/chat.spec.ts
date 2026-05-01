/**
 * COMUNICACIÓN (CHAT) — E2E-11 y E2E-12
 *
 * UI real observada:
 *  - Página: "Chat con estudiantes" / "Chat con pacientes"
 *  - Sidebar: lista de conversaciones con nombre + último mensaje
 *  - La primera conversación abre automáticamente al cargar la página
 *  - Input: placeholder "Escribe un mensaje..."
 *  - Botón enviar: ícono (sin texto), junto al input
 */

import { test, expect, type Page } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

const TS = Date.now();
const MENSAJE_PACIENTE   = `Mensaje E2E-11 — Playwright [${TS}]`;
const MENSAJE_ESTUDIANTE = `Respuesta E2E-12 — Playwright [${TS}]`;
const ESTUDIANTE_PRUEBA = /sebasti.n d.az romero/i;
const PACIENTE_PRUEBA = /fernanda/i;

async function seleccionarConversacionActiva(
  page: Page,
  cardTestIdPrefix: string,
  participante: RegExp,
) {
  await page.getByRole('button', { name: /filtrar conversaciones por estado/i }).click();
  await page.getByRole('menuitemradio', { name: /^Activa$/i }).click();

  const conversationCard = page
    .locator(`[data-testid^="${cardTestIdPrefix}"]`)
    .filter({ hasText: participante })
    .first();

  await expect(conversationCard).toBeVisible({ timeout: 15_000 });
  await conversationCard.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// E2E-11: Paciente envía mensaje
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-11 | Paciente envía mensaje en conversación activa', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteConversaciones);
  await page.waitForLoadState('networkidle');

  // Heading de la página
  await expect(page.getByText('Chat con estudiantes')).toBeVisible({ timeout: 15_000 });

  await seleccionarConversacionActiva(
    page,
    'patient-conversation-card-',
    ESTUDIANTE_PRUEBA,
  );

  // El input debe estar visible y habilitado
  const input = page.locator('#patient-conversation-message');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toBeEnabled();

  // Escribir el mensaje
  await input.fill(MENSAJE_PACIENTE);
  await expect(input).toHaveValue(MENSAJE_PACIENTE);

  // Enviar con Enter o botón ícono
  await input.press('Enter');

  // El mensaje aparece en el hilo de chat (y también en el preview del sidebar)
  await expect(page.getByText(MENSAJE_PACIENTE).first()).toBeVisible({ timeout: 10_000 });

  await context.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E-12: Estudiante responde mensaje
// ─────────────────────────────────────────────────────────────────────────────
test('E2E-12 | Estudiante responde mensaje en conversación activa', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.estudiante });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteConversaciones);
  await page.waitForLoadState('networkidle');

  // Heading exacto del módulo de chat del estudiante
  await expect(
    page.getByRole('heading', { name: 'Chat con pacientes', exact: true })
  ).toBeVisible({ timeout: 15_000 });

  await seleccionarConversacionActiva(
    page,
    'student-conversation-card-',
    PACIENTE_PRUEBA,
  );

  // Input del chat — selector por atributo parcial para evitar problemas con "..."
  const input = page.locator('#student-conversation-message');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toBeEnabled();

  await input.fill(MENSAJE_ESTUDIANTE);
  await input.press('Enter');

  // La respuesta aparece en el hilo (y en el preview del sidebar)
  await expect(page.getByText(MENSAJE_ESTUDIANTE).first()).toBeVisible({ timeout: 10_000 });

  await context.close();
});
