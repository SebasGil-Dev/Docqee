/**
 * GESTION DE CITAS - E2E-13 a E2E-20
 *
 * Flujo principal:
 * estudiante propone cita -> paciente acepta -> ambos la ven en agenda ->
 * estudiante reprograma con mas de 48 horas -> paciente acepta.
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

test.describe.configure({ mode: 'serial' });

const API_BASE_URL =
  process.env.E2E_API_BASE_URL ??
  process.env.API_BASE_URL ??
  'https://docqee-production.up.railway.app';

const PACIENTE_PRUEBA = /fernanda/i;
const RUN_ID = Date.now().toString(36);
const RUN_DAY_OFFSET = 4 + (Math.floor(Date.now() / 1000) % 90);

let mainAppointmentId: string | null = null;

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

function futureDateInput(slot: number) {
  const date = new Date();
  date.setDate(date.getDate() + RUN_DAY_OFFSET + slot);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function slotTimes(slot: number) {
  const startHour = 8 + (slot % 7);
  const endHour = startHour + 1;

  return {
    endTime: `${String(endHour).padStart(2, '0')}:00`,
    startTime: `${String(startHour).padStart(2, '0')}:00`,
  };
}

function requireMainAppointmentId() {
  expect(
    mainAppointmentId,
    'E2E-13 debe crear una cita para que continue el flujo ordenado.',
  ).toBeTruthy();

  return mainAppointmentId!;
}

async function findExistingStudentAppointment(page: Page) {
  const row = page
    .locator('[data-testid^="student-appointment-row-"]')
    .filter({ hasText: PACIENTE_PRUEBA })
    .filter({ hasText: `Cita principal E2E-${RUN_ID}` })
    .filter({ hasText: /Propuesta|Aceptada/i })
    .first();

  if (!(await row.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return null;
  }

  const testId = await row.getAttribute('data-testid');
  const id = testId?.replace('student-appointment-row-', '') ?? null;

  if (!id) {
    return null;
  }

  return {
    id,
    status:
      (await row
        .getByText(/Propuesta|Aceptada/i)
        .first()
        .textContent()) ?? '',
  };
}

function buildAppointmentValues(
  dashboard: StudentDashboard,
  slot: number,
  additionalInfo: string,
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
  const times = slotTimes(slot);

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
    additionalInfo,
    appointmentTypeId: appointmentType!.id,
    endTime: times.endTime,
    requestId: request!.id,
    siteId: site!.siteId,
    startDate: futureDateInput(slot),
    startTime: times.startTime,
    supervisorId: supervisor!.id,
    treatmentIds: [treatment!.treatmentTypeId],
  };
}

async function apiRequest<T>(
  page: Page,
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const result = await page.evaluate(
    async ({ apiBaseUrl, body, method, path }): Promise<ApiResult<T>> => {
      const storageKey = 'docqee.auth-session';
      const rawSession = window.localStorage.getItem(storageKey);
      const session = rawSession ? JSON.parse(rawSession) : null;

      async function performRequest(activeSession: any) {
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

  expect(
    result.ok,
    `La peticion ${options.method ?? 'GET'} ${path} fallo con HTTP ${result.status}: ${JSON.stringify(result.payload)}`,
  ).toBeTruthy();

  return result.payload as T;
}

async function selectDropdownOption(
  page: Page,
  triggerId: string,
  preferredText?: RegExp,
) {
  const trigger = page.locator(`#${triggerId}`);
  await expect(trigger).toBeEnabled({ timeout: 15_000 });
  await trigger.click();

  const options = page.locator(`#${triggerId}-menu [role="option"]`);
  await expect(options.first()).toBeVisible({ timeout: 10_000 });

  const preferredOption = preferredText
    ? options.filter({ hasText: preferredText }).first()
    : null;

  if (
    preferredOption &&
    (await preferredOption.isVisible({ timeout: 1_500 }).catch(() => false))
  ) {
    await preferredOption.click();
    return;
  }

  await options.first().click();
}

async function selectTime(page: Page, triggerId: string, value: string) {
  const [hourText = '0', minuteText = '0'] = value.split(':');
  const hour24 = Number(hourText);
  const minute = Number(minuteText);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  await page.locator(`#${triggerId}`).click();
  const picker = page.locator(`#${triggerId}-picker`);
  await expect(picker).toBeVisible({ timeout: 8_000 });

  await picker.getByRole('button', { exact: true, name: period }).click();
  await picker
    .getByRole('button', { exact: true, name: String(hour12).padStart(2, '0') })
    .first()
    .click();
  await picker
    .getByRole('button', { exact: true, name: String(minute).padStart(2, '0') })
    .first()
    .click();
  await page.keyboard.press('Escape');
}

async function confirmIfVisible(page: Page) {
  const dialog = page.getByRole('dialog').last();

  if (!(await dialog.isVisible({ timeout: 1_500 }).catch(() => false))) {
    return;
  }

  const confirmButton = dialog
    .getByRole('button', { name: /confirmar|aceptar|si, cancelar cita/i })
    .last();

  if (await confirmButton.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await confirmButton.click();
  }
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

async function createAppointmentFromStudentUi(page: Page, slot: number) {
  const times = slotTimes(slot);
  const additionalInfo = `Cita principal E2E-${RUN_ID}`;

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  await expect(
    page.getByRole('heading', { name: 'Citas', exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  const existingAppointment = await findExistingStudentAppointment(page);
  if (existingAppointment) {
    return medirAccion(
      'E2E-13',
      'cita existente reutilizada',
      async () => existingAppointment,
    );
  }

  await page.getByRole('button', { name: /agendar cita/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  await selectDropdownOption(
    page,
    'student-appointment-request',
    PACIENTE_PRUEBA,
  );
  await selectDropdownOption(page, 'student-appointment-site');
  await selectDropdownOption(page, 'student-appointment-type');

  await page.locator('#student-appointment-date').fill(futureDateInput(slot));
  await selectTime(page, 'student-appointment-start-time', times.startTime);
  await selectTime(page, 'student-appointment-end-time', times.endTime);

  await selectDropdownOption(page, 'student-appointment-supervisor');

  const treatment = page
    .locator('[data-testid^="student-appointment-treatment-option-"]')
    .first();
  if (await treatment.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await treatment.click();
  } else {
    const legacyTreatment = dialog
      .getByRole('button')
      .filter({ hasText: /procedimientos|tratamientos orientados/i })
      .first();
    await expect(legacyTreatment).toBeVisible({ timeout: 10_000 });
    await legacyTreatment.click();
  }

  await page
    .locator('#student-appointment-additional-info')
    .fill(additionalInfo);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/student-portal/appointments') &&
      response.request().method() === 'POST' &&
      !response.url().includes('/reschedule'),
  );

  const appointment = await medirAccion(
    'E2E-13',
    'guardar cita hasta API propuesta',
    async () => {
      await page.getByRole('button', { name: /guardar cita/i }).click();

      const createResponse = await createResponsePromise;
      expect(
        createResponse.ok(),
        `El API no creo la cita. Status HTTP: ${createResponse.status()}`,
      ).toBeTruthy();

      const createdAppointment =
        (await createResponse.json()) as StudentAppointment;
      expect(createdAppointment.status).toBe('PROPUESTA');

      await expect(
        page.locator(
          `[data-testid="student-appointment-row-${createdAppointment.id}"]`,
        ),
      ).toContainText(/Propuesta/i, { timeout: 15_000 });

      return createdAppointment;
    },
  );

  return appointment;
}

async function createAcceptedAppointmentViaApi(
  browser: Browser,
  slot: number,
  label: string,
) {
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
  const values = buildAppointmentValues(dashboard, slot, label);
  const appointment = await apiRequest<StudentAppointment>(
    studentPage,
    '/student-portal/appointments',
    { body: values, method: 'POST' },
  );

  await closeContext(studentContext);

  const patientContext = await browser.newContext({
    storageState: SESIONES.paciente,
  });
  const patientPage = await patientContext.newPage();

  await patientPage.goto(RUTAS.pacienteCitas);
  await patientPage.waitForLoadState('networkidle');

  const accepted = await apiRequest<PatientAppointment>(
    patientPage,
    `/patient-portal/appointments/${appointment.id}/status`,
    { body: { status: 'ACEPTADA' }, method: 'PATCH' },
  );

  await closeContext(patientContext);

  expect(accepted.status).toBe('ACEPTADA');
  return appointment.id;
}

test('E2E-13 | Estudiante propone una cita al paciente', async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  const appointment = await createAppointmentFromStudentUi(page, 0);
  mainAppointmentId = appointment.id;

  console.log(`E2E-13: Cita propuesta creada (${appointment.id}).`);
  await context.close();
});

test('E2E-14 | Paciente acepta la cita propuesta', async ({ browser }) => {
  const appointmentId = requireMainAppointmentId();
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  const row = page.locator(
    `[data-testid="patient-appointment-row-${appointmentId}"]`,
  );
  await expect(row).toBeVisible({ timeout: 15_000 });

  if (
    await row
      .getByText(/Aceptada/i)
      .first()
      .isVisible({ timeout: 1_500 })
      .catch(() => false)
  ) {
    await medirAccion('E2E-14', 'validar cita ya aceptada', async () => {
      await expect(row).toContainText(/Aceptada/i, { timeout: 15_000 });
    });
    console.log('E2E-14: La cita ya estaba aceptada.');
    await context.close();
    return;
  }

  await expect(row).toContainText(/Propuesta/i, { timeout: 15_000 });

  const acceptResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(`/patient-portal/appointments/${appointmentId}/status`) &&
      response.request().method() === 'PATCH',
  );

  const appointment = await medirAccion(
    'E2E-14',
    'aceptar cita hasta API aceptada',
    async () => {
      await row.getByRole('button', { name: /aceptar/i }).click();
      await confirmIfVisible(page);

      const acceptResponse = await acceptResponsePromise;
      expect(
        acceptResponse.ok(),
        `El API no acepto la cita. Status HTTP: ${acceptResponse.status()}`,
      ).toBeTruthy();

      return (await acceptResponse.json()) as PatientAppointment;
    },
  );
  expect(appointment.status).toBe('ACEPTADA');
  await medirAccion('E2E-14', 'cita aceptada visible en UI', async () => {
    await expect(row).toContainText(/Aceptada/i, { timeout: 15_000 });
  });

  console.log('E2E-14: El paciente acepto la cita.');
  await context.close();
});

test('E2E-15 | La cita aceptada queda visible para paciente y estudiante', async ({
  browser,
}) => {
  const appointmentId = requireMainAppointmentId();

  const patientContext = await browser.newContext({
    storageState: SESIONES.paciente,
  });
  const patientPage = await patientContext.newPage();
  await patientPage.goto(RUTAS.pacienteCitas);
  await patientPage.waitForLoadState('networkidle');
  await medirAccion('E2E-15', 'cita visible para paciente', async () => {
    await expect(
      patientPage.locator(
        `[data-testid="patient-appointment-row-${appointmentId}"]`,
      ),
    ).toContainText(/Aceptada/i, { timeout: 15_000 });
  });
  await patientContext.close();

  const studentContext = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const studentPage = await studentContext.newPage();
  await studentPage.goto(RUTAS.estudianteCitas);
  await studentPage.waitForLoadState('networkidle');
  await medirAccion('E2E-15', 'cita visible para estudiante', async () => {
    await expect(
      studentPage.locator(
        `[data-testid="student-appointment-row-${appointmentId}"]`,
      ),
    ).toContainText(/Aceptada/i, { timeout: 15_000 });
  });
  await studentContext.close();

  console.log('E2E-15: La cita aceptada aparece para ambos usuarios.');
});

test('E2E-16 | Estudiante solicita reprogramacion con mas de 48 horas', async ({
  browser,
}) => {
  const appointmentId = requireMainAppointmentId();
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();
  const times = slotTimes(3);

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  const row = page.locator(
    `[data-testid="student-appointment-row-${appointmentId}"]`,
  );
  await expect(row).toContainText(/Aceptada/i, { timeout: 15_000 });
  await row.getByRole('button', { name: /reprogramar/i }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  await page.locator('#student-appointment-date').fill(futureDateInput(3));
  await selectTime(page, 'student-appointment-start-time', times.startTime);
  await selectTime(page, 'student-appointment-end-time', times.endTime);

  const rescheduleResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(`/student-portal/appointments/${appointmentId}/reschedule`) &&
      response.request().method() === 'POST',
  );

  const appointment = await medirAccion(
    'E2E-16',
    'enviar reprogramacion hasta API pendiente',
    async () => {
      await page
        .getByRole('button', { name: /enviar reprogramacion/i })
        .click();

      const rescheduleResponse = await rescheduleResponsePromise;
      expect(
        rescheduleResponse.ok(),
        `El API no solicito la reprogramacion. Status HTTP: ${rescheduleResponse.status()}`,
      ).toBeTruthy();

      return (await rescheduleResponse.json()) as StudentAppointment;
    },
  );
  expect(appointment.status).toBe('REPROGRAMACION_PENDIENTE');
  await medirAccion('E2E-16', 'reprogramacion visible en UI', async () => {
    await expect(row).toContainText(/Reprogramacion/i, { timeout: 15_000 });
  });

  console.log('E2E-16: Reprogramacion enviada al paciente.');
  await context.close();
});

test('E2E-17 | Paciente acepta la reprogramacion', async ({ browser }) => {
  const appointmentId = requireMainAppointmentId();
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  const row = page.locator(
    `[data-testid="patient-appointment-row-${appointmentId}"]`,
  );
  await expect(row).toContainText(/Reprogramacion propuesta|Propuesta/i, {
    timeout: 15_000,
  });

  const acceptResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(`/patient-portal/appointments/${appointmentId}/status`) &&
      response.request().method() === 'PATCH',
  );

  const appointment = await medirAccion(
    'E2E-17',
    'aceptar reprogramacion hasta API aceptada',
    async () => {
      await row.getByRole('button', { name: /aceptar/i }).click();
      await confirmIfVisible(page);

      const acceptResponse = await acceptResponsePromise;
      expect(
        acceptResponse.ok(),
        `El API no acepto la reprogramacion. Status HTTP: ${acceptResponse.status()}`,
      ).toBeTruthy();

      return (await acceptResponse.json()) as PatientAppointment;
    },
  );
  expect(appointment.status).toBe('ACEPTADA');
  await medirAccion(
    'E2E-17',
    'reprogramacion aceptada visible en UI',
    async () => {
      await expect(row).toContainText(/Aceptada/i, { timeout: 15_000 });
    },
  );

  console.log('E2E-17: Reprogramacion aceptada por el paciente.');
  await context.close();
});

test('E2E-18 | Paciente y estudiante pueden cancelar citas aceptadas con mas de 48 horas', async ({
  browser,
}) => {
  test.setTimeout(120_000);

  const patientCancelId = await createAcceptedAppointmentViaApi(
    browser,
    10,
    `Cancelacion paciente E2E-${RUN_ID}`,
  );
  const studentCancelId = await createAcceptedAppointmentViaApi(
    browser,
    14,
    `Cancelacion estudiante E2E-${RUN_ID}`,
  );

  const patientContext = await browser.newContext({
    storageState: SESIONES.paciente,
  });
  const patientPage = await patientContext.newPage();
  await patientPage.goto(RUTAS.pacienteCitas);
  await patientPage.waitForLoadState('networkidle');

  const patientRow = patientPage.locator(
    `[data-testid="patient-appointment-row-${patientCancelId}"]`,
  );
  await expect(patientRow).toContainText(/Aceptada/i, { timeout: 15_000 });

  const patientCancelResponsePromise = patientPage.waitForResponse(
    (response) =>
      response
        .url()
        .includes(`/patient-portal/appointments/${patientCancelId}/status`) &&
      response.request().method() === 'PATCH',
  );
  const patientCancelled = await medirAccion(
    'E2E-18',
    'paciente cancela cita hasta API cancelada',
    async () => {
      await patientRow.getByRole('button', { name: /cancelar/i }).click();
      await confirmIfVisible(patientPage);

      const patientCancelResponse = await patientCancelResponsePromise;
      expect(patientCancelResponse.ok()).toBeTruthy();
      return (await patientCancelResponse.json()) as PatientAppointment;
    },
  );
  expect(patientCancelled.status).toBe('CANCELADA');
  await patientContext.close();

  const studentContext = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const studentPage = await studentContext.newPage();
  await studentPage.goto(RUTAS.estudianteCitas);
  await studentPage.waitForLoadState('networkidle');

  const studentRow = studentPage.locator(
    `[data-testid="student-appointment-row-${studentCancelId}"]`,
  );
  await expect(studentRow).toContainText(/Aceptada/i, { timeout: 15_000 });

  const studentCancelResponsePromise = studentPage.waitForResponse(
    (response) =>
      response
        .url()
        .includes(`/student-portal/appointments/${studentCancelId}/status`) &&
      response.request().method() === 'PATCH',
  );
  const studentCancelled = await medirAccion(
    'E2E-18',
    'estudiante cancela cita hasta API cancelada',
    async () => {
      await studentRow.getByRole('button', { name: /cancelar/i }).click();
      await confirmIfVisible(studentPage);

      const studentCancelResponse = await studentCancelResponsePromise;
      expect(studentCancelResponse.ok()).toBeTruthy();
      return (await studentCancelResponse.json()) as StudentAppointment;
    },
  );
  expect(studentCancelled.status).toBe('CANCELADA');
  await studentContext.close();

  console.log('E2E-18: Cancelacion validada desde paciente y estudiante.');
});

test('E2E-19 | Cita futura no se puede finalizar ni valorar', async ({
  browser,
}) => {
  const appointmentId = requireMainAppointmentId();
  const context = await browser.newContext({
    storageState: SESIONES.estudiante,
  });
  const page = await context.newPage();

  await page.goto(RUTAS.estudianteCitas);
  await page.waitForLoadState('networkidle');

  const row = page.locator(
    `[data-testid="student-appointment-row-${appointmentId}"]`,
  );
  await medirAccion(
    'E2E-19',
    'validar cita futura sin finalizar ni valorar',
    async () => {
      await expect(row).toContainText(/Aceptada/i, { timeout: 15_000 });
      await expect(
        row.getByRole('button', { name: /finalizar|calificar/i }),
      ).toHaveCount(0);
    },
  );

  console.log('E2E-19: Cita futura sin acciones de finalizacion o valoracion.');
  await context.close();
});

test('E2E-20 | Valoracion queda reservada para citas finalizadas', async ({
  browser,
}) => {
  const appointmentId = requireMainAppointmentId();
  const context = await browser.newContext({ storageState: SESIONES.paciente });
  const page = await context.newPage();

  await page.goto(RUTAS.pacienteCitas);
  await page.waitForLoadState('networkidle');

  const row = page.locator(
    `[data-testid="patient-appointment-row-${appointmentId}"]`,
  );
  await medirAccion(
    'E2E-20',
    'validar cita futura sin valoracion',
    async () => {
      await expect(row).toContainText(/Aceptada/i, { timeout: 15_000 });
      await expect(row.getByRole('button', { name: /valorar/i })).toHaveCount(
        0,
      );
    },
  );

  console.log(
    'E2E-20: Una cita aceptada y futura no muestra valoracion hasta finalizar.',
  );
  await context.close();
});
