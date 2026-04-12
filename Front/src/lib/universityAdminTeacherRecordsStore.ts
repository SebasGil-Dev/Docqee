import { useEffect, useSyncExternalStore } from 'react';

import type { UniversityTeacher } from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import { resetUniversityAdminOverviewState } from '@/lib/universityAdminOverviewStore';
import {
  listUniversityTeachers,
  toggleUniversityTeacherStatus,
} from '@/lib/universityAdminApi';

type PersistedUniversityAdminTeacherRecordsCache = {
  teachers: UniversityTeacher[];
  updatedAt: number;
  userId: number;
};

type UniversityAdminTeacherRecordsStoreState = {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
  shouldRefresh: boolean;
  teachers: UniversityTeacher[];
};

type UniversityAdminTeacherRecordsActions = {
  refresh: () => Promise<void>;
  toggleTeacherStatus: (
    teacherId: string,
  ) => Promise<UniversityTeacher['status'] | null>;
};

type UseUniversityAdminTeacherRecordsStoreOptions = {
  autoLoad?: boolean;
};

const TEACHER_RECORDS_CACHE_STORAGE_KEY =
  'docqee.university-admin.teacher-records-cache';
const TEACHER_RECORDS_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const TEACHER_STATUS_TOGGLE_MIN_LOCK_MS = 650;
const listeners = new Set<() => void>();
const pendingTeacherStatusUpdates = new Set<string>();
let teacherStatusMutationVersion = 0;

function createMockState(): UniversityAdminTeacherRecordsStoreState {
  return {
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
    teachers: [
      {
        createdAt: '2026-03-18T11:10:00.000Z',
        documentNumber: '80124590',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        firstName: 'Mariana',
        id: 'teacher-1',
        lastName: 'Beltran',
        status: 'active',
      },
      {
        createdAt: '2026-03-12T15:40:00.000Z',
        documentNumber: '80245671',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        firstName: 'Andres',
        id: 'teacher-2',
        lastName: 'Villamizar',
        status: 'active',
      },
      {
        createdAt: '2026-03-09T13:00:00.000Z',
        documentNumber: '1030021456',
        documentTypeCode: 'CC',
        documentTypeId: 'document-cc',
        firstName: 'Laura',
        id: 'teacher-3',
        lastName: 'Martinez',
        status: 'inactive',
      },
    ],
  };
}

function createEmptyRuntimeState(): UniversityAdminTeacherRecordsStoreState {
  return {
    errorMessage: null,
    isLoading: false,
    isReady: false,
    shouldRefresh: false,
    teachers: [],
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

function isUniversityTeacher(value: unknown): value is UniversityTeacher {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityTeacher>;

  return (
    typeof candidate.createdAt === 'string' &&
    typeof candidate.documentNumber === 'string' &&
    typeof candidate.documentTypeCode === 'string' &&
    typeof candidate.documentTypeId === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.lastName === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function persistTeacherRecordsCache(teachers: UniversityTeacher[]) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return;
  }

  const payload: PersistedUniversityAdminTeacherRecordsCache = {
    teachers,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(
    TEACHER_RECORDS_CACHE_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

function clearPersistedTeacherRecordsCache() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(TEACHER_RECORDS_CACHE_STORAGE_KEY);
}

function readPersistedTeacherRecordsCache() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return null;
  }

  const rawCache = storage.getItem(TEACHER_RECORDS_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache =
      JSON.parse(rawCache) as Partial<PersistedUniversityAdminTeacherRecordsCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > TEACHER_RECORDS_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      !Array.isArray(parsedCache.teachers)
    ) {
      storage.removeItem(TEACHER_RECORDS_CACHE_STORAGE_KEY);
      return null;
    }

    return parsedCache.teachers.filter(isUniversityTeacher);
  } catch {
    storage.removeItem(TEACHER_RECORDS_CACHE_STORAGE_KEY);
    return null;
  }
}

function createRuntimeInitialState(): UniversityAdminTeacherRecordsStoreState {
  const cachedTeachers = readPersistedTeacherRecordsCache();

  if (!cachedTeachers) {
    return createEmptyRuntimeState();
  }

  return {
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: true,
    teachers: cachedTeachers,
  };
}

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let runtimeLoadPromise: Promise<UniversityAdminTeacherRecordsStoreState> | null =
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

function updateState(nextState: UniversityAdminTeacherRecordsStoreState) {
  state = nextState;
  emitChange();
}

function patchState(
  partialState: Partial<UniversityAdminTeacherRecordsStoreState>,
) {
  updateState({
    ...state,
    ...partialState,
  });
}

function setTeachers(
  teachers: UniversityTeacher[],
  options?: {
    errorMessage?: string | null;
    isLoading?: boolean;
    isReady?: boolean;
    shouldRefresh?: boolean;
  },
) {
  persistTeacherRecordsCache(teachers);
  updateState({
    ...state,
    errorMessage: options?.errorMessage ?? null,
    isLoading: options?.isLoading ?? false,
    isReady: options?.isReady ?? true,
    shouldRefresh: options?.shouldRefresh ?? false,
    teachers,
  });
}

function preserveCurrentTeacherStatuses(
  teachers: UniversityTeacher[],
  currentTeachers: UniversityTeacher[],
) {
  const currentStatusByTeacherId = new Map(
    currentTeachers.map((teacher) => [teacher.id, teacher.status]),
  );

  return teachers.map((teacher) => {
    const currentStatus = currentStatusByTeacherId.get(teacher.id);

    return currentStatus ? { ...teacher, status: currentStatus } : teacher;
  });
}

async function waitForMinimumToggleLock(startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = TEACHER_STATUS_TOGGLE_MIN_LOCK_MS - elapsedMs;

  if (remainingMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remainingMs);
  });
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
  const requestTeacherStatusMutationVersion = teacherStatusMutationVersion;

  runtimeLoadPromise = listUniversityTeachers()
    .then((teachers) => {
      const syncedTeachers =
        requestTeacherStatusMutationVersion === teacherStatusMutationVersion
          ? teachers
          : preserveCurrentTeacherStatuses(teachers, state.teachers);

      setTeachers(syncedTeachers, {
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
          'No pudimos cargar los docentes.',
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

export async function refreshUniversityAdminTeacherRecordsState() {
  await loadRuntimeState(true);
}

export function syncUniversityAdminTeacherRecordsState(
  teachers: UniversityTeacher[],
) {
  setTeachers(teachers, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });
}

export function prependUniversityAdminTeacherRecord(teacher: UniversityTeacher) {
  const nextTeachers = [
    teacher,
    ...state.teachers.filter((currentTeacher) => currentTeacher.id !== teacher.id),
  ];

  setTeachers(nextTeachers, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });
}

async function toggleTeacherStatus(teacherId: string) {
  const startedAt = Date.now();

  if (pendingTeacherStatusUpdates.has(teacherId)) {
    return null;
  }

  if (IS_TEST_MODE) {
    const currentTeacher = state.teachers.find((teacher) => teacher.id === teacherId);

    if (!currentTeacher) {
      return null;
    }

    const nextStatus: UniversityTeacher['status'] =
      currentTeacher.status === 'active' ? 'inactive' : 'active';
    const nextTeachers = state.teachers.map((teacher) =>
      teacher.id === teacherId ? { ...teacher, status: nextStatus } : teacher,
    );

    setTeachers(nextTeachers);
    await waitForMinimumToggleLock(startedAt);
    return nextStatus;
  }

  const currentTeacher = state.teachers.find((teacher) => teacher.id === teacherId);

  if (!currentTeacher) {
    return null;
  }

  pendingTeacherStatusUpdates.add(teacherId);
  teacherStatusMutationVersion += 1;

  const previousStatus = currentTeacher.status;
  const optimisticStatus: UniversityTeacher['status'] =
    previousStatus === 'active' ? 'inactive' : 'active';
  const optimisticTeachers = state.teachers.map((teacher) =>
    teacher.id === teacherId ? { ...teacher, status: optimisticStatus } : teacher,
  );

  setTeachers(optimisticTeachers, {
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });

  try {
    const result = await toggleUniversityTeacherStatus(teacherId);

    resetUniversityAdminOverviewState();

    if (result.status !== optimisticStatus) {
      const syncedTeachers = state.teachers.map((teacher) =>
        teacher.id === result.teacherId
          ? { ...teacher, status: result.status }
          : teacher,
      );

      setTeachers(syncedTeachers, {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      });
    }

    return result.status;
  } catch (error) {
    const revertedTeachers = state.teachers.map((teacher) =>
      teacher.id === teacherId ? { ...teacher, status: previousStatus } : teacher,
    );

    setTeachers(revertedTeachers, {
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el estado del docente.',
      ),
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
    });
    return null;
  } finally {
    await waitForMinimumToggleLock(startedAt);
    pendingTeacherStatusUpdates.delete(teacherId);
  }
}

export function resetUniversityAdminTeacherRecordsState() {
  clearPersistedTeacherRecordsCache();
  state = IS_TEST_MODE ? createMockState() : createEmptyRuntimeState();
  runtimeLoadPromise = null;
  emitChange();
}

export function useUniversityAdminTeacherRecordsStore(
  options: UseUniversityAdminTeacherRecordsStoreOptions = {},
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

  const actions: UniversityAdminTeacherRecordsActions = {
    refresh: refreshUniversityAdminTeacherRecordsState,
    toggleTeacherStatus,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
