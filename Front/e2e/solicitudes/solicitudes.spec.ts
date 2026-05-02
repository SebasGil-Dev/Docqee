/**
 * BUSQUEDA Y SOLICITUDES - E2E-06 a E2E-10
 *
 * Estos tests preparan la relacion principal que usan chat, citas y
 * valoraciones: paciente envia solicitud -> estudiante acepta solicitud.
 * No se rechaza la solicitud principal porque eso rompe los modulos
 * posteriores de la suite ordenada.
 */

import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';
import { medirAccion } from '../fixtures/metricas';
import { saveRatingAppointmentState } from '../fixtures/ratingAppointmentState';

const ESTUDIANTE_PRUEBA = /sebasti.n d.az romero/i;
const PACIENTE_PRUEBA = /fernanda/i;
const BUSQUEDA_ESTUDIANTE_PRUEBA = 'Sebasti';
const MOTIVO_SOLICITUD_PRUEBA =
  'Solicitud de prueba automatizada E2E-07 - Playwright.';
const API_BASE_URL =
  process.env.E2E_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://docqee-production.up.railway.app';
const FAST_RATING_TIME_VALUES = new Set(['1', 'true', 'yes', 'si']);
const USE_FAST_RATING_TIME = FAST_RATING_TIME_VALUES.has(
  (process.env.E2E_FAST_RATING_TIME ?? '').toLowerCase(),
);
const RATING_SLOT_STEP_MINUTES = USE_FAST_RATING_TIME ? 1 : 5;
const RATING_SLOT_DURATION_MINUTES = USE_FAST_RATING_TIME ? 1 : 5;

type ApiResult<T> = {
  ok: boolean;
  payload: T | null;
  status: number;
};

type StudentDashboard = {
  appointmentTypes: Array<{ id: string; name: string }>;
  practiceSites: Array<{ siteId: string; status: string }>;
  requests: Array<{ id: string; patientName: string; status: string }>;
  supervisors: Array<{ id: string; status: string }>;
  treatments: Array<{ status: string; treatmentTypeId: string }>;
};

type StudentAppointment = {
  id: string;
  status: string;
};

type PatientAppointment = {
  id: string;
  status: string;
};

type AppointmentFormValues = {
  additionalInfo: string;
  appointmentTypeId: string;
  endTime: string;
  requestId: string;
  siteId: string;
  startDate: string;
  startTime: string;
  supervisorId: string;
  treatmentIds: string[];
};

const bogotaFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  timeZone: 'America/Bogota',
  year: 'numeric',
});

function getBogotaDateTimeParts(value: Date) {
  const parts = bogotaFormatter.formatToParts(value);
  const findPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    day: findPart('day'),
    hour: findPart('hour'),
    minute: findPart('minute'),
    month: findPart('month'),
    year: findPart('year'),
  };
}

function toDateInputValue(value: Date) {
  const parts = getBogotaDateTimeParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toTimeInputValue(value: Date) {
  const parts = getBogotaDateTimeParts(value);
  return `${parts.hour}:${parts.minute}`;
}

function getEarlyRatingSlot(attempt: number) {
  const now = new Date();
  const parts = getBogotaDateTimeParts(now);
  const currentMinute = Number(parts.minute);
  const minuteRemainder = currentMinute % RATING_SLOT_STEP_MINUTES;
  const minutesUntilNextStep =
    RATING_SLOT_STEP_MINUTES - minuteRemainder || RATING_SLOT_STEP_MINUTES;
  const delayMs =
    (minutesUntilNextStep + attempt * RATING_SLOT_STEP_MINUTES) * 60_000 -
    now.getSeconds() * 1000 -
    now.getMilliseconds();
  let startAt = new Date(Date.now() + delayMs);
  startAt.setSeconds(0, 0);
  let endAt = new Date(
    startAt.getTime() + RATING_SLOT_DURATION_MINUTES * 60_000,
  );

  if (toDateInputValue(startAt) !== toDateInputValue(endAt)) {
    startAt = new Date(endAt);
    endAt = new Date(startAt.getTime() + RATING_SLOT_DURATION_MINUTES * 60_000);
  }

  return {
    endAt,
    endTime: toTimeInputValue(endAt),
    startAt,
    startDate: toDateInputValue(startAt),
    startTime: toTimeInputValue(startAt),
  };
}

function buildEarlyRatingAppointmentValues(
  dashboard: StudentDashboard,
  slot: ReturnType<typeof getEarlyRatingSlot>,
): AppointmentFormValues {
  const request =
    dashboard.requests.find(
      (item) =>
        item.status === 'ACEPTADA' && PACIENTE_PRUEBA.test(item.patientName),
    ) ?? dashboard.requests.find((item) => item.status === 'ACEPTADA');
  const site = dashboard.practiceSites.find((item) => item.status === 'active');
  const supervisor = dashboard.supervisors.find(
    (item) => item.status === 'active',
  );
  const appointmentType = dashboard.appointmentTypes[0];
  const treatment = dashboard.treatments.find(
    (item) => item.status === 'active',
  );

  expect(
    request,
    'Debe existir una solicitud aceptada para preparar valoraciones.',
  ).toBeTruthy();
  expect(site, 'Debe existir una sede activa para agendar citas.').toBeTruthy();
  expect(supervisor, 'Debe existir un docente supervisor activo.').toBeTruthy();
  expect(
    appointmentType,
    'Debe existir al menos un tipo de cita.',
  ).toBeTruthy();
  expect(
    treatment,
    'Debe existir al menos un tratamiento activo.',
  ).toBeTruthy();

  return {
    additionalInfo: `Valoracion compartida E2E-${Date.now().toString(36)}`,
    appointmentTypeId: appointmentType!.id,
    endTime: slot.endTime,
    requestId: request!.id,
    siteId: site!.siteId,
    startDate: slot.startDate,
    startTime: slot.startTime,
    supervisorId: supervisor!.id,
    treatmentIds: [treatment!.treatmentTypeId],
  };
}

async function apiFetch<T>(
  page: Page,
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  return page.evaluate(
    async ({ apiBaseUrl, body, method, path }): Promise<ApiResult<T>> => {
      const storageKey = 'docqee.auth-session';
      const rawSession = window.localStorage.getItem(storageKey);
      const session = rawSession ? JSON.parse(rawSession) : null;

      async function performRequest(
        activeSession: { accessToken?: string } | null,
      ) {
        const response = await fetch(`${apiBaseUrl}${path}`, {
          body: body === undefined ? undefined : JSON.stringify(body),
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${activeSession?.accessToken ?? ''}`,
            ...(body === undefined
              ? {}
              : { 'Content-Type': 'application/json' }),
          },
          method,
        });

        return {
          ok: response.ok,
          payload: await response.json().catch(() => null),
          status: response.status,
        };
      }

      let result = await performRequest(session);

      if (
        (result.status === 401 || result.status === 403) &&
        session?.refreshToken
      ) {
        const refreshResponse = await fetch(`${apiBaseUrl}/auth/refresh`, {
          body: JSON.stringify({ refreshToken: session.refreshToken }),
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });
        const refreshedSession = await refreshResponse.json().catch(() => null);

        if (refreshResponse.ok && refreshedSession?.accessToken) {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify(refreshedSession),
          );
          result = await performRequest(refreshedSession);
        }
      }

      return result;
    },
    {
      apiBaseUrl: API_BASE_URL,
      body: options.body,
      method: options.method ?? 'GET',
      path,
    },
  );
}

async function apiRequest<T>(
  page: Page,
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const result = await apiFetch<T>(page, path, options);

  expect(
    result.ok,
    `La peticion ${options.method ?? 'GET'} ${path} fallo con HTTP ${result.status}: ${JSON.stringify(result.payload)}`,
  ).toBeTruthy();

  return result.payload as T;
}

async function closeContext(context: BrowserContext) {
  try {
    await context.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes('EBUSY')) {
      throw error;
    }
  }
}

async function prepararCitaTempranaParaValoracion(browser: Browser) {
  const studentContext = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const studentPage = await studentContext.newPage();

  await studentPage.goto(RUTAS.estudianteCitas);
  await studentPage.waitForLoadState('networkidle');

  const dashboard = await apiRequest<StudentDashboard>(
    studentPage,
    '/student-portal/dashboard',
  );

  let createdAppointment: StudentAppointment | null = null;
  let selectedSlot: ReturnType<typeof getEarlyRatingSlot> | null = null;
  let lastCreateResult: ApiResult<StudentAppointment> | null = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slot = getEarlyRatingSlot(attempt);
    const result = await apiFetch<StudentAppointment>(
      studentPage,
      '/student-portal/appointments',
      {
        body: buildEarlyRatingAppointmentValues(dashboard, slot),
        method: 'POST',
      },
    );

    if (result.ok && result.payload) {
      createdAppointment = result.payload;
      selectedSlot = slot;
      break;
    }

    lastCreateResult = result;
  }

  await closeContext(studentContext);

  expect(
    createdAppointment,
    `No se pudo preparar la cita temprana para valoracion: ${JSON.stringify(lastCreateResult?.payload)}`,
  ).toBeTruthy();
  expect(selectedSlot).toBeTruthy();

  const patientContext = await browser.newContext({
    storageState: SESIONES.paciente,
  });
  const patientPage = await patientContext.newPage();

  await patientPage.goto(RUTAS.pacienteCitas);
  await patientPage.waitForLoadState('networkidle');

  const accepted = await apiRequest<PatientAppointment>(
    patientPage,
    `/patient-portal/appointments/${createdAppointment!.id}/status`,
    { body: { status: 'ACEPTADA' }, method: 'PATCH' },
  );

  await closeContext(patientContext);

  expect(accepted.status).toBe('ACEPTADA');

  saveRatingAppointmentState({
    createdAt: new Date().toISOString(),
    endAt: selectedSlot!.endAt.toISOString(),
    endTime: selectedSlot!.endTime,
    id: createdAppointment!.id,
    source: 'early',
    startAt: selectedSlot!.startAt.toISOString(),
    startDate: selectedSlot!.startDate,
    startTime: selectedSlot!.startTime,
  });

  return {
    id: createdAppointment!.id,
    slot: selectedSlot!,
  };
}

async function buscarEstudianteDePrueba(page: Page) {
  const searchInput = page.locator('#patient-student-search');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(BUSQUEDA_ESTUDIANTE_PRUEBA);

  const filaEstudiante = page
    .locator('tbody tr')
    .filter({ hasText: ESTUDIANTE_PRUEBA })
    .first();
  await expect(filaEstudiante).toBeVisible({ timeout: 15_000 });

  return filaEstudiante;
}

async function buscarSolicitudDelPaciente(page: Page) {
  const searchInput = page.locator('input[type="search"]').first();
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill('Fernanda');
  }

  const filasSolicitud = page.locator('[data-testid^="student-request-row-"]');
  const filaPorMotivo = filasSolicitud
    .filter({ hasText: MOTIVO_SOLICITUD_PRUEBA })
    .first();
  const filaSolicitud = (await filaPorMotivo
    .isVisible({ timeout: 3_000 })
    .catch(() => false))
    ? filaPorMotivo
    : filasSolicitud.filter({ hasText: PACIENTE_PRUEBA }).first();

  await expect(filaSolicitud).toBeVisible({ timeout: 15_000 });

  return filaSolicitud;
}

test('E2E-06 | Paciente busca estudiantes disponibles', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteBuscar);
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'Buscar estudiantes', exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await medirAccion('E2E-06', 'buscar estudiantes disponibles', async () => {
    await buscarEstudianteDePrueba(page);
  });
  await expect(
    page.getByRole('button', { name: 'Ver perfil' }).first(),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('combobox').first()).toBeVisible();

  await context.close();
});

test('E2E-07 | Paciente envia solicitud', async ({ browser }) => {
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteBuscar);
  await page.waitForLoadState('networkidle');

  const filaEstudiante = await buscarEstudianteDePrueba(page);
  const btnVerPerfil = filaEstudiante.getByRole('button', {
    name: 'Ver perfil',
  });

  await expect(btnVerPerfil).toBeVisible({ timeout: 10_000 });
  await btnVerPerfil.click();

  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });

  const msgExiste = page.getByText(/ya tienes una solicitud/i);
  if (await msgExiste.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await medirAccion(
      'E2E-07',
      'validar solicitud duplicada bloqueada',
      async () => {
        await expect(msgExiste).toBeVisible();
      },
    );
    console.log('E2E-07: El sistema bloqueo una solicitud duplicada activa.');
    await context.close();
    return;
  }

  await expect(page.getByText('Motivo de la solicitud')).toBeVisible({
    timeout: 8_000,
  });

  const campoMotivo = page
    .getByPlaceholder(/solicitar atencion|motivo/i)
    .or(page.locator('dialog textarea'));
  await campoMotivo.fill(MOTIVO_SOLICITUD_PRUEBA);

  const solicitudResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/patient-portal/requests') &&
      response.request().method() === 'POST',
  );

  const solicitudCreada = await medirAccion(
    'E2E-07',
    'enviar solicitud hasta API pendiente',
    async () => {
      await page.getByRole('button', { name: 'Enviar solicitud' }).click();

      const solicitudResponse = await solicitudResponsePromise;
      expect(
        solicitudResponse.ok(),
        `El API no creo la solicitud. Status HTTP: ${solicitudResponse.status()}`,
      ).toBeTruthy();

      return solicitudResponse.json().catch(() => null);
    },
  );
  expect(solicitudCreada?.status).toBe('PENDIENTE');

  console.log('E2E-07: Solicitud enviada exitosamente.');

  await context.close();
});

test('E2E-08 | Estudiante visualiza solicitudes recibidas', async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'Solicitudes', exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Solicitudes pendientes/i)).toBeVisible({
    timeout: 8_000,
  });

  const filaSolicitud = await medirAccion(
    'E2E-08',
    'ver solicitud recibida en bandeja',
    async () => buscarSolicitudDelPaciente(page),
  );

  await expect(
    page.getByRole('columnheader', { name: 'Paciente' }),
  ).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('columnheader', { name: 'Estado' })).toBeVisible({
    timeout: 8_000,
  });
  await expect(
    filaSolicitud.getByText(/Pendiente|Aceptada/i).first(),
  ).toBeVisible();

  console.log('E2E-08: El estudiante ve la solicitud del paciente de prueba.');

  await context.close();
});

test('E2E-09 | Estudiante acepta solicitud pendiente', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  const filaSolicitud = await buscarSolicitudDelPaciente(page);
  const yaAceptada = await filaSolicitud
    .getByText(/Aceptada/i)
    .first()
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (yaAceptada) {
    console.log(
      'E2E-09: La solicitud del paciente de prueba ya estaba aceptada.',
    );
    await context.close();
    return;
  }

  const btnAceptar = filaSolicitud.getByRole('button', { name: /aceptar/i });
  await expect(btnAceptar).toBeVisible({ timeout: 8_000 });

  const aceptarResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/student-portal/requests/') &&
      response.url().includes('/status') &&
      response.request().method() === 'PATCH',
  );

  const solicitudAceptada = await medirAccion(
    'E2E-09',
    'aceptar solicitud hasta conversacion creada',
    async () => {
      await btnAceptar.click();

      const btnConfirmar = page.getByRole('button', {
        name: /confirmar|aceptar/i,
      });
      if (await btnConfirmar.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btnConfirmar.click();
      }

      const aceptarResponse = await aceptarResponsePromise;
      expect(
        aceptarResponse.ok(),
        `El API no acepto la solicitud. Status HTTP: ${aceptarResponse.status()}`,
      ).toBeTruthy();

      return aceptarResponse.json().catch(() => null);
    },
  );
  expect(solicitudAceptada?.status).toBe('ACEPTADA');
  expect(solicitudAceptada?.conversationId).toBeTruthy();

  await medirAccion('E2E-09', 'solicitud aparece aceptada en UI', async () => {
    await expect(filaSolicitud.getByText(/Aceptada/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
  console.log('E2E-09: Solicitud aceptada correctamente.');

  await context.close();
});

test('E2E-10 | Solicitud aceptada queda disponible para el flujo posterior', async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteSolicitudes);
  await page.waitForLoadState('networkidle');

  const filaSolicitud = await buscarSolicitudDelPaciente(page);

  await medirAccion(
    'E2E-10',
    'validar solicitud aceptada disponible',
    async () => {
      await expect(filaSolicitud.getByText(/Aceptada/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        filaSolicitud.getByRole('button', { name: /rechazar/i }),
      ).toHaveCount(0);

      await page
        .getByRole('button', { name: /filtrar solicitudes por estado/i })
        .click();
      await expect(
        page.getByRole('menuitemradio', { name: /rechazada/i }),
      ).toHaveCount(0);
    },
  );

  await medirAccion(
    'E2E-10',
    'preparar cita temprana para valoraciones',
    async () => {
      try {
        const appointment = await prepararCitaTempranaParaValoracion(browser);
        console.log(
          `E2E valoraciones: cita temprana preparada (${appointment.id}) ${appointment.slot.startTime}-${appointment.slot.endTime}.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `E2E valoraciones: no se pudo preparar cita temprana; valoraciones intentara crear una sola cita al iniciar. ${message}`,
        );
      }
    },
  );

  console.log(
    'E2E-10: La solicitud aceptada se conserva para chat, citas y valoraciones.',
  );

  await context.close();
});
