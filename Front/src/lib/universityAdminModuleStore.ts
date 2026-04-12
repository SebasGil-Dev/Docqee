import { useEffect, useSyncExternalStore } from 'react';

import type {
  BulkRowError,
  BulkStudentRow,
  BulkTeacherRow,
  DocumentTypeOption,
  PersonOperationalStatus,
  RegisterStudentFormValues,
  RegisterTeacherFormValues,
  UniversityCampus,
  UniversityAdminModuleState,
  UniversityBulkTemplateType,
  UniversityInstitutionFormValues,
  UniversityInstitutionProfile,
  UniversityPasswordFormValues,
  UniversityStudent,
  UniversityStudentCredential,
  UniversityTeacher,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import { patientRegisterCatalogDataSource } from '@/lib/patientRegisterCatalogDataSource';
import { syncUniversityAdminHeaderState } from '@/lib/universityAdminHeaderStore';
import { resetUniversityAdminOverviewState } from '@/lib/universityAdminOverviewStore';
import {
  persistUniversityAdminProfileCache,
  resetUniversityAdminProfileState,
} from '@/lib/universityAdminProfileStore';
import {
  prependUniversityAdminStudentRecord,
  resetUniversityAdminStudentRecordsState,
  syncUniversityAdminStudentRecordsState,
} from '@/lib/universityAdminStudentRecordsStore';
import {
  prependUniversityAdminTeacherRecord,
  resetUniversityAdminTeacherRecordsState,
  syncUniversityAdminTeacherRecordsState,
} from '@/lib/universityAdminTeacherRecordsStore';
import {
  bulkCreateStudents,
  bulkCreateTeachers,
  changeUniversityAdminPassword,
  createUniversityStudent,
  createUniversityTeacher,
  deleteUniversityStudentCredential,
  editUniversityStudentCredentialEmail,
  getUniversityAdminProfile,
  listUniversityStudentCredentials,
  listUniversityStudents,
  listUniversityTeachers,
  resendUniversityStudentCredential,
  sendAllUniversityStudentCredentials,
  sendUniversityStudentCredential,
  toggleUniversityStudentStatus,
  toggleUniversityTeacherStatus,
  updateUniversityAdminProfile,
} from '@/lib/universityAdminApi';

type BulkProcessResult = {
  createdCredentials: number;
  createdStudents: number;
  createdTeachers: number;
  errors: BulkRowError[];
};

type UniversityAdminModuleActions = {
  changePassword: (values: UniversityPasswordFormValues) => Promise<boolean>;
  deleteStudentCredential: (credentialId: string) => Promise<boolean>;
  editStudentCredentialEmail: (credentialId: string, email: string) => Promise<boolean>;
  processBulkUpload: (templateType: UniversityBulkTemplateType, rows: BulkStudentRow[] | BulkTeacherRow[]) => Promise<BulkProcessResult | null>;
  refresh: () => Promise<void>;
  registerStudent: (values: RegisterStudentFormValues) => Promise<{
    credentialId: string;
    studentId: string;
  } | null>;
  registerTeacher: (values: RegisterTeacherFormValues) => Promise<{
    teacherId: string;
  } | null>;
  resendStudentCredential: (credentialId: string) => Promise<string | null>;
  sendAllStudentCredentials: () => Promise<number>;
  sendStudentCredential: (credentialId: string) => Promise<string | null>;
  toggleStudentStatus: (studentId: string) => Promise<PersonOperationalStatus | null>;
  toggleTeacherStatus: (teacherId: string) => Promise<PersonOperationalStatus | null>;
  updateInstitutionProfile: (values: UniversityInstitutionFormValues) => Promise<boolean>;
};

type UseUniversityAdminModuleStoreOptions = {
  autoLoad?: boolean;
};

const listeners = new Set<() => void>();

type UniversityAdminStoreState = UniversityAdminModuleState & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
};

function createMockCampuses(): UniversityCampus[] {
  return [
    {
      address: 'Cra. 15 # 93-41',
      city: 'Bogota',
      cityId: 'city-bogota',
      id: 'campus-1',
      locality: 'Usaquen',
      localityId: 'locality-bogota-usaquen',
      name: 'Sede Norte',
      status: 'active',
    },
    {
      address: 'Av. 33 # 74B-11',
      city: 'Medellin',
      cityId: 'city-medellin',
      id: 'campus-2',
      locality: 'Laureles',
      localityId: 'locality-medellin-laureles',
      name: 'Sede Clinica Laureles',
      status: 'inactive',
    },
  ];
}

function createMockState(): UniversityAdminStoreState {
  const institutionProfile: UniversityInstitutionProfile = {
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
  };

  const students: UniversityStudent[] = [
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
  ];

  const teachers: UniversityTeacher[] = [
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
  ];

  const credentials: UniversityStudentCredential[] = [
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
  ];

  return {
    credentials,
    errorMessage: null,
    institutionProfile,
    isLoading: false,
    isReady: true,
    students,
    teachers,
  };
}

function createRuntimeInitialState(): UniversityAdminStoreState {
  return {
    credentials: [],
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
    students: [],
    teachers: [],
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

const initialMockState = createMockState();

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let nextStudentSequence = initialMockState.students.length + 1;
let nextTeacherSequence = initialMockState.teachers.length + 1;
let nextCredentialSequence = initialMockState.credentials.length + 1;
let runtimeLoadPromise: Promise<UniversityAdminStoreState> | null = null;

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

function updateState(nextState: UniversityAdminStoreState) {
  state = nextState;
  emitChange();
}

function patchState(partialState: Partial<UniversityAdminStoreState>) {
  updateState({
    ...state,
    ...partialState,
  });
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

function getDocumentTypeById(documentTypeId: string) {
  const documentTypes = patientRegisterCatalogDataSource.getDocumentTypes();

  if (!Array.isArray(documentTypes)) {
    return null;
  }

  return documentTypes.find((item) => item.id === documentTypeId) ?? null;
}

function getCityById(cityId: string) {
  const cities = patientRegisterCatalogDataSource.getCities();

  if (!Array.isArray(cities)) {
    return null;
  }

  return cities.find((item) => item.id === cityId) ?? null;
}

function getLocalityById(cityId: string, localityId: string) {
  const localities = patientRegisterCatalogDataSource.getLocalitiesByCity(cityId);

  if (!Array.isArray(localities)) {
    return null;
  }

  return localities.find((item) => item.id === localityId) ?? null;
}

function createStudentDocumentType(documentTypeId: string): DocumentTypeOption | null {
  return getDocumentTypeById(documentTypeId);
}

function markStudentCredentialAsSent(credentialId: string) {
  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    return;
  }

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
    students: state.students.map((student) =>
      student.id === credential.studentId
        ? {
            ...student,
            status: 'active',
          }
        : student,
    ),
  });
}

function registerStudentMock(values: RegisterStudentFormValues) {
  const studentId = `student-${nextStudentSequence}`;
  const credentialId = `student-cred-${nextCredentialSequence}`;
  const documentType = createStudentDocumentType(values.documentTypeId);

  nextStudentSequence += 1;
  nextCredentialSequence += 1;

  const nextStudent: UniversityStudent = {
    createdAt: new Date().toISOString(),
    credentialId,
    documentNumber: normalizeText(values.documentNumber),
    documentTypeCode: documentType?.code ?? 'CC',
    documentTypeId: values.documentTypeId,
    email: normalizeEmail(values.email),
    firstName: normalizeText(values.firstName),
    id: studentId,
    lastName: normalizeText(values.lastName),
    phone: normalizeText(values.phone),
    semester: values.semester,
    status: 'active',
  };

  const nextCredential: UniversityStudentCredential = {
    deliveryStatus: 'generated',
    id: credentialId,
    lastSentAt: null,
    sentCount: 0,
    studentId,
  };

  updateState({
    ...state,
    credentials: [nextCredential, ...state.credentials],
    students: [nextStudent, ...state.students],
  });

  return {
    credentialId,
    studentId,
  };
}

function registerTeacherMock(values: RegisterTeacherFormValues) {
  const teacherId = `teacher-${nextTeacherSequence}`;
  const documentType = getDocumentTypeById(values.documentTypeId);

  nextTeacherSequence += 1;

  const nextTeacher: UniversityTeacher = {
    createdAt: new Date().toISOString(),
    documentNumber: normalizeText(values.documentNumber),
    documentTypeCode: documentType?.code ?? 'CC',
    documentTypeId: values.documentTypeId,
    firstName: normalizeText(values.firstName),
    id: teacherId,
    lastName: normalizeText(values.lastName),
    status: 'active',
  };

  updateState({
    ...state,
    teachers: [nextTeacher, ...state.teachers],
  });

  return {
    teacherId,
  };
}

function toggleStudentStatusMock(studentId: string) {
  const currentStudent = state.students.find((student) => student.id === studentId);
  const currentCredential = state.credentials.find((credential) => credential.studentId === studentId);

  if (!currentStudent || currentCredential?.deliveryStatus === 'generated') {
    return null;
  }

  const nextStatus: PersonOperationalStatus =
    currentStudent.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    students: state.students.map((student) =>
      student.id === studentId ? { ...student, status: nextStatus } : student,
    ),
  });

  return nextStatus;
}

function toggleTeacherStatusMock(teacherId: string) {
  const currentTeacher = state.teachers.find((teacher) => teacher.id === teacherId);

  if (!currentTeacher) {
    return null;
  }

  const nextStatus: PersonOperationalStatus =
    currentTeacher.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    teachers: state.teachers.map((teacher) =>
      teacher.id === teacherId ? { ...teacher, status: nextStatus } : teacher,
    ),
  });

  return nextStatus;
}

function sendStudentCredentialMock(credentialId: string) {
  markStudentCredentialAsSent(credentialId);
  return 'TempStudent123!';
}

function resendStudentCredentialMock(credentialId: string) {
  markStudentCredentialAsSent(credentialId);
  return 'TempStudent123!';
}

function sendAllStudentCredentialsMock() {
  const generatedCredentials = state.credentials.filter(
    (credential) => credential.deliveryStatus === 'generated',
  );

  if (generatedCredentials.length === 0) {
    return 0;
  }

  updateState({
    ...state,
    credentials: state.credentials.map((credential) =>
      credential.deliveryStatus === 'generated'
        ? {
            ...credential,
            deliveryStatus: 'sent',
            lastSentAt: new Date().toISOString(),
            sentCount: credential.sentCount + 1,
          }
        : credential,
    ),
    students: state.students.map((student) =>
      generatedCredentials.some((credential) => credential.studentId === student.id)
        ? {
            ...student,
            status: 'active',
          }
        : student,
    ),
  });

  return generatedCredentials.length;
}

function editStudentCredentialEmailMock(credentialId: string, email: string) {
  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    return false;
  }

  updateState({
    ...state,
    students: state.students.map((student) =>
      student.id === credential.studentId
        ? {
            ...student,
            email: normalizeEmail(email),
          }
        : student,
    ),
  });

  return true;
}

function deleteStudentCredentialMock(credentialId: string) {
  const credential = state.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    return;
  }

  updateState({
    ...state,
    credentials: state.credentials.filter((item) => item.id !== credentialId),
    students: state.students.map((student) =>
      student.id === credential.studentId ? { ...student, credentialId: null } : student,
    ),
  });
}

function updateInstitutionProfileMock(values: UniversityInstitutionFormValues) {
  const city = getCityById(values.cityId);
  const locality = getLocalityById(values.cityId, values.mainLocalityId);

  const nextInstitutionProfile = {
    ...state.institutionProfile,
    adminEmail: normalizeEmail(values.adminEmail),
    adminFirstName: normalizeText(values.adminFirstName),
    adminLastName: normalizeText(values.adminLastName),
    adminPhone: normalizeText(values.adminPhone),
    campuses: values.campuses.map((campus) => ({ ...campus })),
    logoFileName: values.logoFileName,
    logoSrc: values.logoSrc,
    mainCity: city?.label ?? state.institutionProfile.mainCity,
    mainCityId: values.cityId,
    mainLocality: locality?.label ?? state.institutionProfile.mainLocality,
    mainLocalityId: values.mainLocalityId,
    name: normalizeText(values.name),
  };

  syncUniversityAdminHeaderState(nextInstitutionProfile);
  persistUniversityAdminProfileCache(nextInstitutionProfile);
  updateState({
    ...state,
    institutionProfile: nextInstitutionProfile,
  });
}

function buildMockStudent(sequence: number) {
  const studentId = `student-${sequence}`;
  const credentialId = `student-cred-${nextCredentialSequence}`;
  const semester = `${((sequence + 2) % 10) + 1}`;
  const firstNames = ['Lucia', 'Samuel', 'Natalia', 'Felipe', 'Sara', 'Mateo'];
  const lastNames = ['Mejia', 'Castro', 'Ruiz', 'Lopez', 'Montoya', 'Cortes'];
  const firstName = firstNames[(sequence - 1) % firstNames.length] ?? 'Lucia';
  const lastName = lastNames[(sequence - 1) % lastNames.length] ?? 'Mejia';

  nextCredentialSequence += 1;

  const student: UniversityStudent = {
    createdAt: new Date().toISOString(),
    credentialId,
    documentNumber: `${1000000000 + sequence}`,
    documentTypeCode: 'CC',
    documentTypeId: 'document-cc',
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${sequence}@clinicadelnorte.edu.co`,
    firstName,
    id: studentId,
    lastName,
    phone: `3005550${String(sequence).padStart(3, '0')}`,
    semester,
    status: 'active',
  };

  const credential: UniversityStudentCredential = {
    deliveryStatus: 'generated',
    id: credentialId,
    lastSentAt: null,
    sentCount: 0,
    studentId,
  };

  return {
    credential,
    student,
  };
}

function buildMockTeacher(sequence: number) {
  const teacherId = `teacher-${sequence}`;
  const firstNames = ['Adriana', 'Carlos', 'Martha', 'Jorge', 'Paula', 'Nelson'];
  const lastNames = ['Londono', 'Ramirez', 'Suarez', 'Parra', 'Bernal', 'Rivera'];

  return {
    createdAt: new Date().toISOString(),
    documentNumber: `${80000000 + sequence}`,
    documentTypeCode: 'CC',
    documentTypeId: 'document-cc',
    firstName: firstNames[(sequence - 1) % firstNames.length] ?? 'Adriana',
    id: teacherId,
    lastName: lastNames[(sequence - 1) % lastNames.length] ?? 'Londono',
    status: 'active',
  } satisfies UniversityTeacher;
}

function processBulkUploadMock(templateType: UniversityBulkTemplateType) {
  if (templateType === 'students') {
    const createdStudents = [buildMockStudent(nextStudentSequence), buildMockStudent(nextStudentSequence + 1)];

    nextStudentSequence += createdStudents.length;

    updateState({
      ...state,
      credentials: [...createdStudents.map((item) => item.credential), ...state.credentials],
      students: [...createdStudents.map((item) => item.student), ...state.students],
    });

    return {
      createdCredentials: createdStudents.length,
      createdStudents: createdStudents.length,
      createdTeachers: 0,
      errors: [],
    };
  }

  const createdTeachers = [
    buildMockTeacher(nextTeacherSequence),
    buildMockTeacher(nextTeacherSequence + 1),
  ];

  nextTeacherSequence += createdTeachers.length;

  updateState({
    ...state,
    teachers: [...createdTeachers, ...state.teachers],
  });

  return {
    createdCredentials: 0,
    createdStudents: 0,
    createdTeachers: createdTeachers.length,
    errors: [],
  };
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
    getUniversityAdminProfile(),
    listUniversityStudents(),
    listUniversityTeachers(),
    listUniversityStudentCredentials(),
  ])
    .then(([institutionProfile, students, teachers, credentials]) => {
      syncUniversityAdminHeaderState(institutionProfile);
      persistUniversityAdminProfileCache({
        ...createRuntimeInitialState().institutionProfile,
        ...institutionProfile,
      });
      updateState({
        credentials,
        errorMessage: null,
        institutionProfile: {
          ...createRuntimeInitialState().institutionProfile,
          ...institutionProfile,
        },
        isLoading: false,
        isReady: true,
        students,
        teachers,
      });

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(error, 'No pudimos cargar el modulo universitario.'),
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

async function registerStudent(values: RegisterStudentFormValues) {
  if (IS_TEST_MODE) {
    const result = registerStudentMock(values);

    if (result) {
      const student = state.students.find((item) => item.id === result.studentId);

      if (student) {
        prependUniversityAdminStudentRecord(student);
      }
    }

    return result;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const student = await createUniversityStudent(values);
    const nextStudents = [
      student,
      ...state.students.filter((currentStudent) => currentStudent.id !== student.id),
    ];
    const nextCredentials = student.credentialId
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

    prependUniversityAdminStudentRecord(student);
    resetUniversityAdminOverviewState();
    updateState({
      ...state,
      credentials: nextCredentials,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      students: nextStudents,
    });

    return {
      credentialId: student.credentialId ?? '',
      studentId: student.id,
    };
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos registrar el estudiante.'),
      isLoading: false,
    });
    return null;
  }
}

async function registerTeacher(values: RegisterTeacherFormValues) {
  if (IS_TEST_MODE) {
    const result = registerTeacherMock(values);

    if (result) {
      const teacher = state.teachers.find((item) => item.id === result.teacherId);

      if (teacher) {
        prependUniversityAdminTeacherRecord(teacher);
      }
    }

    return result;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const teacher = await createUniversityTeacher(values);
    const nextTeachers = [
      teacher,
      ...state.teachers.filter((currentTeacher) => currentTeacher.id !== teacher.id),
    ];

    prependUniversityAdminTeacherRecord(teacher);
    resetUniversityAdminOverviewState();
    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      teachers: nextTeachers,
    });

    return {
      teacherId: teacher.id,
    };
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos registrar el docente.'),
      isLoading: false,
    });
    return null;
  }
}

async function toggleStudentStatus(studentId: string) {
  if (IS_TEST_MODE) {
    return toggleStudentStatusMock(studentId);
  }

  const currentCredential = state.credentials.find((credential) => credential.studentId === studentId);

  if (currentCredential?.deliveryStatus === 'generated') {
    return null;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await toggleUniversityStudentStatus(studentId);
    resetUniversityAdminOverviewState();

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      students: state.students.map((student) =>
        student.id === result.studentId ? { ...student, status: result.status } : student,
      ),
    });

    return result.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar el estado del estudiante.'),
      isLoading: false,
    });
    return null;
  }
}

async function toggleTeacherStatus(teacherId: string) {
  if (IS_TEST_MODE) {
    return toggleTeacherStatusMock(teacherId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await toggleUniversityTeacherStatus(teacherId);
    resetUniversityAdminOverviewState();

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      teachers: state.teachers.map((teacher) =>
        teacher.id === result.teacherId ? { ...teacher, status: result.status } : teacher,
      ),
    });

    return result.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar el estado del docente.'),
      isLoading: false,
    });
    return null;
  }
}

async function sendStudentCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    return sendStudentCredentialMock(credentialId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await sendUniversityStudentCredential(credentialId);
    await refreshRuntimeState();
    resetUniversityAdminOverviewState();
    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos enviar la credencial del estudiante.'),
      isLoading: false,
    });
    return null;
  }
}

async function resendStudentCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    return resendStudentCredentialMock(credentialId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await resendUniversityStudentCredential(credentialId);
    await refreshRuntimeState();
    resetUniversityAdminOverviewState();
    return result.temporaryPassword;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos reenviar la credencial del estudiante.'),
      isLoading: false,
    });
    return null;
  }
}

async function sendAllStudentCredentials() {
  if (IS_TEST_MODE) {
    return sendAllStudentCredentialsMock();
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await sendAllUniversityStudentCredentials();
    await refreshRuntimeState();
    resetUniversityAdminOverviewState();
    return result.sentCount;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos enviar las credenciales pendientes.'),
      isLoading: false,
    });
    return 0;
  }
}

async function editStudentCredentialEmail(credentialId: string, email: string) {
  if (IS_TEST_MODE) {
    return editStudentCredentialEmailMock(credentialId, email);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await editUniversityStudentCredentialEmail(credentialId, email);
    const credential = state.credentials.find((item) => item.id === credentialId);

    updateState({
      ...state,
      isLoading: false,
      isReady: true,
      students: state.students.map((student) =>
        student.id === credential?.studentId ? { ...student, email: email.trim().toLowerCase() } : student,
      ),
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar el correo del estudiante.'),
      isLoading: false,
    });
    return false;
  }
}

async function deleteStudentCredential(credentialId: string) {
  if (IS_TEST_MODE) {
    deleteStudentCredentialMock(credentialId);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await deleteUniversityStudentCredential(credentialId);
    await refreshRuntimeState();
    resetUniversityAdminOverviewState();
    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos eliminar la credencial del estudiante.'),
      isLoading: false,
    });
    return false;
  }
}

async function updateInstitutionProfile(values: UniversityInstitutionFormValues) {
  if (IS_TEST_MODE) {
    updateInstitutionProfileMock(values);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const institutionProfile = await updateUniversityAdminProfile(values);
    const nextInstitutionProfile = {
      ...state.institutionProfile,
      ...institutionProfile,
      adminFirstName: normalizeText(values.adminFirstName),
      adminLastName: normalizeText(values.adminLastName),
      campuses: values.campuses.map((campus) => ({ ...campus })),
    };

    syncUniversityAdminHeaderState(nextInstitutionProfile);
    persistUniversityAdminProfileCache(nextInstitutionProfile);
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
      errorMessage: getErrorMessage(error, 'No pudimos guardar la informacion institucional.'),
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
      errorMessage: getErrorMessage(error, 'No pudimos actualizar la contraseña.'),
      isLoading: false,
    });
    return false;
  }
}

async function processBulkUpload(
  templateType: UniversityBulkTemplateType,
  rows: BulkStudentRow[] | BulkTeacherRow[],
) {
  if (IS_TEST_MODE) {
    const result = processBulkUploadMock(templateType);

    if (templateType === 'students') {
      syncUniversityAdminStudentRecordsState(state.students, state.credentials);
    } else {
      syncUniversityAdminTeacherRecordsState(state.teachers);
    }

    return result;
  }

  patchState({ errorMessage: null, isLoading: true });

  try {
    if (templateType === 'students') {
      const result = await bulkCreateStudents(rows as BulkStudentRow[]);
      resetUniversityAdminStudentRecordsState();
      resetUniversityAdminOverviewState();
      patchState({
        errorMessage: null,
        isLoading: false,
        isReady: true,
      });

      return {
        createdCredentials: result.createdCredentials,
        createdStudents: result.created,
        createdTeachers: 0,
        errors: result.errors,
      };
    }

    const result = await bulkCreateTeachers(rows as BulkTeacherRow[]);
    resetUniversityAdminTeacherRecordsState();
    resetUniversityAdminOverviewState();
    patchState({
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return {
      createdCredentials: 0,
      createdStudents: 0,
      createdTeachers: result.created,
      errors: result.errors,
    };
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos procesar la carga masiva.'),
      isLoading: false,
    });
    return null;
  }
}

export function resetUniversityAdminModuleState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  nextStudentSequence = initialMockState.students.length + 1;
  nextTeacherSequence = initialMockState.teachers.length + 1;
  nextCredentialSequence = initialMockState.credentials.length + 1;
  runtimeLoadPromise = null;
  resetUniversityAdminProfileState();
  resetUniversityAdminStudentRecordsState();
  resetUniversityAdminTeacherRecordsState();
  resetUniversityAdminOverviewState();
  emitChange();
}

export function useUniversityAdminModuleStore(
  options: UseUniversityAdminModuleStoreOptions = {},
) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const shouldAutoLoad = options.autoLoad ?? true;

  useEffect(() => {
    if (!shouldAutoLoad || IS_TEST_MODE || snapshot.isLoading || snapshot.isReady) {
      return;
    }

    void loadRuntimeState();
  }, [shouldAutoLoad, snapshot.isLoading, snapshot.isReady]);

  const actions: UniversityAdminModuleActions = {
    changePassword,
    deleteStudentCredential,
    editStudentCredentialEmail,
    processBulkUpload,
    refresh: refreshRuntimeState,
    registerStudent,
    registerTeacher,
    resendStudentCredential,
    sendAllStudentCredentials,
    sendStudentCredential,
    toggleStudentStatus,
    toggleTeacherStatus,
    updateInstitutionProfile,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
