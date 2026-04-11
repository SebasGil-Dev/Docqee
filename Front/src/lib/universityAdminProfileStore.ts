import { useEffect, useSyncExternalStore } from 'react';

import type {
  UniversityInstitutionFormValues,
  UniversityInstitutionProfile,
  UniversityPasswordFormValues,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import { syncUniversityAdminHeaderState, resetUniversityAdminHeaderState } from '@/lib/universityAdminHeaderStore';
import { resetUniversityAdminOverviewState } from '@/lib/universityAdminOverviewStore';
import {
  changeUniversityAdminPassword,
  getUniversityAdminProfile,
  updateUniversityAdminProfile,
} from '@/lib/universityAdminApi';

type PersistedUniversityAdminProfileCache = {
  institutionProfile: UniversityInstitutionProfile;
  updatedAt: number;
  userId: number;
};

type UniversityAdminProfileStoreState = {
  errorMessage: string | null;
  institutionProfile: UniversityInstitutionProfile;
  isLoading: boolean;
  isReady: boolean;
  shouldRefresh: boolean;
};

type ChangePasswordResult = {
  errorMessage?: string;
  ok: boolean;
};

type UniversityAdminProfileActions = {
  changePassword: (values: UniversityPasswordFormValues) => Promise<ChangePasswordResult>;
  refresh: () => Promise<void>;
  updateInstitutionProfile: (
    values: UniversityInstitutionFormValues,
  ) => Promise<boolean>;
};

type UseUniversityAdminProfileStoreOptions = {
  autoLoad?: boolean;
};

const listeners = new Set<() => void>();
const PROFILE_CACHE_STORAGE_KEY = 'docqee.university-admin.profile-cache';
const PROFILE_CACHE_MAX_AGE_MS = 30 * 60 * 1000;

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
    shouldRefresh: false,
  };
}

function createEmptyRuntimeState(): UniversityAdminProfileStoreState {
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
    shouldRefresh: false,
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

function normalizeText(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function isValidInstitutionProfile(
  value: Partial<UniversityInstitutionProfile>,
): value is UniversityInstitutionProfile {
  return (
    typeof value.adminEmail === 'string' &&
    typeof value.adminFirstName === 'string' &&
    typeof value.adminLastName === 'string' &&
    typeof value.adminPhone === 'string' &&
    Array.isArray(value.campuses) &&
    typeof value.id === 'string' &&
    typeof value.logoAlt === 'string' &&
    (value.logoFileName === null || typeof value.logoFileName === 'string') &&
    (value.logoSrc === null || typeof value.logoSrc === 'string') &&
    typeof value.mainCity === 'string' &&
    typeof value.mainCityId === 'string' &&
    typeof value.mainLocality === 'string' &&
    typeof value.mainLocalityId === 'string' &&
    typeof value.name === 'string'
  );
}

function readPersistedProfileCache() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return null;
  }

  const rawCache = storage.getItem(PROFILE_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache = JSON.parse(rawCache) as Partial<PersistedUniversityAdminProfileCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > PROFILE_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      typeof parsedCache.institutionProfile !== 'object' ||
      parsedCache.institutionProfile === null ||
      !isValidInstitutionProfile(parsedCache.institutionProfile)
    ) {
      storage.removeItem(PROFILE_CACHE_STORAGE_KEY);
      return null;
    }

    return parsedCache.institutionProfile;
  } catch {
    storage.removeItem(PROFILE_CACHE_STORAGE_KEY);
    return null;
  }
}

export function persistUniversityAdminProfileCache(
  institutionProfile: UniversityInstitutionProfile,
) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'UNIVERSITY_ADMIN') {
    return;
  }

  const payload: PersistedUniversityAdminProfileCache = {
    institutionProfile,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(PROFILE_CACHE_STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedProfileCache() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(PROFILE_CACHE_STORAGE_KEY);
}

function createRuntimeInitialState(): UniversityAdminProfileStoreState {
  const cachedProfile = readPersistedProfileCache();

  if (!cachedProfile) {
    return createEmptyRuntimeState();
  }

  syncUniversityAdminHeaderState(cachedProfile);

  return {
    errorMessage: null,
    institutionProfile: cachedProfile,
    isLoading: false,
    isReady: true,
    shouldRefresh: true,
  };
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
    campuses: profilePatch.campuses.map((campus) => ({ ...campus })),
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

  runtimeLoadPromise = getUniversityAdminProfile()
    .then((institutionProfile) => {
      persistUniversityAdminProfileCache(institutionProfile);
      syncUniversityAdminHeaderState(institutionProfile);
      updateState({
        errorMessage: null,
        institutionProfile: {
          ...createEmptyRuntimeState().institutionProfile,
          ...institutionProfile,
        },
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
          'No pudimos cargar la informacion institucional.',
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

async function refreshRuntimeState() {
  await loadRuntimeState(true);
}

async function updateInstitutionProfile(values: UniversityInstitutionFormValues) {
  if (IS_TEST_MODE) {
    const testProfilePatch = {
      ...state.institutionProfile,
      campuses: values.campuses.map((campus) => ({ ...campus })),
    };
    const nextInstitutionProfile = buildNextInstitutionProfile(
      state.institutionProfile,
      values,
      testProfilePatch,
    );

    syncUniversityAdminHeaderState(nextInstitutionProfile);
    persistUniversityAdminProfileCache(nextInstitutionProfile);
    resetUniversityAdminOverviewState();
    updateState({
      ...state,
      errorMessage: null,
      institutionProfile: nextInstitutionProfile,
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
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
    persistUniversityAdminProfileCache(nextInstitutionProfile);
    resetUniversityAdminOverviewState();
    updateState({
      ...state,
      errorMessage: null,
      institutionProfile: nextInstitutionProfile,
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
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
    return { ok: true };
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
      shouldRefresh: false,
    });
    return { ok: true };
  } catch (error) {
    const passwordErrorMessage = getErrorMessage(error, 'No pudimos actualizar la contraseña.');

    patchState({
      errorMessage: passwordErrorMessage,
      isLoading: false,
    });

    return {
      errorMessage: passwordErrorMessage,
      ok: false,
    };
  }
}

export function resetUniversityAdminProfileState() {
  clearPersistedProfileCache();
  state = IS_TEST_MODE ? createMockState() : createEmptyRuntimeState();
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
    if (
      !shouldAutoLoad ||
      IS_TEST_MODE ||
      snapshot.isLoading ||
      (snapshot.isReady && !snapshot.shouldRefresh)
    ) {
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
