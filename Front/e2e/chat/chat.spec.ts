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

import { test, expect } from '@playwright/test';
import { RUTAS, SESIONES, ESTUDIANTE, PACIENTE } from '../fixtures/credenciales';

const TS = Date.now();
const MENSAJE_PACIENTE   = `Mensaje E2E-11 — Playwright [${TS}]`;
const MENSAJE_ESTUDIANTE = `Respuesta E2E-12 — Playwright [${TS}]`;

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

  // La lista de chats debe tener al menos una conversación
  // Seleccionar la conversación con Sebastián (estudiante de prueba)
  const convEst = page.getByText(ESTUDIANTE.nombre, { exact: false });
  const hayConvEst = await convEst.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hayConvEst) {
    await convEst.click();
    await page.waitForTimeout(1_000);
  }
  // Si no está visible el nombre exacto, la primera conversación ya está abierta

  // El input debe estar visible y habilitado
  const input = page.locator('[placeholder*="mensaje" i]');
  await expect(input).toBeVisible({ timeout: 10_000 });
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

  // Hacer clic en la primera conversación del sidebar
  const sidebarCard = page.locator('[data-testid*="conversation-card"]').first();
  const haySidebar = await sidebarCard.isVisible({ timeout: 5_000 }).catch(() => false);
  if (haySidebar) {
    await sidebarCard.click();
    await page.waitForTimeout(1_500);
  }

  // Input del chat — selector por atributo parcial para evitar problemas con "..."
  const input = page.locator('[placeholder*="mensaje" i]');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toBeEnabled();

  await input.fill(MENSAJE_ESTUDIANTE);
  await input.press('Enter');

  // La respuesta aparece en el hilo (y en el preview del sidebar)
  await expect(page.getByText(MENSAJE_ESTUDIANTE).first()).toBeVisible({ timeout: 10_000 });

  await context.close();
});
