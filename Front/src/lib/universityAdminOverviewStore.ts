import { useEffect, useSyncExternalStore } from 'react';

import type { UniversityAdminOverview } from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { getUniversityAdminOverview } from '@/lib/universityAdminApi';

type UniversityAdminOverviewStoreState = UniversityAdminOverview & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
};

type UniversityAdminOverviewActions = {
  refresh: () => Promise<void>;
};

type UseUniversityAdminOverviewStoreOptions = {
  autoLoad?: boolean;
};

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
        firstName: 'Valentina',
        id: 'student-1',
        lastName: 'Rios',
        semester: '8',
      },
      {
        createdAt: '2026-03-29T14:45:00.000Z',
        displayStatus: 'active',
        firstName: 'Tomas',
        id: 'student-2',
        lastName: 'Herrera',
        semester: '6',
      },
      {
        createdAt: '2026-03-27T10:15:00.000Z',
        displayStatus: 'pending',
        firstName: 'Camila',
        id: 'student-3',
        lastName: 'Vega',
        semester: '10',
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
    ],
    studentSummary: {
      active: 2,
      inactive: 0,
      pending: 2,
      total: 4,
    },
    teacherSummary: {
      active: 2,
      inactive: 1,
      total: 3,
    },
  };
}

function createRuntimeInitialState(): UniversityAdminOverviewStoreState {
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

async function loadRuntimeState(forceRefresh = false) {
  if (IS_TEST_MODE) {
    return state;
  }

  if (state.isReady && !forceRefresh) {
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
      updateState({
        ...overview,
        errorMessage: null,
        isLoading: false,
        isReady: true,
      });

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(error, 'No pudimos cargar el inicio de la universidad.'),
        isLoading: false,
      });

      return state;
    })
    .finally(() => {
      runtimeLoadPromise = null;
    });

  return runtimeLoadPromise;
}

async function refreshRuntimeState() {
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
    if (!shouldAutoLoad || IS_TEST_MODE || snapshot.isLoading || snapshot.isReady) {
      return;
    }

    void loadRuntimeState();
  }, [shouldAutoLoad, snapshot.isLoading, snapshot.isReady]);

  const actions: UniversityAdminOverviewActions = {
    refresh: refreshRuntimeState,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
