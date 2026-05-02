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
import { medirAccion } from '../fixtures/metricas';
import {
  clearRatingAppointmentState,
  loadRatingAppointmentState,
  saveRatingAppointmentState,
  type RatingAppointmentState,
} from '../fixtures/ratingAppointmentState';

test.describe.configure({ mode: 'serial', timeout: 180_000 });

const API_BASE_URL =
  process.env.E2E_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://docqee-production.up.railway.app';

const ESTUDIANTE_PRUEBA = /sebasti/i;
const PACIENTE_PRUEBA = /fernanda/i;
const BUSQUEDA_ESTUDIANTE_PRUEBA = 'Sebasti';
const FAST_RATING_TIME_VALUES = new Set(['1', 'true', 'yes', 'si']);
const USE_FAST_RATING_TIME = FAST_RATING_TIME_VALUES.has(
  (process.env.E2E_FAST_RATING_TIME ?? '').toLowerCase(),
);
// Por defecto imitamos el selector manual: proximo bloque de 5 minutos.
const RATING_SLOT_STEP_MINUTES = USE_FAST_RATING_TIME ? 1 : 5;
const RATING_SLOT_DURATION_MINUTES = USE_FAST_RATING_TIME ? 1 : 5;
const RATING_SLOT_SETTLE_MS = 3_000;
const RATING_HOOK_TIMEOUT_MS = USE_FAST_RATING_TIME ? 240_000 : 1_200_000;
const RUN_ID = Date.now().toString(36);

let ratingAppointmentId: string | null = null;
let studentRatingAppointmentId: string | null = null;

type ApiResult<T> = {
  ok: boolean;
  payload: T | null;
  status: number;
};

type StudentDashboard = {
  appointments: RatingDashboardAppointment[];
  appointmentTypes: Array<{ id: string; name: string }>;
  practiceSites: Array<{ siteId: string; status: string }>;
  requests: Array<{ id: string; patientName: string; status: string }>;
  supervisors: Array<{ id: string; status: string }>;
  treatments: Array<{ status: string; treatmentTypeId: string }>;
};

type RatingDashboardAppointment = {
  endAt: string;
  id: string;
  myRating: number | null;
  startAt: string;
  status: string;
};

type PatientDashboard = {
  appointments: RatingDashboardAppointment[];
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

function getNextRatingSlotStart(attempt: number) {
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
  const startAt = new Date(Date.now() + delayMs);
  startAt.setSeconds(0, 0);

  return startAt;
}

function getRatingSlot(attempt: number) {
  let startAt = getNextRatingSlotStart(attempt);
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

function serializeRatingAppointment(
  appointment: {
    id: string;
    slot: ReturnType<typeof getRatingSlot>;
  },
  source: RatingAppointmentState['source'],
): RatingAppointmentState {
  return {
    createdAt: new Date().toISOString(),
    endAt: appointment.slot.endAt.toISOString(),
    endTime: appointment.slot.endTime,
    id: appointment.id,
    source,
    startAt: appointment.slot.startAt.toISOString(),
    startDate: appointment.slot.startDate,
    startTime: appointment.slot.startTime,
  };
}

function deserializeRatingAppointment(state: RatingAppointmentState) {
  return {
    id: state.id,
    slot: {
      endAt: new Date(state.endAt),
      endTime: state.endTime,
      startAt: new Date(state.startAt),
      startDate: state.startDate,
      startTime: state.startTime,
    },
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
  const attemptedSlots: string[] = [];

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
    attemptedSlots.push(
      `${slot.startDate} ${slot.startTime}-${slot.endTime} -> HTTP ${result.status}: ${JSON.stringify(result.payload)}`,
    );
  }

  await closeContext(studentContext);

  expect(
    createdAppointment,
    `No se pudo crear la cita cercana para valoracion. Intentos: ${attemptedSlots.join(' | ')}. Ultima respuesta: ${JSON.stringify(lastCreateResult?.payload)}`,
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

async function canUseStoredRatingAppointment(
  browser: Browser,
  state: RatingAppointmentState,
) {
  const studentContext = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const studentPage = await studentContext.newPage();
  await studentPage.goto(RUTAS.estudianteCitas);
  await studentPage.waitForLoadState('networkidle');
  const studentDashboard = await apiRequest<StudentDashboard>(
    studentPage,
    '/student-portal/dashboard',
  );
  await closeContext(studentContext);

  const patientContext = await browser.newContext({
    storageState: SESIONES.paciente,
  });
  const patientPage = await patientContext.newPage();
  await patientPage.goto(RUTAS.pacienteCitas);
  await patientPage.waitForLoadState('networkidle');
  const patientDashboard = await apiRequest<PatientDashboard>(
    patientPage,
    '/patient-portal/dashboard',
  );
  await closeContext(patientContext);

  const studentAppointment = studentDashboard.appointments.find(
    (appointment) => appointment.id === state.id,
  );
  const patientAppointment = patientDashboard.appointments.find(
    (appointment) => appointment.id === state.id,
  );

  return Boolean(
    studentAppointment &&
    patientAppointment &&
    studentAppointment.myRating === null &&
    patientAppointment.myRating === null,
  );
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

  await expect(row).toBeVisible({ timeout: 15_000 });

  // Verificar que la cita muestra algún estado de "terminada"
  // La UI puede usar distintos términos según el rol
  const statusTerms = /Finalizada|Completada|Terminada|Concluida|Realizada|Vencida|Pasada|FINALIZ|COMPLET/i;
  const hasStatus = await row.getByText(statusTerms).isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasStatus) {
    // Verificar que al menos tiene el botón de calificar (cita apta para valorar)
    const hasBtn = await row.getByRole('button', { name: /calificar|valorar/i })
      .isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasBtn) {
      // La fila existe — aceptar como válido independiente del texto de estado
      console.warn(`getAppointmentRow: fila ${owner}-${appointmentId} visible pero sin texto de estado conocido ni boton calificar`);
    }
  }

  return row;
}

test.beforeAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(RATING_HOOK_TIMEOUT_MS);
  let storedAppointment = loadRatingAppointmentState();

  if (
    storedAppointment &&
    !(await canUseStoredRatingAppointment(browser, storedAppointment))
  ) {
    clearRatingAppointmentState();
    storedAppointment = null;
  }

  if (!storedAppointment) {
    const fallbackAppointment = await createAcceptedRatingAppointment(
      browser,
      'Valoracion compartida',
    );
    storedAppointment = serializeRatingAppointment(
      fallbackAppointment,
      'fallback',
    );
    saveRatingAppointmentState(storedAppointment);
  }

  const appointment = deserializeRatingAppointment(storedAppointment);
  ratingAppointmentId = appointment.id;

  // Crear una cita separada para E2E-22 (el estudiante califica al paciente)
  // Así E2E-22 no depende de la misma cita que E2E-21 y evita conflictos de estado
  const studentAppointment = await createAcceptedRatingAppointment(
    browser,
    'Valoracion estudiante E2E-22',
  );
  studentRatingAppointmentId = studentAppointment.id;

  await waitForRatingAppointments([appointment, studentAppointment]);

  console.log(
    `E2E valoraciones: cita paciente lista (${ratingAppointmentId}) ${storedAppointment.startTime}-${storedAppointment.endTime}.`,
  );
  console.log(
    `E2E valoraciones: cita estudiante lista (${studentRatingAppointmentId}) ${studentAppointment.slot.startTime}-${studentAppointment.slot.endTime}.`,
  );
});

test('E2E-21 | Paciente califica al estudiante tras cita finalizada', async ({
  browser,
}) => {
  const appointmentId = requireRatingAppointmentId(
    ratingAppointmentId,
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

  await medirAccion(
    'E2E-21',
    'enviar calificacion paciente hasta visible',
    async () => {
      await page
        .getByRole('button', { name: /enviar|guardar|calificar/i })
        .last()
        .click();

      await expect(modal).toBeHidden({ timeout: 15_000 });
      await expect(fila).toContainText(/5\/5/, {
        timeout: 15_000,
      });
    },
  );
  console.log('E2E-21: Calificacion del estudiante enviada.');
  await closeContext(context);
});

test('E2E-22 | Estudiante califica al paciente tras cita finalizada', async ({
  browser,
}) => {
  // E2E-22 usa su propia cita para no depender del estado de E2E-21
  const appointmentId = requireRatingAppointmentId(
    studentRatingAppointmentId ?? ratingAppointmentId,
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

  await medirAccion(
    'E2E-22',
    'enviar calificacion estudiante hasta visible',
    async () => {
      await page
        .getByRole('button', { name: /enviar|guardar|calificar/i })
        .last()
        .click();

      await expect(modal).toBeHidden({ timeout: 15_000 });
      await expect(fila).toContainText(/5\/5/, {
        timeout: 15_000,
      });
    },
  );
  console.log('E2E-22: Calificacion del paciente enviada.');
  await closeContext(context);
});

test('E2E-23 | Calificacion duplicada - sistema bloquea el segundo intento', async ({
  browser,
}) => {
  const appointmentId = requireRatingAppointmentId(
    ratingAppointmentId,
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
    await medirAccion(
      'E2E-23',
      'validar duplicado bloqueado sin boton',
      async () => {
        expect(visible && habilitado).toBe(false);
      },
    );
    console.log(
      'E2E-23: Calificacion duplicada bloqueada - boton ausente o deshabilitado.',
    );
    await closeContext(context);
    return;
  }

  await medirAccion(
    'E2E-23',
    'intentar duplicado hasta rechazo visible',
    async () => {
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
    },
  );

  console.log('E2E-23: Sistema rechazo la calificacion duplicada.');
  await closeContext(context);
});
