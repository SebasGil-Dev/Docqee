import { useEffect, useSyncExternalStore } from 'react';

import type {
  UniversityAdminOverview,
  UniversityHomeCampus,
  UniversityHomeInstitution,
  UniversityHomeStudent,
  UniversityHomeStudentSummary,
  UniversityHomeTeacher,
  UniversityHomeTeacherSummary,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import { getUniversityAdminOverview } from '@/lib/universityAdminApi';

type PersistedUniversityAdminOverviewCache = {
  overview: UniversityAdminOverview;
  updatedAt: number;
  userId: number;
};

type UniversityAdminOverviewStoreState = UniversityAdminOverview & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
  shouldRefresh: boolean;
};

type UniversityAdminOverviewActions = {
  refresh: () => Promise<void>;
};

type UseUniversityAdminOverviewStoreOptions = {
  autoLoad?: boolean;
};

const OVERVIEW_CACHE_STORAGE_KEY = 'docqee.university-admin.overview-cache';
const OVERVIEW_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const listeners = new Set<() => void>();

function createMockState(): UniversityAdminOverviewStoreState {
  return {
    activeCampusesCount: 1,
    errorMessage: null,
    institution: {
      adminFirstName: 'Jonathan',
      adminLastName: 'Acevedo',
      logoAlt: 'Logo institucional de Universidad Clinica del Norte',
      logoSrc: null,
      mainCity: 'Bogota',
      mainLocality: 'Usaquen',
      name: 'Universidad Clinica del Norte',
    },
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
    recentCampuses: [
      {
        city: 'Bogota',
        id: 'campus-1',
        locality: 'Usaquen',
        name: 'Sede Norte',
        status: 'active',
      },
    ],
    recentStudents: [
      {
        createdAt: '2026-04-01T09:30:00.000Z',
        displayStatus: 'pending',
        documentNumber: '1032456789',
        documentTypeCode: 'CC',
        firstName: 'Valentina',
        id: 'student-1',
        lastName: 'Rios',
        semester: '8',
      },
      {
        createdAt: '2026-03-29T14:45:00.000Z',
        displayStatus: 'active',
        documentNumber: '80124567',
        documentTypeCode: 'CC',
        firstName: 'Tomas',
        id: 'student-2',
        lastName: 'Herrera',
        semester: '6',
      },
      {
        createdAt: '2026-03-27T10:15:00.000Z',
        displayStatus: 'pending',
        documentNumber: '1029988776',
        documentTypeCode: 'TI',
        firstName: 'Camila',
        id: 'student-3',
        lastName: 'Vega',
        semester: '10',
      },
      {
        createdAt: '2026-03-25T08:20:00.000Z',
        displayStatus: 'active',
        documentNumber: '52789123',
        documentTypeCode: 'CC',
        firstName: 'Sara',
        id: 'student-4',
        lastName: 'Montoya',
        semester: '7',
      },
    ],
    recentTeachers: [
      {
        createdAt: '2026-03-18T11:10:00.000Z',
        documentNumber: '80124590',
        documentTypeCode: 'CC',
        firstName: 'Mariana',
        id: 'teacher-1',
        lastName: 'Beltran',
        status: 'active',
      },
      {
        createdAt: '2026-03-12T15:40:00.000Z',
        documentNumber: '80245671',
        documentTypeCode: 'CC',
        firstName: 'Andres',
        id: 'teacher-2',
        lastName: 'Villamizar',
        status: 'active',
      },
      {
        createdAt: '2026-03-09T13:00:00.000Z',
        documentNumber: '1030021456',
        documentTypeCode: 'CC',
        firstName: 'Laura',
        id: 'teacher-3',
        lastName: 'Martinez',
        status: 'inactive',
      },
      {
        createdAt: '2026-03-05T09:25:00.000Z',
        documentNumber: '90123456',
        documentTypeCode: 'CC',
        firstName: 'Patricia',
        id: 'teacher-4',
        lastName: 'Mendoza',
        status: 'active',
      },
    ],
    studentSummary: {
      active: 2,
      inactive: 0,
      pending: 2,
      total: 4,
    },
    teacherSummary: {
      active: 3,
      inactive: 1,
      total: 4,
    },
  };
}

function createEmptyRuntimeState(): UniversityAdminOverviewStoreState {
  return {
    activeCampusesCount: 0,
    errorMessage: null,
    institution: {
      adminFirstName: '',
      adminLastName: '',
      logoAlt: 'Logo institucional',
      logoSrc: null,
      mainCity: '',
      mainLocality: '',
      name: '',
    },
    isLoading: false,
    isReady: false,
    shouldRefresh: false,
    recentCampuses: [],
    recentStudents: [],
    recentTeachers: [],
    studentSummary: {
      active: 0,
      inactive: 0,
      pending: 0,
      total: 0,
    },
    teacherSummary: {
      active: 0,
      inactive: 0,
      total: 0,
    },
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

function isUniversityHomeInstitution(
  value: unknown,
): value is UniversityHomeInstitution {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityHomeInstitution>;

  return (
    typeof candidate.adminFirstName === 'string' &&
    typeof candidate.adminLastName === 'string' &&
    typeof candidate.logoAlt === 'string' &&
    (candidate.logoSrc === null || typeof candidate.logoSrc === 'string') &&
    typeof candidate.mainCity === 'string' &&
    typeof candidate.mainLocality === 'string' &&
    typeof candidate.name === 'string'
  );
}

function isUniversityHomeCampus(value: unknown): value is UniversityHomeCampus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityHomeCampus>;

  return (
    typeof candidate.city === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.locality === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function isUniversityHomeStudent(
  value: unknown,
): value is UniversityHomeStudent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityHomeStudent>;

  return (
    typeof candidate.createdAt === 'string' &&
    (candidate.displayStatus === 'active' ||
      candidate.displayStatus === 'inactive' ||
      candidate.displayStatus === 'pending') &&
    typeof candidate.documentNumber === 'string' &&
    typeof candidate.documentTypeCode === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.lastName === 'string' &&
    typeof candidate.semester === 'string'
  );
}

function isUniversityHomeTeacher(
  value: unknown,
): value is UniversityHomeTeacher {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityHomeTeacher>;

  return (
    typeof candidate.createdAt === 'string' &&
    typeof candidate.documentNumber === 'string' &&
    typeof candidate.documentTypeCode === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.lastName === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function isUniversityHomeStudentSummary(
  value: unknown,
): value is UniversityHomeStudentSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityHomeStudentSummary>;

  return (
    typeof candidate.active === 'number' &&
    typeof candidate.inactive === 'number' &&
    typeof candidate.pending === 'number' &&
    typeof candidate.total === 'number'
  );
}

function isUniversityHomeTeacherSummary(
  value: unknown,
): value is UniversityHomeTeacherSummary {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityHomeTeacherSummary>;

  return (
    typeof candidate.active === 'number' &&
    typeof candidate.inactive === 'number' &&
    typeof candidate.total === 'number'
  );
}

function isUniversityAdminOverview(
  value: unknown,
): value is UniversityAdminOverview {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<UniversityAdminOverview>;

  return (
    typeof candidate.activeCampusesCount === 'number' &&
    isUniversityHomeInstitution(candidate.institution) &&
    Array.isArray(candidate.recentCampuses) &&
    candidate.recentCampuses.every(isUniversityHomeCampus) &&
    Array.isArray(candidate.recentStudents) &&
    candidate.recentStudents.every(isUniversityHomeStudent) &&
    Array.isArray(candidate.recentTeachers) &&
    candidate.recentTeachers.every(isUniversityHomeTeacher) &&
    isUniversityHomeStudentSummary(candidate.studentSummary) &&
    isUniversityHomeTeacherSummary(candidate.teacherSummary)
  );
}

function persistOverviewCache(overview: UniversityAdminOverview) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return;
  }

  const payload: PersistedUniversityAdminOverviewCache = {
    overview,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(OVERVIEW_CACHE_STORAGE_KEY, JSON.stringify(payload));
}

function readPersistedOverviewCache() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return null;
  }

  const rawCache = storage.getItem(OVERVIEW_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache =
      JSON.parse(rawCache) as Partial<PersistedUniversityAdminOverviewCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > OVERVIEW_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      !isUniversityAdminOverview(parsedCache.overview)
    ) {
      storage.removeItem(OVERVIEW_CACHE_STORAGE_KEY);
      return null;
    }

    return parsedCache.overview;
  } catch {
    storage.removeItem(OVERVIEW_CACHE_STORAGE_KEY);
    return null;
  }
}

function createRuntimeInitialState(): UniversityAdminOverviewStoreState {
  const cachedOverview = readPersistedOverviewCache();

  if (!cachedOverview) {
    return createEmptyRuntimeState();
  }

  return {
    ...cachedOverview,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: true,
  };
}

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let runtimeLoadPromise: Promise<UniversityAdminOverviewStoreState> | null = null;

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

function updateState(nextState: UniversityAdminOverviewStoreState) {
  state = nextState;
  emitChange();
}

function patchState(partialState: Partial<UniversityAdminOverviewStoreState>) {
  updateState({
    ...state,
    ...partialState,
  });
}

function setOverview(
  overview: UniversityAdminOverview,
  options?: {
    errorMessage?: string | null;
    isLoading?: boolean;
    isReady?: boolean;
    shouldRefresh?: boolean;
  },
) {
  persistOverviewCache(overview);
  updateState({
    ...overview,
    errorMessage: options?.errorMessage ?? null,
    isLoading: options?.isLoading ?? false,
    isReady: options?.isReady ?? true,
    shouldRefresh: options?.shouldRefresh ?? false,
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

  runtimeLoadPromise = getUniversityAdminOverview()
    .then((overview) => {
      setOverview(overview, {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      });

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(error, 'No pudimos cargar el inicio de la universidad.'),
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

export async function refreshUniversityAdminOverviewState() {
  await loadRuntimeState(true);
}

export function resetUniversityAdminOverviewState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  runtimeLoadPromise = null;
  emitChange();
}

export function useUniversityAdminOverviewStore(
  options: UseUniversityAdminOverviewStoreOptions = {},
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

  const actions: UniversityAdminOverviewActions = {
    refresh: refreshUniversityAdminOverviewState,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
