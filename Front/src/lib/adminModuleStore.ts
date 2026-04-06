import { useEffect, useSyncExternalStore } from 'react';

import type {
  AdminModuleState,
  AdminUniversity,
  PendingCredential,
  RegisterUniversityFormValues,
  UniversityStatus,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import {
  createPlatformAdminUniversity,
  deletePlatformAdminCredential,
  listPlatformAdminCredentials,
  listPlatformAdminUniversities,
  resendPlatformAdminCredential,
  sendPlatformAdminCredential,
  togglePlatformAdminUniversityStatus,
} from '@/lib/platformAdminApi';

type AdminModuleStoreState = AdminModuleState & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
};

type AdminModuleActions = {
  deleteCredential: (credentialId: string) => Promise<boolean>;
  editCredentialEmail: (credentialId: string, email: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  registerUniversity: (
    values: RegisterUniversityFormValues,
  ) => Promise<{ credentialId: string; universityId: string } | null>;
  resendCredential: (credentialId: string) => Promise<string | null>;
  sendCredential: (credentialId: string) => Promise<string | null>;
  toggleUniversityStatus: (universityId: string) => Promise<UniversityStatus | null>;
};

const listeners = new Set<() => void>();

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
      mainCity: 'Bogota',
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
      deliveryStatus: 'generated',
      id: 'cred-1',
      lastSentAt: null,
      sentCount: 0,
      universityId: 'uni-3',
    },
    {
      deliveryStatus: 'sent',
      id: 'cred-2',
      lastSentAt: '2026-04-03T16:05:00.000Z',
      sentCount: 1,
      universityId: 'uni-4',
    },
  ];

  return {
    credentials,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    universities,
  };
}

function createRuntimeInitialState(): AdminModuleStoreState {
  return {
    credentials: [],
    errorMessage: null,
    isLoading: false,
    isReady: false,
    universities: [],
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
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
  const localities = patientRegisterCatalogDataSource.getLocalitiesByCity(cityId);

  if (!Array.isArray(localities)) {
    return null;
  }

  return localities.find((locality) => locality.id === localityId) ?? null;
}

function markCredentialAsSentMock(credentialId: string) {
  updateState({
    ...state,
    credentials: state.credentials.map((credential) =>
      credential.id === credentialId
        ? {
            ...credential,
            deliveryStatus: 'sent',
            lastSentAt: new Date().toISOString(),
            sentCount: credential.sentCount + 1,
          }
        : credential,
    ),
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
    deliveryStatus: 'generated',
    id: credentialId,
    lastSentAt: null,
    sentCount: 0,
    universityId,
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
  const currentUniversity = state.universities.find((university) => university.id === universityId);

  if (!currentUniversity || currentUniversity.status === 'pending') {
    return null;
  }

  const nextStatus: UniversityStatus =
    currentUniversity.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    universities: state.universities.map((university) =>
      university.id === universityId ? { ...university, status: nextStatus } : university,
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
  const currentCredential = state.credentials.find((credential) => credential.id === credentialId);

  if (!currentCredential) {
    return;
  }

  updateState({
    ...state,
    credentials: state.credentials.filter((credential) => credential.id !== credentialId),
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

  runtimeLoadPromise = Promise.all([
    listPlatformAdminUniversities(),
    listPlatformAdminCredentials(),
  ])
    .then(([universities, credentials]) => {
      updateState({
        credentials,
        errorMessage: null,
        isLoading: false,
        isReady: true,
        universities,
      });

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(error, 'No pudimos cargar el modulo administrativo.'),
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
          deliveryStatus: 'generated',
          id: university.credentialId,
          lastSentAt: null,
          sentCount: 0,
          universityId: university.id,
        }
      : null;

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      universities: [university, ...state.universities],
      credentials: newCredential
        ? [newCredential, ...state.credentials]
        : state.credentials,
    });

    return {
      credentialId: university.credentialId ?? '',
      universityId: university.id,
    };
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos registrar la universidad.'),
      isLoading: false,
    });
    return null;
  }
}

async function toggleUniversityStatus(universityId: string) {
  if (IS_TEST_MODE) {
    return toggleUniversityStatusMock(universityId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const updatedUniversity = await togglePlatformAdminUniversityStatus(universityId);

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      universities: state.universities.map((university) =>
        university.id === updatedUniversity.id ? updatedUniversity : university,
      ),
    });

    return updatedUniversity.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar el estado de la universidad.'),
      isLoading: false,
    });
    return null;
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
    const updatedCredential = result.credential;

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      credentials: state.credentials.map((credential) =>
        credential.id === credentialId ? updatedCredential : credential,
      ),
      universities: state.universities.map((university) =>
        university.credentialId === credentialId
          ? { ...university, status: 'active' }
          : university,
      ),
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
    const updatedCredential = result.credential;

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      credentials: state.credentials.map((credential) =>
        credential.id === credentialId ? updatedCredential : credential,
      ),
    });

    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos reenviar la credencial.'),
      isLoading: false,
    });
    return null;
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
    const credential = state.credentials.find((item) => item.id === credentialId);

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      credentials: state.credentials.filter((item) => item.id !== credentialId),
      universities: state.universities.filter(
        (university) =>
          !(university.id === credential?.universityId && university.status === 'pending'),
      ),
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos eliminar la credencial.'),
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
      errorMessage: 'No pudimos encontrar la credencial que intentas actualizar.',
    });
    return false;
  }

  updateState({
    ...state,
    errorMessage: null,
    isReady: true,
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

export function resetAdminModuleState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  nextUniversitySequence = initialMockState.universities.length + 1;
  nextCredentialSequence = initialMockState.credentials.length + 1;
  runtimeLoadPromise = null;
  emitChange();
}

export function useAdminModuleStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (IS_TEST_MODE || snapshot.isLoading || snapshot.isReady) {
      return;
    }

    void loadRuntimeState();
  }, [snapshot.isLoading, snapshot.isReady]);

  const actions: AdminModuleActions = {
    deleteCredential,
    editCredentialEmail,
    refresh: refreshRuntimeState,
    registerUniversity,
    resendCredential,
    sendCredential,
    toggleUniversityStatus,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
