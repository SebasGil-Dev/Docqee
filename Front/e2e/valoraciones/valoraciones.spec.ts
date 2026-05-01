/**
 * VALORACIONES - E2E-21 a E2E-23
 *
 * Prepara una cita fresca para esta corrida, aceptada y con horario cercano,
 * para no depender de citas finalizadas de corridas anteriores.
 */

import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { RUTAS, SESIONES } from '../fixtures/credenciales';

test.describe.configure({ mode: 'serial', timeout: 180_000 });

const API_BASE_URL =
  process.env.E2E_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://docqee-production.up.railway.app';

const ESTUDIANTE_PRUEBA = /sebasti/i;
const PACIENTE_PRUEBA = /fernanda/i;
const BUSQUEDA_ESTUDIANTE_PRUEBA = 'Sebasti';
// Por API usamos el siguiente minuto disponible para mantener la suite corta.
const RATING_SLOT_DURATION_MINUTES = 1;
const RATING_SLOT_SETTLE_MS = 3_000;
const RUN_ID = Date.now().toString(36);

let patientRatingAppointmentId: string | null = null;
let studentRatingAppointmentId: string | null = null;

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

type PatientRequest = {
  id: string;
  status: string;
  studentName: string;
};

type PatientStudentDirectoryItem = {
  firstName: string;
  id: string;
  lastName: string;
};

type StudentRequest = {
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

function getRatingSlot(attempt: number) {
  let startAt = new Date(Date.now() + (attempt + 1) * 60_000);
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

function buildAppointmentValues(
  dashboard: StudentDashboard,
  slot: ReturnType<typeof getRatingSlot>,
  label: string,
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
    'Debe existir una solicitud aceptada para agendar citas.',
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
    additionalInfo: `${label} E2E-${RUN_ID}`,
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

function hasAcceptedRequest(dashboard: StudentDashboard) {
  return dashboard.requests.some(
    (item) =>
      item.status === 'ACEPTADA' && PACIENTE_PRUEBA.test(item.patientName),
  );
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

async function ensureAcceptedRequest(
  browser: Browser,
  studentPage: Page,
  dashboard: StudentDashboard,
) {
  if (hasAcceptedRequest(dashboard)) {
    return dashboard;
  }

  const patientContext = await browser.newContext({
    storageState: SESIONES.paciente,
  });
  const patientPage = await patientContext.newPage();

  await patientPage.goto(RUTAS.pacienteBuscar);
  await patientPage.waitForLoadState('networkidle');

  const existingRequests = await apiRequest<PatientRequest[]>(
    patientPage,
    '/patient-portal/requests',
  );
  let request =
    existingRequests.find(
      (item) =>
        item.status === 'ACEPTADA' && ESTUDIANTE_PRUEBA.test(item.studentName),
    ) ??
    existingRequests.find(
      (item) =>
        item.status === 'PENDIENTE' && ESTUDIANTE_PRUEBA.test(item.studentName),
    );

  if (!request) {
    const students = await apiRequest<PatientStudentDirectoryItem[]>(
      patientPage,
      `/patient-portal/students?search=${encodeURIComponent(BUSQUEDA_ESTUDIANTE_PRUEBA)}&limit=10`,
    );
    const student = students.find((item) =>
      ESTUDIANTE_PRUEBA.test(`${item.firstName} ${item.lastName}`),
    );

    expect(student, 'Debe existir el estudiante de prueba.').toBeTruthy();

    request = await apiRequest<PatientRequest>(
      patientPage,
      '/patient-portal/requests',
      {
        body: {
          reason: `Solicitud para valoracion E2E-${RUN_ID}`,
          studentId: student!.id,
        },
        method: 'POST',
      },
    );
  }

  await closeContext(patientContext);

  if (request.status !== 'ACEPTADA') {
    const accepted = await apiRequest<StudentRequest>(
      studentPage,
      `/student-portal/requests/${request.id}/status`,
      { body: { status: 'ACEPTADA' }, method: 'PATCH' },
    );
    expect(accepted.status).toBe('ACEPTADA');
  }

  return apiRequest<StudentDashboard>(studentPage, '/student-portal/dashboard');
}

async function createAcceptedRatingAppointment(
  browser: Browser,
  label: string,
) {
  const studentContext = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const studentPage = await studentContext.newPage();

  await studentPage.goto(RUTAS.estudianteCitas);
  await studentPage.waitForLoadState('networkidle');

  const initialDashboard = await apiRequest<StudentDashboard>(
    studentPage,
    '/student-portal/dashboard',
  );
  const dashboard = await ensureAcceptedRequest(
    browser,
    studentPage,
    initialDashboard,
  );

  let createdAppointment: StudentAppointment | null = null;
  let selectedSlot: ReturnType<typeof getRatingSlot> | null = null;
  let lastCreateResult: ApiResult<StudentAppointment> | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slot = getRatingSlot(attempt);
    const result = await apiFetch<StudentAppointment>(
      studentPage,
      '/student-portal/appointments',
      { body: buildAppointmentValues(dashboard, slot, label), method: 'POST' },
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
    `No se pudo crear la cita cercana para valoracion: ${JSON.stringify(lastCreateResult?.payload)}`,
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

  return {
    id: createdAppointment!.id,
    slot: selectedSlot!,
  };
}

async function waitForRatingAppointments(
  appointments: Array<{
    id: string;
    slot: ReturnType<typeof getRatingSlot>;
  }>,
) {
  const latestEndAt = Math.max(
    ...appointments.map((appointment) => appointment.slot.endAt.getTime()),
  );
  const waitMs = latestEndAt - Date.now() + RATING_SLOT_SETTLE_MS;

  if (waitMs > 0) {
    const slots = appointments
      .map(
        (appointment) =>
          `${appointment.id} ${appointment.slot.startTime}-${appointment.slot.endTime}`,
      )
      .join(', ');
    console.log(
      `E2E valoraciones: esperando ${Math.ceil(waitMs / 1000)}s a que terminen las citas ${slots}.`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

function requireRatingAppointmentId(
  appointmentId: string | null,
  label: string,
) {
  expect(
    appointmentId,
    `Debe existir una cita cercana finalizada para valorar (${label}).`,
  ).toBeTruthy();

  return appointmentId!;
}

async function getAppointmentRow(
  page: Page,
  owner: 'patient' | 'student',
  appointmentId: string,
) {
  const row = page.locator(
    `[data-testid="${owner}-appointment-row-${appointmentId}"]`,
  );

  await expect(row).toContainText(/Finalizada/i, { timeout: 15_000 });
  return row;
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(240_000);
  const patientAppointment = await createAcceptedRatingAppointment(
    browser,
    'Valoracion paciente',
  );
  const studentAppointment = await createAcceptedRatingAppointment(
    browser,
    'Valoracion estudiante',
  );

  patientRatingAppointmentId = patientAppointment.id;
  studentRatingAppointmentId = studentAppointment.id;

  await waitForRatingAppointments([patientAppointment, studentAppointment]);

  console.log(
    `E2E valoraciones: citas listas para valorar (${patientRatingAppointmentId}, ${studentRatingAppointmentId}).`,
  );
});

test('E2E-21 | Paciente califica al estudiante tras cita finalizada', async ({
  browser,
}) => {
  const appointmentId = requireRatingAppointmentId(
    patientRatingAppointmentId,
    'paciente',
  );
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  const fila = await getAppointmentRow(page, 'patient', appointmentId);

  const btnCalificar = fila.getByRole('button', {
    name: /calificar|valorar/i,
  });
  await expect(btnCalificar).toBeVisible({ timeout: 5_000 });
  await btnCalificar.click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 8_000 });

  await modal.getByRole('button', { name: /5 estrellas/i }).click();

  const textarea = page.locator('dialog textarea');
  if (await textarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await textarea.fill('Excelente atencion - prueba E2E-21 Playwright.');
  }

  await page
    .getByRole('button', { name: /enviar|guardar|calificar/i })
    .last()
    .click();

  await expect(modal).toBeHidden({ timeout: 15_000 });
  await expect(fila).toContainText(/5\/5/, {
    timeout: 15_000,
  });
  console.log('E2E-21: Calificacion del estudiante enviada.');
  await closeContext(context);
});

test('E2E-22 | Estudiante califica al paciente tras cita finalizada', async ({
  browser,
}) => {
  const appointmentId = requireRatingAppointmentId(
    studentRatingAppointmentId,
    'estudiante',
  );
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  const fila = await getAppointmentRow(page, 'student', appointmentId);

  const btnCalificar = fila.getByRole('button', {
    name: /calificar|valorar/i,
  });
  await expect(btnCalificar).toBeVisible({ timeout: 5_000 });
  await btnCalificar.click();

  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible({ timeout: 8_000 });

  await modal.getByRole('button', { name: /5 estrellas/i }).click();

  const textarea = page.locator('dialog textarea');
  if (await textarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await textarea.fill('Paciente muy colaborador - prueba E2E-22 Playwright.');
  }

  await page
    .getByRole('button', { name: /enviar|guardar|calificar/i })
    .last()
    .click();

  await expect(modal).toBeHidden({ timeout: 15_000 });
  await expect(fila).toContainText(/5\/5/, {
    timeout: 15_000,
  });
  console.log('E2E-22: Calificacion del paciente enviada.');
  await closeContext(context);
});

test('E2E-23 | Calificacion duplicada - sistema bloquea el segundo intento', async ({
  browser,
}) => {
  const appointmentId = requireRatingAppointmentId(
    patientRatingAppointmentId,
    'duplicada paciente',
  );
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  const fila = await getAppointmentRow(page, 'patient', appointmentId);

  const btnCalificar = fila.getByRole('button', {
    name: /calificar|valorar/i,
  });
  const visible = await btnCalificar.isVisible().catch(() => false);
  const habilitado = visible
    ? await btnCalificar.isEnabled().catch(() => false)
    : false;

  if (!visible || !habilitado) {
    console.log(
      'E2E-23: Calificacion duplicada bloqueada - boton ausente o deshabilitado.',
    );
    await closeContext(context);
    return;
  }

  await btnCalificar.click();
  await expect(
    page
      .getByText(/ya calificaste|ya enviaste|duplicad/i)
      .or(
        page
          .locator('[role="status"], [role="alert"]')
          .filter({ hasText: /ya califica/i }),
      ),
  ).toBeVisible({ timeout: 8_000 });

  console.log('E2E-23: Sistema rechazo la calificacion duplicada.');
  await closeContext(context);
});
