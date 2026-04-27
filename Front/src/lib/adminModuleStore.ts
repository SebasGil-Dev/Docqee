import { useEffect, useSyncExternalStore } from 'react';

import type {
  AdminModuleState,
  AdminUniversity,
  PendingCredential,
  RegisterUniversityFormValues,
  UniversityStatus,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import {
  createPlatformAdminUniversity,
  deletePlatformAdminCredential,
  getPlatformAdminOverview,
  resendPlatformAdminCredential,
  sendAllPlatformAdminCredentials,
  sendPlatformAdminCredential,
  togglePlatformAdminUniversityStatus,
} from '@/lib/platformAdminApi';

type AdminModuleStoreState = AdminModuleState & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
  shouldRefresh: boolean;
};

type AdminModuleActions = {
  deleteCredential: (credentialId: string) => Promise<boolean>;
  editCredentialEmail: (
    credentialId: string,
    email: string,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  registerUniversity: (
    values: RegisterUniversityFormValues,
  ) => Promise<{ credentialId: string; universityId: string } | null>;
  resendCredential: (credentialId: string) => Promise<string | null>;
  sendAllCredentials: () => Promise<number>;
  sendCredential: (credentialId: string) => Promise<string | null>;
  toggleUniversityStatus: (
    universityId: string,
  ) => Promise<UniversityStatus | null>;
};

type UseAdminModuleStoreOptions = {
  autoLoad?: boolean;
};

type PersistedAdminModuleCache = {
  credentials: PendingCredential[];
  universities: AdminUniversity[];
  updatedAt: number;
  userId: number;
};

const ADMIN_MODULE_CACHE_STORAGE_KEY = 'docqee.platform-admin.module-cache';
const ADMIN_MODULE_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const UNIVERSITY_STATUS_TOGGLE_MIN_LOCK_MS = 650;

const listeners = new Set<() => void>();
const pendingUniversityStatusUpdates = new Set<string>();
let universityStatusMutationVersion = 0;

function createMockState(): AdminModuleStoreState {
  const universities: AdminUniversity[] = [
    {
      adminEmail: 'ana.velasquez@clinicadelnorte.edu.co',
      adminFirstName: 'Ana Lucia',
      adminLastName: 'Velasquez',
      adminPhone: '3005550180',
      createdAt: '2026-04-01T10:00:00.000Z',
      credentialId: null,
      id: 'uni-1',
      mainCity: 'Bogota D.C.',
      mainCityId: 'city-bogota',
      mainLocality: 'Usaquen',
      mainLocalityId: 'locality-bogota-usaquen',
      name: 'Universidad Clinica del Norte',
      status: 'active',
    },
    {
      adminEmail: 'diego.cardenas@institutoandino.edu.co',
      adminFirstName: 'Diego',
      adminLastName: 'Cardenas',
      adminPhone: '3005550172',
      createdAt: '2026-03-28T15:00:00.000Z',
      credentialId: null,
      id: 'uni-2',
      mainCity: 'Medellin',
      mainCityId: 'city-medellin',
      mainLocality: 'Laureles',
      mainLocalityId: 'locality-medellin-laureles',
      name: 'Instituto Andino de Odontologia',
      status: 'inactive',
    },
    {
      adminEmail: 'sofia.rojas@universidadpacifico.edu.co',
      adminFirstName: 'Sofia',
      adminLastName: 'Rojas',
      adminPhone: '3005550195',
      createdAt: '2026-04-03T09:30:00.000Z',
      credentialId: 'cred-1',
      id: 'uni-3',
      mainCity: 'Cali',
      mainCityId: 'city-cali',
      mainLocality: 'Comuna 17',
      mainLocalityId: 'locality-cali-comuna-17',
      name: 'Universidad del Pacifico Dental',
      status: 'pending',
    },
    {
      adminEmail: 'mateo.diaz@corporacionoral.edu.co',
      adminFirstName: 'Mateo',
      adminLastName: 'Diaz',
      adminPhone: null,
      createdAt: '2026-04-02T12:45:00.000Z',
      credentialId: 'cred-2',
      id: 'uni-4',
      mainCity: 'Barranquilla',
      mainCityId: 'city-barranquilla',
      mainLocality: 'Riomar',
      mainLocalityId: 'locality-barranquilla-riomar',
      name: 'Corporacion Oral del Caribe',
      status: 'pending',
    },
  ];

  const credentials: PendingCredential[] = [
    {
      administratorEmail: 'sofia.rojas@universidadpacifico.edu.co',
      administratorName: 'Sofia Rojas',
      deliveryStatus: 'generated',
      id: 'cred-1',
      lastSentAt: null,
      sentCount: 0,
      universityId: 'uni-3',
      universityName: 'Universidad del Pacifico Dental',
      universityStatus: 'pending',
    },
    {
      administratorEmail: 'mateo.diaz@corporacionoral.edu.co',
      administratorName: 'Mateo Diaz',
      deliveryStatus: 'sent',
      id: 'cred-2',
      lastSentAt: '2026-04-03T16:05:00.000Z',
      sentCount: 1,
      universityId: 'uni-4',
      universityName: 'Corporacion Oral del Caribe',
      universityStatus: 'active',
    },
  ];

  return {
    credentials,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
    universities,
  };
}

function createEmptyRuntimeState(): AdminModuleStoreState {
  return {
    credentials: [],
    errorMessage: null,
    isLoading: false,
    isReady: false,
    shouldRefresh: false,
    universities: [],
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

function isUniversityStatus(value: unknown): value is UniversityStatus {
  return value === 'active' || value === 'inactive' || value === 'pending';
}

function isAdminUniversity(value: unknown): value is AdminUniversity {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<AdminUniversity>;

  return (
    typeof candidate.adminEmail === 'string' &&
    typeof candidate.adminFirstName === 'string' &&
    typeof candidate.adminLastName === 'string' &&
    (candidate.adminPhone === null ||
      typeof candidate.adminPhone === 'string') &&
    typeof candidate.createdAt === 'string' &&
    (candidate.credentialId === null ||
      typeof candidate.credentialId === 'string') &&
    typeof candidate.id === 'string' &&
    typeof candidate.mainCity === 'string' &&
    typeof candidate.mainCityId === 'string' &&
    typeof candidate.mainLocality === 'string' &&
    typeof candidate.mainLocalityId === 'string' &&
    typeof candidate.name === 'string' &&
    isUniversityStatus(candidate.status)
  );
}

function isPendingCredential(value: unknown): value is PendingCredential {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PendingCredential>;

  return (
    typeof candidate.administratorEmail === 'string' &&
    typeof candidate.administratorName === 'string' &&
    (candidate.deliveryStatus === 'generated' ||
      candidate.deliveryStatus === 'sent') &&
    typeof candidate.id === 'string' &&
    (candidate.lastSentAt === null ||
      typeof candidate.lastSentAt === 'string') &&
    typeof candidate.sentCount === 'number' &&
    typeof candidate.universityId === 'string' &&
    typeof candidate.universityName === 'string' &&
    isUniversityStatus(candidate.universityStatus)
  );
}

function persistAdminModuleCache(
  universities: AdminUniversity[],
  credentials: PendingCredential[],
) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'PLATFORM_ADMIN') {
    return;
  }

  const payload: PersistedAdminModuleCache = {
    credentials,
    universities,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(ADMIN_MODULE_CACHE_STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedAdminModuleCache() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(ADMIN_MODULE_CACHE_STORAGE_KEY);
}

function readPersistedAdminModuleCache() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'PLATFORM_ADMIN') {
    return null;
  }

  const rawCache = storage.getItem(ADMIN_MODULE_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache = JSON.parse(
      rawCache,
    ) as Partial<PersistedAdminModuleCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > ADMIN_MODULE_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      !Array.isArray(parsedCache.universities) ||
      !Array.isArray(parsedCache.credentials)
    ) {
      storage.removeItem(ADMIN_MODULE_CACHE_STORAGE_KEY);
      return null;
    }

    return {
      credentials: parsedCache.credentials.filter(isPendingCredential),
      universities: parsedCache.universities.filter(isAdminUniversity),
    };
  } catch {
    storage.removeItem(ADMIN_MODULE_CACHE_STORAGE_KEY);
    return null;
  }
}

function createRuntimeInitialState(): AdminModuleStoreState {
  const cachedRecords = readPersistedAdminModuleCache();

  if (!cachedRecords) {
    return createEmptyRuntimeState();
  }

  return {
    credentials: cachedRecords.credentials,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: true,
    universities: cachedRecords.universities,
  };
}

const initialMockState = createMockState();

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let nextUniversitySequence = initialMockState.universities.length + 1;
let nextCredentialSequence = initialMockState.credentials.length + 1;
let runtimeLoadPromise: Promise<AdminModuleStoreState> | null = null;

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

function updateState(nextState: AdminModuleStoreState) {
  state = nextState;
  emitChange();
}

function patchState(partialState: Partial<AdminModuleStoreState>) {
  updateState({
    ...state,
    ...partialState,
  });
}

function setAdminModuleRecords(
  universities: AdminUniversity[],
  credentials: PendingCredential[],
  options?: {
    errorMessage?: string | null;
    isLoading?: boolean;
    isReady?: boolean;
    shouldRefresh?: boolean;
  },
) {
  persistAdminModuleCache(universities, credentials);
  updateState({
    ...state,
    credentials,
    errorMessage: options?.errorMessage ?? null,
    isLoading: options?.isLoading ?? false,
    isReady: options?.isReady ?? true,
    shouldRefresh: options?.shouldRefresh ?? false,
    universities,
  });
}

function preserveCurrentUniversityStatuses(
  universities: AdminUniversity[],
  currentUniversities: AdminUniversity[],
) {
  const currentStatusByUniversityId = new Map(
    currentUniversities.map((university) => [university.id, university.status]),
  );

  return universities.map((university) => {
    const currentStatus = currentStatusByUniversityId.get(university.id);

    return currentStatus
      ? { ...university, status: currentStatus }
      : university;
  });
}

async function waitForMinimumToggleLock(startedAt: number) {
  const elapsedMs = Date.now() - startedAt;
  const remainingMs = UNIVERSITY_STATUS_TOGGLE_MIN_LOCK_MS - elapsedMs;

  if (remainingMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remainingMs);
  });
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeOptionalText(value: string) {
  const trimmedValue = normalizeText(value);
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function getCityById(cityId: string) {
  const cities = patientRegisterCatalogDataSource.getCities();

  if (!Array.isArray(cities)) {
    return null;
  }

  return cities.find((city) => city.id === cityId) ?? null;
}

function getLocalityById(cityId: string, localityId: string) {
  const localities =
    patientRegisterCatalogDataSource.getLocalitiesByCity(cityId);

  if (!Array.isArray(localities)) {
    return null;
  }

  return localities.find((locality) => locality.id === localityId) ?? null;
}

function markCredentialAsSentMock(credentialId: string) {
  const nextCredentials: PendingCredential[] = state.credentials.map(
    (credential) =>
      credential.id === credentialId
        ? {
            ...credential,
            deliveryStatus: 'sent' as const,
            lastSentAt: new Date().toISOString(),
            sentCount: credential.sentCount + 1,
            universityStatus: 'pending' as const,
          }
        : credential,
  );

  setAdminModuleRecords(state.universities, nextCredentials, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });
}

function markAllGeneratedCredentialsAsSent() {
  let sentCount = 0;
  const nextTimestamp = new Date().toISOString();
  const nextCredentials: PendingCredential[] = state.credentials.map(
    (credential) => {
      if (credential.deliveryStatus !== 'generated') {
        return credential;
      }

      sentCount += 1;

      return {
        ...credential,
        deliveryStatus: 'sent' as const,
        lastSentAt: nextTimestamp,
        sentCount: credential.sentCount + 1,
        universityStatus: 'pending' as const,
      };
    },
  );

  if (sentCount === 0) {
    return 0;
  }

  setAdminModuleRecords(state.universities, nextCredentials, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });

  return sentCount;
}

function syncCredentialAsSent(
  credentialId: string,
  options?: {
    lastSentAt?: string | null;
    sentCount?: number;
  },
) {
  const nextCredentials: PendingCredential[] = state.credentials.map(
    (credential) =>
      credential.id === credentialId
        ? {
            ...credential,
            deliveryStatus: 'sent' as const,
            lastSentAt:
              options?.lastSentAt ??
              credential.lastSentAt ??
              new Date().toISOString(),
            sentCount: options?.sentCount ?? credential.sentCount + 1,
            universityStatus: 'pending' as const,
          }
        : credential,
  );

  setAdminModuleRecords(state.universities, nextCredentials, {
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });
}

function registerUniversityMock(values: RegisterUniversityFormValues) {
  const universityId = `uni-${nextUniversitySequence}`;
  const credentialId = `cred-${nextCredentialSequence}`;
  const city = getCityById(values.cityId);
  const locality = getLocalityById(values.cityId, values.mainLocalityId);

  nextUniversitySequence += 1;
  nextCredentialSequence += 1;

  const nextUniversity: AdminUniversity = {
    adminEmail: normalizeText(values.adminEmail).toLowerCase(),
    adminFirstName: normalizeText(values.adminFirstName),
    adminLastName: normalizeText(values.adminLastName),
    adminPhone: normalizeOptionalText(values.adminPhone),
    createdAt: new Date().toISOString(),
    credentialId,
    id: universityId,
    mainCity: city?.label ?? '',
    mainCityId: values.cityId,
    mainLocality: locality?.label ?? '',
    mainLocalityId: values.mainLocalityId,
    name: normalizeText(values.name),
    status: 'pending',
  };

  const nextCredential: PendingCredential = {
    administratorEmail: nextUniversity.adminEmail,
    administratorName: `${nextUniversity.adminFirstName} ${nextUniversity.adminLastName}`,
    deliveryStatus: 'generated',
    id: credentialId,
    lastSentAt: null,
    sentCount: 0,
    universityId,
    universityName: nextUniversity.name,
    universityStatus: 'pending',
  };

  updateState({
    ...state,
    credentials: [nextCredential, ...state.credentials],
    universities: [nextUniversity, ...state.universities],
  });

  return {
    credentialId,
    universityId,
  };
}

function toggleUniversityStatusMock(universityId: string) {
  const currentUniversity = state.universities.find(
    (university) => university.id === universityId,
  );

  if (!currentUniversity || currentUniversity.status === 'pending') {
    return null;
  }

  const nextStatus: UniversityStatus =
    currentUniversity.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    universities: state.universities.map((university) =>
      university.id === universityId
        ? { ...university, status: nextStatus }
        : university,
    ),
  });

  return nextStatus;
}

function sendCredentialMock(credentialId: string) {
  markCredentialAsSentMock(credentialId);
  return 'TempAdmin123!';
}

function resendCredentialMock(credentialId: string) {
  markCredentialAsSentMock(credentialId);
  return 'TempAdmin123!';
}

function editCredentialEmailMock(credentialId: string, email: string) {
  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    return false;
  }

  updateState({
    ...state,
    credentials: state.credentials.map((item) =>
      item.id === credentialId
        ? {
            ...item,
            administratorEmail: normalizeEmail(email),
          }
        : item,
    ),
    universities: state.universities.map((university) =>
      university.id === credential.universityId
        ? {
            ...university,
            adminEmail: normalizeEmail(email),
          }
        : university,
    ),
  });

  return true;
}

function deleteCredentialMock(credentialId: string) {
  const currentCredential = state.credentials.find(
    (credential) => credential.id === credentialId,
  );

  if (!currentCredential) {
    return;
  }

  updateState({
    ...state,
    credentials: state.credentials.filter(
      (credential) => credential.id !== credentialId,
    ),
    universities: state.universities.filter(
      (university) =>
        !(
          university.id === currentCredential.universityId &&
          university.status === 'pending' &&
          university.credentialId === credentialId
        ),
    ),
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
  const requestUniversityStatusMutationVersion =
    universityStatusMutationVersion;

  runtimeLoadPromise = getPlatformAdminOverview()
    .then(({ universities, credentials }) => {
      const syncedUniversities =
        requestUniversityStatusMutationVersion ===
        universityStatusMutationVersion
          ? universities
          : preserveCurrentUniversityStatuses(universities, state.universities);

      setAdminModuleRecords(syncedUniversities, credentials, {
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
          'No pudimos cargar el modulo administrativo.',
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

export async function refreshAdminModuleState() {
  await loadRuntimeState(true);
}

async function registerUniversity(values: RegisterUniversityFormValues) {
  if (IS_TEST_MODE) {
    return registerUniversityMock(values);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const university = await createPlatformAdminUniversity(values);

    const newCredential: PendingCredential | null = university.credentialId
      ? {
          administratorEmail: university.adminEmail,
          administratorName: `${university.adminFirstName} ${university.adminLastName}`,
          deliveryStatus: 'generated',
          id: university.credentialId,
          lastSentAt: null,
          sentCount: 0,
          universityId: university.id,
          universityName: university.name,
          universityStatus: 'pending',
        }
      : null;

    setAdminModuleRecords(
      [university, ...state.universities],
      newCredential ? [newCredential, ...state.credentials] : state.credentials,
      {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      },
    );

    return {
      credentialId: university.credentialId ?? '',
      universityId: university.id,
    };
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos registrar la universidad.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function toggleUniversityStatus(universityId: string) {
  const startedAt = Date.now();

  if (pendingUniversityStatusUpdates.has(universityId)) {
    return null;
  }

  if (IS_TEST_MODE) {
    const nextStatus = toggleUniversityStatusMock(universityId);
    await waitForMinimumToggleLock(startedAt);
    return nextStatus;
  }

  const currentUniversity = state.universities.find(
    (university) => university.id === universityId,
  );

  if (!currentUniversity || currentUniversity.status === 'pending') {
    return null;
  }

  pendingUniversityStatusUpdates.add(universityId);
  universityStatusMutationVersion += 1;

  const previousStatus = currentUniversity.status;
  const optimisticStatus: UniversityStatus =
    previousStatus === 'active' ? 'inactive' : 'active';
  const optimisticUniversities = state.universities.map((university) =>
    university.id === universityId
      ? { ...university, status: optimisticStatus }
      : university,
  );

  setAdminModuleRecords(optimisticUniversities, state.credentials, {
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: false,
  });

  try {
    const updatedUniversity =
      await togglePlatformAdminUniversityStatus(universityId);

    if (updatedUniversity.status !== optimisticStatus) {
      const syncedUniversities = state.universities.map((university) =>
        university.id === updatedUniversity.id ? updatedUniversity : university,
      );

      setAdminModuleRecords(syncedUniversities, state.credentials, {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      });
    }

    return updatedUniversity.status;
  } catch (error) {
    const revertedUniversities = state.universities.map((university) =>
      university.id === universityId
        ? { ...university, status: previousStatus }
        : university,
    );

    setAdminModuleRecords(revertedUniversities, state.credentials, {
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el estado de la universidad.',
      ),
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
    });
    return null;
  } finally {
    await waitForMinimumToggleLock(startedAt);
    pendingUniversityStatusUpdates.delete(universityId);
  }
}

async function sendCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    return sendCredentialMock(credentialId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await sendPlatformAdminCredential(credentialId);
    syncCredentialAsSent(credentialId, {
      lastSentAt: result.credential?.lastSentAt ?? null,
      sentCount: result.credential?.sentCount,
    });

    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos enviar la credencial.'),
      isLoading: false,
    });
    return null;
  }
}

async function resendCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    return resendCredentialMock(credentialId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await resendPlatformAdminCredential(credentialId);
    syncCredentialAsSent(credentialId, {
      lastSentAt: result.credential?.lastSentAt ?? null,
      sentCount: result.credential?.sentCount,
    });

    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos reenviar la credencial.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function sendAllCredentials() {
  if (IS_TEST_MODE) {
    return markAllGeneratedCredentialsAsSent();
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await sendAllPlatformAdminCredentials();
    markAllGeneratedCredentialsAsSent();
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

async function deleteCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    deleteCredentialMock(credentialId);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await deletePlatformAdminCredential(credentialId);
    const credential = state.credentials.find(
      (item) => item.id === credentialId,
    );

    setAdminModuleRecords(
      state.universities.filter(
        (university) =>
          !(
            university.id === credential?.universityId &&
            university.status === 'pending'
          ),
      ),
      state.credentials.filter((item) => item.id !== credentialId),
      {
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      },
    );

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos eliminar la credencial.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function editCredentialEmail(credentialId: string, email: string) {
  if (IS_TEST_MODE) {
    return editCredentialEmailMock(credentialId, email);
  }

  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    patchState({
      errorMessage:
        'No pudimos encontrar la credencial que intentas actualizar.',
    });
    return false;
  }

  setAdminModuleRecords(
    state.universities.map((university) =>
      university.id === credential.universityId
        ? {
            ...university,
            adminEmail: normalizeEmail(email),
          }
        : university,
    ),
    state.credentials.map((item) =>
      item.id === credentialId
        ? {
            ...item,
            administratorEmail: normalizeEmail(email),
          }
        : item,
    ),
    {
      isLoading: false,
      isReady: true,
      shouldRefresh: false,
    },
  );

  return true;
}

export function resetAdminModuleState() {
  if (!IS_TEST_MODE) {
    clearPersistedAdminModuleCache();
  }

  state = IS_TEST_MODE ? createMockState() : createEmptyRuntimeState();
  nextUniversitySequence = initialMockState.universities.length + 1;
  nextCredentialSequence = initialMockState.credentials.length + 1;
  runtimeLoadPromise = null;
  emitChange();
}

export function useAdminModuleStore(options: UseAdminModuleStoreOptions = {}) {
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

  const actions: AdminModuleActions = {
    deleteCredential,
    editCredentialEmail,
    refresh: refreshAdminModuleState,
    registerUniversity,
    resendCredential,
    sendAllCredentials,
    sendCredential,
    toggleUniversityStatus,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
