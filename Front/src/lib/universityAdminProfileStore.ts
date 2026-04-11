import { useEffect, useSyncExternalStore } from 'react';

import type {
  UniversityInstitutionFormValues,
  UniversityInstitutionProfile,
  UniversityPasswordFormValues,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { syncUniversityAdminHeaderState, resetUniversityAdminHeaderState } from '@/lib/universityAdminHeaderStore';
import { resetUniversityAdminOverviewState } from '@/lib/universityAdminOverviewStore';
import {
  changeUniversityAdminPassword,
  getUniversityAdminProfile,
  updateUniversityAdminProfile,
} from '@/lib/universityAdminApi';

type UniversityAdminProfileStoreState = {
  errorMessage: string | null;
  institutionProfile: UniversityInstitutionProfile;
  isLoading: boolean;
  isReady: boolean;
};

type UniversityAdminProfileActions = {
  changePassword: (values: UniversityPasswordFormValues) => Promise<boolean>;
  refresh: () => Promise<void>;
  updateInstitutionProfile: (
    values: UniversityInstitutionFormValues,
  ) => Promise<boolean>;
};

type UseUniversityAdminProfileStoreOptions = {
  autoLoad?: boolean;
};

const listeners = new Set<() => void>();

function createMockCampuses() {
  return [
    {
      address: 'Cra. 15 # 93-41',
      city: 'Bogota',
      cityId: 'city-bogota',
      id: 'campus-1',
      locality: 'Usaquen',
      localityId: 'locality-bogota-usaquen',
      name: 'Sede Norte',
      status: 'active' as const,
    },
    {
      address: 'Av. 33 # 74B-11',
      city: 'Medellin',
      cityId: 'city-medellin',
      id: 'campus-2',
      locality: 'Laureles',
      localityId: 'locality-medellin-laureles',
      name: 'Sede Clinica Laureles',
      status: 'inactive' as const,
    },
  ];
}

function createMockState(): UniversityAdminProfileStoreState {
  return {
    errorMessage: null,
    institutionProfile: {
      adminEmail: 'coordinacion@clinicadelnorte.edu.co',
      adminFirstName: 'Jonathan',
      adminLastName: 'Acevedo',
      adminPhone: '3005550134',
      campuses: createMockCampuses(),
      id: 'institution-1',
      logoAlt: 'Logo institucional de Universidad Clinica del Norte',
      logoFileName: null,
      logoSrc: null,
      mainCity: 'Bogota',
      mainCityId: 'city-bogota',
      mainLocality: 'Usaquen',
      mainLocalityId: 'locality-bogota-usaquen',
      name: 'Universidad Clinica del Norte',
    },
    isLoading: false,
    isReady: true,
  };
}

function createRuntimeInitialState(): UniversityAdminProfileStoreState {
  return {
    errorMessage: null,
    institutionProfile: {
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      adminPhone: '',
      campuses: [],
      id: '',
      logoAlt: 'Logo institucional',
      logoFileName: null,
      logoSrc: null,
      mainCity: '',
      mainCityId: '',
      mainLocality: '',
      mainLocalityId: '',
      name: '',
    },
    isLoading: false,
    isReady: false,
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function buildNextInstitutionProfile(
  currentProfile: UniversityInstitutionProfile,
  values: UniversityInstitutionFormValues,
  profilePatch: UniversityInstitutionProfile,
) {
  return {
    ...currentProfile,
    ...profilePatch,
    adminEmail: normalizeEmail(values.adminEmail),
    adminFirstName: normalizeText(values.adminFirstName),
    adminLastName: normalizeText(values.adminLastName),
    adminPhone: normalizeText(values.adminPhone),
    campuses: values.campuses.map((campus) => ({ ...campus })),
    logoFileName: values.logoFileName,
    logoSrc: values.logoSrc,
    mainCityId: values.cityId,
    mainLocalityId: values.mainLocalityId,
    name: normalizeText(values.name),
  };
}

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let runtimeLoadPromise: Promise<UniversityAdminProfileStoreState> | null = null;

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

function updateState(nextState: UniversityAdminProfileStoreState) {
  state = nextState;
  emitChange();
}

function patchState(partialState: Partial<UniversityAdminProfileStoreState>) {
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

  runtimeLoadPromise = getUniversityAdminProfile()
    .then((institutionProfile) => {
      syncUniversityAdminHeaderState(institutionProfile);
      updateState({
        errorMessage: null,
        institutionProfile: {
          ...createRuntimeInitialState().institutionProfile,
          ...institutionProfile,
        },
        isLoading: false,
        isReady: true,
      });

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(
          error,
          'No pudimos cargar la informacion institucional.',
        ),
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

async function updateInstitutionProfile(values: UniversityInstitutionFormValues) {
  if (IS_TEST_MODE) {
    const nextInstitutionProfile = buildNextInstitutionProfile(
      state.institutionProfile,
      values,
      state.institutionProfile,
    );

    syncUniversityAdminHeaderState(nextInstitutionProfile);
    resetUniversityAdminOverviewState();
    updateState({
      ...state,
      errorMessage: null,
      institutionProfile: nextInstitutionProfile,
      isLoading: false,
      isReady: true,
    });

    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const institutionProfile = await updateUniversityAdminProfile(values);
    const nextInstitutionProfile = buildNextInstitutionProfile(
      state.institutionProfile,
      values,
      institutionProfile,
    );

    syncUniversityAdminHeaderState(nextInstitutionProfile);
    resetUniversityAdminOverviewState();
    updateState({
      ...state,
      errorMessage: null,
      institutionProfile: nextInstitutionProfile,
      isLoading: false,
      isReady: true,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos guardar la informacion institucional.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function changePassword(values: UniversityPasswordFormValues) {
  if (IS_TEST_MODE) {
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await changeUniversityAdminPassword(values);
    patchState({
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });
    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar la contrasena.'),
      isLoading: false,
    });
    return false;
  }
}

export function resetUniversityAdminProfileState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  runtimeLoadPromise = null;
  resetUniversityAdminHeaderState();
  emitChange();
}

export function useUniversityAdminProfileStore(
  options: UseUniversityAdminProfileStoreOptions = {},
) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const shouldAutoLoad = options.autoLoad ?? true;

  useEffect(() => {
    if (!shouldAutoLoad || IS_TEST_MODE || snapshot.isLoading || snapshot.isReady) {
      return;
    }

    void loadRuntimeState();
  }, [shouldAutoLoad, snapshot.isLoading, snapshot.isReady]);

  const actions: UniversityAdminProfileActions = {
    changePassword,
    refresh: refreshRuntimeState,
    updateInstitutionProfile,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
