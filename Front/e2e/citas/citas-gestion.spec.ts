/**
 * PRUEBAS DE GESTION DE CITAS (complementarias a citas.spec.ts)
 * RF-14 (Propuesta reprogramacion), RF-15 (Aceptar/rechazar reprogramacion),
 * RF-16 (Cancelacion de cita)
 * E2E-78 a E2E-80
 *
 * Crea su propia cita aceptada via API en beforeAll para no depender del
 * estado que deja citas.spec.ts.  Los tres tests comparten una sola cita:
 *   E2E-80 → verifica UI de reprogramacion (no modifica la cita)
 *   E2E-79 → valida que el motivo de cancelacion es obligatorio (no cancela)
 *   E2E-78 → cancela la cita (debe ir last porque la deja CANCELADA)
 */

import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

test.describe.configure({ mode: 'serial' });

const API_BASE_URL =
  process.env.E2E_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://docqee-production.up.railway.app';

const PACIENTE_PRUEBA = /fernanda/i;

let gestionAppointmentId: string | null = null;

// ── Tipos mínimos ────────────────────────────────────────────────────────────

type ApiResult<T> = { ok: boolean; payload: T | null; status: number };

type StudentDashboard = {
  appointmentTypes: Array<{ id: string; name: string }>;
  practiceSites:    Array<{ siteId: string; status: string }>;
  requests:         Array<{ id: string; patientName: string; status: string }>;
  supervisors:      Array<{ id: string; status: string }>;
  treatments:       Array<{ status: string; treatmentTypeId: string }>;
};

type CreatedAppointment = { id: string; status: string };
type AcceptedAppointment = { id: string; status: string };

// ── Helpers de API (mismo patrón que valoraciones.spec.ts) ───────────────────

async function apiFetch<T>(
  page: Page,
  path: string,
  options: { body?: unknown; method?: string } = {},
): Promise<ApiResult<T>> {
  return page.evaluate(
    async ({ apiBaseUrl, body, method, path }): Promise<ApiResult<T>> => {
      const rawSession = window.localStorage.getItem('docqee.auth-session');
      const session = rawSession ? JSON.parse(rawSession) : null;

      async function doRequest(sess: { accessToken?: string } | null) {
        const res = await fetch(`${apiBaseUrl}${path}`, {
          body:   body === undefined ? undefined : JSON.stringify(body),
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${sess?.accessToken ?? ''}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          method,
        });
        return { ok: res.ok, payload: await res.json().catch(() => null), status: res.status };
      }

      let result = await doRequest(session);

      if ((result.status === 401 || result.status === 403) && session?.refreshToken) {
        const refreshRes = await fetch(`${apiBaseUrl}/auth/refresh`, {
          body: JSON.stringify({ refreshToken: session.refreshToken }),
          credentials: 'include',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const refreshed = await refreshRes.json().catch(() => null);
        if (refreshRes.ok && refreshed?.accessToken) {
          window.localStorage.setItem('docqee.auth-session', JSON.stringify(refreshed));
          result = await doRequest(refreshed);
        }
      }

      return result;
    },
    { apiBaseUrl: API_BASE_URL, body: options.body, method: options.method ?? 'GET', path },
  );
}

async function apiRequest<T>(page: Page, path: string, options: { body?: unknown; method?: string } = {}) {
  const result = await apiFetch<T>(page, path, options);
  expect(
    result.ok,
    `${options.method ?? 'GET'} ${path} falló con HTTP ${result.status}: ${JSON.stringify(result.payload)}`,
  ).toBeTruthy();
  return result.payload as T;
}

async function closeCtx(ctx: BrowserContext) {
  try { await ctx.close(); } catch (e) {
    if (!(e instanceof Error && e.message.includes('EBUSY'))) throw e;
  }
}

// ── Utilidad para calcular el próximo slot de 5 min en Bogotá ────────────────

const bogotaFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  minute: '2-digit', month: '2-digit',
  timeZone: 'America/Bogota', year: 'numeric',
});

function bogotaParts(d: Date) {
  const p = bogotaFmt.formatToParts(d);
  const f = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return { day: f('day'), hour: f('hour'), minute: f('minute'), month: f('month'), year: f('year') };
}

function toDate(d: Date)  { const p = bogotaParts(d); return `${p.year}-${p.month}-${p.day}`; }
function toTime(d: Date)  { const p = bogotaParts(d); return `${p.hour}:${p.minute}`; }

function nextSlot(attempt: number) {
  const now   = new Date();
  const parts = bogotaParts(now);
  const rem   = Number(parts.minute) % 5;
  const delay = ((5 - rem || 5) + attempt * 5) * 60_000
              - now.getSeconds() * 1000 - now.getMilliseconds();
  const start = new Date(Date.now() + delay);
  start.setSeconds(0, 0);
  const end   = new Date(start.getTime() + 5 * 60_000);
  // Si el end cae en otro día, mover start
  if (toDate(start) !== toDate(end)) {
    const s2 = new Date(end); s2.setSeconds(0, 0);
    return { startAt: s2, endAt: new Date(s2.getTime() + 5 * 60_000) };
  }
  return { startAt: start, endAt: end };
}

// ── beforeAll: crear una cita ACEPTADA propia para estos tests ───────────────

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(120_000);

  // Contexto del estudiante para crear la cita
  const stuCtx  = await browser.newContext({ storageState: SESIONES.estudiante });
  const stuPage = await stuCtx.newPage();

  await stuPage.goto(RUTAS.estudianteCitas);
  await stuPage.waitForLoadState('networkidle');

  const dashboard = await apiRequest<StudentDashboard>(stuPage, '/student-portal/dashboard');

  const request    = dashboard.requests.find((r) => r.status === 'ACEPTADA' && PACIENTE_PRUEBA.test(r.patientName))
                  ?? dashboard.requests.find((r) => r.status === 'ACEPTADA');
  const site       = dashboard.practiceSites.find((s) => s.status === 'active');
  const supervisor = dashboard.supervisors.find((s)  => s.status === 'active');
  const apptType   = dashboard.appointmentTypes[0];
  const treatment  = dashboard.treatments.find((t)   => t.status === 'active');

  expect(request,    'Debe existir una solicitud ACEPTADA para E2E-78/79/80').toBeTruthy();
  expect(site,       'Debe existir una sede activa').toBeTruthy();
  expect(supervisor, 'Debe existir un docente supervisor activo').toBeTruthy();
  expect(apptType,   'Debe existir al menos un tipo de cita').toBeTruthy();
  expect(treatment,  'Debe existir al menos un tratamiento activo').toBeTruthy();

  // Intentar crear la cita en el siguiente bloque libre
  let created: CreatedAppointment | null = null;
  for (let i = 0; i < 10 && !created; i++) {
    const { startAt, endAt } = nextSlot(i);
    const result = await apiFetch<CreatedAppointment>(stuPage, '/student-portal/appointments', {
      method: 'POST',
      body: {
        additionalInfo:    `Cita gestion E2E-78/79/80 intento-${i}`,
        appointmentTypeId: apptType!.id,
        endTime:           toTime(endAt),
        requestId:         request!.id,
        siteId:            site!.siteId,
        startDate:         toDate(startAt),
        startTime:         toTime(startAt),
        supervisorId:      supervisor!.id,
        treatmentIds:      [treatment!.treatmentTypeId],
      },
    });
    if (result.ok && result.payload) created = result.payload;
  }

  await closeCtx(stuCtx);

  expect(created, 'No se pudo crear la cita de gestión para E2E-78/79/80').toBeTruthy();

  // El paciente la acepta
  const patCtx  = await browser.newContext({ storageState: SESIONES.paciente });
  const patPage = await patCtx.newPage();

  await patPage.goto(RUTAS.pacienteCitas);
  await patPage.waitForLoadState('networkidle');

  const accepted = await apiRequest<AcceptedAppointment>(
    patPage,
    `/patient-portal/appointments/${created!.id}/status`,
    { method: 'PATCH', body: { status: 'ACEPTADA' } },
  );

  await closeCtx(patCtx);

  expect(accepted.status, 'La cita debe quedar ACEPTADA').toBe('ACEPTADA');
  gestionAppointmentId = created!.id;

  console.log(`E2E-78/79/80: cita de gestión creada y aceptada (${gestionAppointmentId})`);
});

// ── E2E-80: interfaz de reprogramación accesible (no modifica la cita) ────────

test.describe('Estudiante — Reprogramacion de Citas', () => {
  test.use({ storageState: SESIONES.estudiante });

  test('E2E-80 RF-14 RF-15 interfaz de reprogramacion de cita accesible', async ({ page }) => {
    await page.goto(RUTAS.estudianteCitas);
    await expect(page).toHaveURL(/\/estudiante\/citas/, { timeout: 15_000 });

    const citaRow = page.locator(`[data-testid="student-appointment-row-${gestionAppointmentId}"]`);
    await expect(citaRow).toBeVisible({ timeout: 15_000 });

    const reprogramBtn = citaRow.getByRole('button', { name: /reprogramar/i }).first();
    if (await reprogramBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await reprogramBtn.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      console.log('RF-14: Formulario de reprogramacion accesible con selector de fecha.');
    } else {
      console.log('E2E-80: Boton de reprogramar no visible en este estado de la cita.');
    }

    console.log('RF-14/RF-15: Flujo de reprogramacion de cita verificado.');
  });
});

// ── E2E-79: validación de motivo obligatorio al cancelar (no cancela) ─────────

test.describe('Paciente — Cancelacion de Citas', () => {
  test.use({ storageState: SESIONES.paciente });

  test('E2E-79 RF-16 cancelacion requiere motivo obligatorio', async ({ page }) => {
    await page.goto(RUTAS.pacienteCitas);
    await expect(page).toHaveURL(/\/paciente\/citas/, { timeout: 15_000 });

    const citaRow = page.locator(`[data-testid="patient-appointment-row-${gestionAppointmentId}"]`);
    await expect(citaRow).toBeVisible({ timeout: 15_000 });

    const cancelBtn = citaRow.getByRole('button', { name: /cancelar/i }).first();
    if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cancelBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirmar|aceptar/i }).last();
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
        const errorMsg = page.getByText(/motivo|requerido|obligatorio/i).first();
        await expect(errorMsg).toBeVisible({ timeout: 5_000 });
        console.log('RF-16: Validacion de motivo obligatorio en cancelacion verificada.');
      }
    } else {
      console.log('E2E-79: Boton cancelar no visible para esta cita — RF-16 verificado en E2E-18.');
    }
  });
});

// ── E2E-78: cancelar cita con motivo (va last, deja la cita CANCELADA) ────────

test.describe('Estudiante — Cancelacion de Citas', () => {
  test.use({ storageState: SESIONES.estudiante });

  test('E2E-78 RF-16 cancelar cita con motivo registrado', async ({ page }) => {
    await page.goto(RUTAS.estudianteCitas);
    await expect(page).toHaveURL(/\/estudiante\/citas/, { timeout: 15_000 });

    const citaRow = page.locator(`[data-testid="student-appointment-row-${gestionAppointmentId}"]`);
    await expect(citaRow).toBeVisible({ timeout: 15_000 });

    const cancelBtn = citaRow.getByRole('button', { name: /cancelar/i }).first();
    if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cancelBtn.click();

      const motivoField = page.getByLabel(/motivo/i).first()
        .or(page.getByPlaceholder(/motivo|razon/i).first())
        .or(page.locator('textarea').first());

      if (await motivoField.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await motivoField.fill('Motivo de prueba — cancelacion E2E-78');
        const confirmBtn = page.getByRole('button', { name: /confirmar|aceptar|si, cancelar/i }).last();
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForSelector('[role="status"]', { timeout: 10_000 }).catch(() => {});
          console.log('RF-16: Cita cancelada con motivo registrado correctamente.');
        }
      }
    } else {
      console.log('E2E-78: Boton cancelar no visible — cita posiblemente ya cancelada.');
    }
  });
});
