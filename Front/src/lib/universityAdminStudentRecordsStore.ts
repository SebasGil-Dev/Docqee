import { useEffect, useSyncExternalStore } from 'react';

import type {
  UniversityStudent,
  UniversityStudentCredential,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import { resetUniversityAdminOverviewState } from '@/lib/universityAdminOverviewStore';
import {
  deleteUniversityStudentCredential,
  editUniversityStudentCredentialEmail,
  listUniversityStudentCredentials,
  listUniversityStudents,
  resendUniversityStudentCredential,
  sendAllUniversityStudentCredentials,
  sendUniversityStudentCredential,
  toggleUniversityStudentStatus,
} from '@/lib/universityAdminApi';

type PersistedUniversityAdminStudentRecordsCache = {
  credentials: UniversityStudentCredential[];
  students: UniversityStudent[];
  updatedAt: number;
  userId: number;
};

type UniversityAdminStudentRecordsStoreState = {
  credentials: UniversityStudentCredential[];
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
  shouldRefresh: boolean;
  students: UniversityStudent[];
};

type UniversityAdminStudentRecordsActions = {
  deleteStudentCredential: (credentialId: string) => Promise<boolean>;
  editStudentCredentialEmail: (
    credentialId: string,
    email: string,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  resendStudentCredential: (credentialId: string) => Promise<string | null>;
  sendAllStudentCredentials: () => Promise<number>;
  sendStudentCredential: (credentialId: string) => Promise<string | null>;
  toggleStudentStatus: (
    studentId: string,
  ) => Promise<UniversityStudent['status'] | null>;
};

type UseUniversityAdminStudentRecordsStoreOptions = {
  autoLoad?: boolean;
};

const STUDENT_RECORDS_CACHE_STORAGE_KEY =
  'docqee.university-admin.student-records-cache';
const STUDENT_RECORDS_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const STUDENT_STATUS_TOGGLE_MIN_LOCK_MS = 650;
const listeners = new Set<() => void>();
const pendingStudentStatusUpdates = new Set<string>();
let studentStatusMutationVersion = 0;

function createMockState(): UniversityAdminStudentRecordsStoreState {
  return {
    credentials: [
      {
        deliveryStatus: 'generated',
        id: 'student-cred-1',
        lastSentAt: null,
        sentCount: 0,
        studentId: 'student-1',
      },
      {
        deliveryStatus: 'sent',
        id: 'student-cred-2',
        lastSentAt: '2026-04-03T16:05:00.000Z',
        sentCount: 1,
        studentId: 'student-2',
      },
      {
        deliveryStatus: 'generated',
        id: 'student-cred-3',
        lastSentAt: null,
        sentCount: 0,
        studentId: 'student-3',
      },
    ],
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
    students: [
      {
        createdAt: '2026-04-01T09:30:00.000Z',
        credentialId: 'student-cred-1',
        documentNumber: '1092384122',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        email: 'valentina.rios@clinicadelnorte.edu.co',
        firstName: 'Valentina',
        id: 'student-1',
        lastName: 'Rios',
        phone: '3005550101',
        semester: '8',
        status: 'active',
      },
      {
        createdAt: '2026-03-29T14:45:00.000Z',
        credentialId: 'student-cred-2',
        documentNumber: '1012456678',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        email: 'tomas.herrera@clinicadelnorte.edu.co',
        firstName: 'Tomas',
        id: 'student-2',
        lastName: 'Herrera',
        phone: '3005550102',
        semester: '6',
        status: 'active',
      },
      {
        createdAt: '2026-03-27T10:15:00.000Z',
        credentialId: 'student-cred-3',
        documentNumber: '1003478912',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        email: 'camila.vega@clinicadelnorte.edu.co',
        firstName: 'Camila',
        id: 'student-3',
        lastName: 'Vega',
        phone: '3005550103',
        semester: '10',
        status: 'inactive',
      },
      {
        createdAt: '2026-03-22T08:05:00.000Z',
        credentialId: null,
        documentNumber: '1021987345',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        email: 'nicolas.pardo@clinicadelnorte.edu.co',
        firstName: 'Nicolas',
        id: 'student-4',
        lastName: 'Pardo',
        phone: '3005550104',
        semester: '4',
        status: 'active',
      },
    ],
  };
}

function createEmptyRuntimeState(): UniversityAdminStudentRecordsStoreState {
  return {
    credentials: [],
    errorMessage: null,
    isLoading: false,
    isReady: false,
    shouldRefresh: false,
    students: [],
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function readSessionStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isUniversityStudent(value: unknown): value is UniversityStudent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityStudent>;

  return (
    typeof candidate.createdAt === 'string' &&
    (candidate.credentialId === null || typeof candidate.credentialId === 'string') &&
    typeof candidate.documentNumber === 'string' &&
    typeof candidate.documentTypeCode === 'string' &&
    typeof candidate.documentTypeId === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.lastName === 'string' &&
    typeof candidate.phone === 'string' &&
    typeof candidate.semester === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function isUniversityStudentCredential(
  value: unknown,
): value is UniversityStudentCredential {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityStudentCredential>;

  return (
    (candidate.deliveryStatus === 'generated' ||
      candidate.deliveryStatus === 'sent') &&
    typeof candidate.id === 'string' &&
    (candidate.lastSentAt === null || typeof candidate.lastSentAt === 'string') &&
    typeof candidate.sentCount === 'number' &&
    typeof candidate.studentId === 'string'
  );
}

function persistStudentRecordsCache(
  students: UniversityStudent[],
  credentials: UniversityStudentCredential[],
) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return;
  }

  const payload: PersistedUniversityAdminStudentRecordsCache = {
    credentials,
    students,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(
    STUDENT_RECORDS_CACHE_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

function clearPersistedStudentRecordsCache() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(STUDENT_RECORDS_CACHE_STORAGE_KEY);
}

function readPersistedStudentRecordsCache() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return null;
  }

  const rawCache = storage.getItem(STUDENT_RECORDS_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache =
      JSON.parse(rawCache) as Partial<PersistedUniversityAdminStudentRecordsCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > STUDENT_RECORDS_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      !Array.isArray(parsedCache.students) ||
      !Array.isArray(parsedCache.credentials)
    ) {
      storage.removeItem(STUDENT_RECORDS_CACHE_STORAGE_KEY);
      return null;
    }

    return {
      credentials: parsedCache.credentials.filter(isUniversityStudentCredential),
      students: parsedCache.students.filter(isUniversityStudent),
    };
  } catch {
    storage.removeItem(STUDENT_RECORDS_CACHE_STORAGE_KEY);
    return null;
  }
}

function createRuntimeInitialState(): UniversityAdminStudentRecordsStoreState {
  const cachedRecords = readPersistedStudentRecordsCache();

  if (!cachedRecords) {
    return createEmptyRuntimeState();
  }

  return {
    credentials: cachedRecords.credentials,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: true,
    students: cachedRecords.students,
  };
}

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let runtimeLoadPromise: Promise<UniversityAdminStudentRecordsStoreState> | null =
  null;

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function updateState(nextState: UniversityAdminStudentRecordsStoreState) {
  state = nextState;
  emitChange();
}

function patchState(
  partialState: Partial<UniversityAdminStudentRecordsStoreState>,
) {
  updateState({
    ...state,
    ...partialState,
  });
}

function setStudentRecords(
  students: UniversityStudent[],
  credentials: UniversityStudentCredential[],
  options?: {
    errorMessage?: string | null;
    isLoading?: boolean;
    isReady?: boolean;
    shouldRefresh?: boolean;
  },
) {
  persistStudentRecordsCache(students, credentials);
  updateState({
    ...state,
    credentials,
    errorMessage: options?.errorMessage ?? null,
    isLoading: options?.isLoading ?? false,
    isReady: options?.isReady ?? true,
    shouldRefresh: options?.shouldRefresh ?? false,
    students,
  });
}

function preserveCurrentStudentStatuses(
  students: UniversityStudent[],
  currentStudents: UniversityStudent[],
) {
  const currentStatusByStudentId = new Map(
    currentStudents.map((student) => [student.id, student.status]),
  );

  return students.map((student) => {
    const currentStatus = currentStatusByStudentId.get(student.id);

    return currentStatus ? { ...student, status: currentStatus } : student;
  });
}

async function waitForMinimumToggleLock(startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = STUDENT_STATUS_TOGGLE_MIN_LOCK_MS - elapsedMs;

  if (remainingMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remainingMs);
  });
}

function markCredentialAsSent(credentialId: string) {
  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    return;
  }

  const nextCredentials: UniversityStudentCredential[] = state.credentials.map((item) =>
    item.id === credentialId
      ? {
          ...item,
          deliveryStatus: 'sent' as const,
          lastSentAt: new Date().toISOString(),
          sentCount: item.sentCount + 1,
        }
      : item,
  );
  const nextStudents: UniversityStudent[] = state.students.map((student) =>
    student.id === credential.studentId
      ? {
          ...student,
          status: 'active' as const,
        }
      : student,
  );

  setStudentRecords(nextStudents, nextCredentials);
}

function markAllCredentialsAsSent() {
  const generatedCredentials = state.credentials.filter(
    (credential) => credential.deliveryStatus === 'generated',
  );

  if (generatedCredentials.length === 0) {
    return 0;
  }

  const nextCredentials: UniversityStudentCredential[] = state.credentials.map((credential) =>
    credential.deliveryStatus === 'generated'
      ? {
          ...credential,
          deliveryStatus: 'sent' as const,
          lastSentAt: new Date().toISOString(),
          sentCount: credential.sentCount + 1,
        }
      : credential,
  );
  const nextStudents: UniversityStudent[] = state.students.map((student) =>
    generatedCredentials.some((credential) => credential.studentId === student.id)
      ? {
          ...student,
          status: 'active' as const,
        }
      : student,
  );

  setStudentRecords(nextStudents, nextCredentials);
  return generatedCredentials.length;
}

function removeStudentCredential(credentialId: string) {
  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    return;
  }

  const nextCredentials = state.credentials.filter((item) => item.id !== credentialId);
  const nextStudents = state.students.map((student) =>
    student.id === credential.studentId
      ? {
          ...student,
          credentialId: null,
        }
      : student,
  );

  setStudentRecords(nextStudents, nextCredentials);
}

async function loadRuntimeState(forceRefresh = false) {
  if (IS_TEST_MODE) {
    return state;
  }

  if (state.isReady && !state.shouldRefresh && !forceRefresh) {
    return state;
  }

  if (runtimeLoadPromise) {
    return runtimeLoadPromise;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });
  const requestStudentStatusMutationVersion = studentStatusMutationVersion;

  runtimeLoadPromise = Promise.all([
    listUniversityStudents(),
    listUniversityStudentCredentials(),
  ])
    .then(([students, credentials]) => {
      const syncedStudents =
        requestStudentStatusMutationVersion === studentStatusMutationVersion
          ? students
          : preserveCurrentStudentStatuses(students, state.students);

      setStudentRecords(syncedStudents, credentials, {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      });

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(
          error,
          'No pudimos cargar los estudiantes y credenciales.',
        ),
        isLoading: false,
        shouldRefresh: false,
      });

      return state;
    })
    .finally(() => {
      runtimeLoadPromise = null;
    });

  return runtimeLoadPromise;
}

export async function refreshUniversityAdminStudentRecordsState() {
  await loadRuntimeState(true);
}

export function syncUniversityAdminStudentRecordsState(
  students: UniversityStudent[],
  credentials: UniversityStudentCredential[],
) {
  setStudentRecords(students, credentials, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });
}

export function prependUniversityAdminStudentRecord(student: UniversityStudent) {
  const nextStudents = [
    student,
    ...state.students.filter((currentStudent) => currentStudent.id !== student.id),
  ];
  const nextCredentials: UniversityStudentCredential[] = student.credentialId
    ? [
        {
          deliveryStatus: 'generated' as const,
          id: student.credentialId,
          lastSentAt: null,
          sentCount: 0,
          studentId: student.id,
        },
        ...state.credentials.filter(
          (credential) => credential.id !== student.credentialId,
        ),
      ]
    : state.credentials;

  setStudentRecords(nextStudents, nextCredentials, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });
}

async function toggleStudentStatus(studentId: string) {
  const startedAt = Date.now();

  if (pendingStudentStatusUpdates.has(studentId)) {
    return null;
  }

  if (IS_TEST_MODE) {
    const currentStudent = state.students.find((student) => student.id === studentId);
    const currentCredential = state.credentials.find(
      (credential) => credential.studentId === studentId,
    );

    if (!currentStudent || currentCredential?.deliveryStatus === 'generated') {
      return null;
    }

    const nextStatus: UniversityStudent['status'] =
      currentStudent.status === 'active' ? 'inactive' : 'active';
    const nextStudents = state.students.map((student) =>
      student.id === studentId ? { ...student, status: nextStatus } : student,
    );

    setStudentRecords(nextStudents, state.credentials);
    await waitForMinimumToggleLock(startedAt);
    return nextStatus;
  }

  const currentCredential = state.credentials.find(
    (credential) => credential.studentId === studentId,
  );
  const currentStudent = state.students.find((student) => student.id === studentId);

  if (!currentStudent || currentCredential?.deliveryStatus === 'generated') {
    return null;
  }

  pendingStudentStatusUpdates.add(studentId);
  studentStatusMutationVersion += 1;

  const previousStatus = currentStudent.status;
  const optimisticStatus: UniversityStudent['status'] =
    previousStatus === 'active' ? 'inactive' : 'active';
  const optimisticStudents = state.students.map((student) =>
    student.id === studentId ? { ...student, status: optimisticStatus } : student,
  );

  setStudentRecords(optimisticStudents, state.credentials, {
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });

  try {
    const result = await toggleUniversityStudentStatus(studentId);

    resetUniversityAdminOverviewState();

    if (result.status !== optimisticStatus) {
      const syncedStudents = state.students.map((student) =>
        student.id === result.studentId
          ? { ...student, status: result.status }
          : student,
      );

      setStudentRecords(syncedStudents, state.credentials, {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      });
    }

    return result.status;
  } catch (error) {
    const revertedStudents = state.students.map((student) =>
      student.id === studentId ? { ...student, status: previousStatus } : student,
    );

    setStudentRecords(revertedStudents, state.credentials, {
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el estado del estudiante.',
      ),
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
    });
    return null;
  } finally {
    await waitForMinimumToggleLock(startedAt);
    pendingStudentStatusUpdates.delete(studentId);
  }
}

async function editStudentCredentialEmail(credentialId: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (IS_TEST_MODE) {
    const credential = state.credentials.find((item) => item.id === credentialId);

    if (!credential) {
      return false;
    }

    const nextStudents = state.students.map((student) =>
      student.id === credential.studentId
        ? { ...student, email: normalizedEmail }
        : student,
    );

    setStudentRecords(nextStudents, state.credentials);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await editUniversityStudentCredentialEmail(credentialId, normalizedEmail);
    const credential = state.credentials.find((item) => item.id === credentialId);
    const nextStudents = state.students.map((student) =>
      student.id === credential?.studentId
        ? { ...student, email: normalizedEmail }
        : student,
    );

    setStudentRecords(nextStudents, state.credentials, {
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el correo del estudiante.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function sendStudentCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    markCredentialAsSent(credentialId);
    return 'TempStudent123!';
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await sendUniversityStudentCredential(credentialId);

    await loadRuntimeState(true);
    resetUniversityAdminOverviewState();
    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos enviar la credencial del estudiante.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function resendStudentCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    markCredentialAsSent(credentialId);
    return 'TempStudent123!';
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await resendUniversityStudentCredential(credentialId);

    await loadRuntimeState(true);
    resetUniversityAdminOverviewState();
    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos reenviar la credencial del estudiante.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function sendAllStudentCredentials() {
  if (IS_TEST_MODE) {
    return markAllCredentialsAsSent();
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await sendAllUniversityStudentCredentials();
    markAllCredentialsAsSent();
    resetUniversityAdminOverviewState();
    return result.sentCount;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos enviar las credenciales pendientes.',
      ),
      isLoading: false,
    });
    return 0;
  }
}

async function deleteStudentCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    removeStudentCredential(credentialId);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await deleteUniversityStudentCredential(credentialId);

    await loadRuntimeState(true);
    resetUniversityAdminOverviewState();
    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos eliminar la credencial del estudiante.',
      ),
      isLoading: false,
    });
    return false;
  }
}

export function resetUniversityAdminStudentRecordsState() {
  clearPersistedStudentRecordsCache();
  state = IS_TEST_MODE ? createMockState() : createEmptyRuntimeState();
  runtimeLoadPromise = null;
  emitChange();
}

export function useUniversityAdminStudentRecordsStore(
  options: UseUniversityAdminStudentRecordsStoreOptions = {},
) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const shouldAutoLoad = options.autoLoad ?? true;

  useEffect(() => {
    if (
      !shouldAutoLoad ||
      IS_TEST_MODE ||
      snapshot.isLoading ||
      (snapshot.isReady && !snapshot.shouldRefresh)
    ) {
      return;
    }

    void loadRuntimeState();
  }, [
    shouldAutoLoad,
    snapshot.isLoading,
    snapshot.isReady,
    snapshot.shouldRefresh,
  ]);

  const actions: UniversityAdminStudentRecordsActions = {
    deleteStudentCredential,
    editStudentCredentialEmail,
    refresh: refreshUniversityAdminStudentRecordsState,
    resendStudentCredential,
    sendAllStudentCredentials,
    sendStudentCredential,
    toggleStudentStatus,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
