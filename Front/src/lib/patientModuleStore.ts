import { useEffect, useSyncExternalStore } from 'react';

import type {
  PatientAppointment,
  PatientAppointmentReview,
  PatientAppointmentStatus,
  PatientConversation,
  PatientConversationMessage,
  PatientModuleState,
  PatientProfile,
  PatientProfileFormValues,
  PatientRequest,
  PatientRequestStatus,
  PatientStudentDirectoryItem,
} from '@/content/types';
import { ApiError, IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import { scheduleSystemMessageDismiss } from '@/lib/systemMessages';
import {
  createPatientPortalRequest,
  getPatientPortalAppointments,
  getPatientPortalConversation,
  getPatientPortalDashboard,
  getPatientPortalReviews,
  getPatientPortalRequests,
  getPatientPortalStudents,
  sendPatientPortalConversationMessage,
  submitPatientPortalAppointmentReview,
  type PatientStudentDirectorySearchParams,
  updatePatientPortalAppointmentStatus,
  updatePatientPortalProfile,
  updatePatientPortalRequestStatus,
} from '@/lib/patientApi';

type PatientModuleActions = {
  createRequest: (
    studentId: string,
    reason: string,
  ) => Promise<PatientRequest | null>;
  prefetchStudentDirectory: () => Promise<void>;
  refresh: (options?: { preserveStudents?: boolean }) => Promise<void>;
  refreshAppointments: () => Promise<void>;
  refreshReviews: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  refreshConversation: (conversationId: string) => Promise<void>;
  searchStudents: (
    filters: PatientStudentDirectorySearchParams,
  ) => Promise<PatientStudentDirectoryItem[]>;
  sendConversationMessage: (
    conversationId: string,
    content: string,
  ) => Promise<boolean>;
  submitAppointmentReview: (
    appointmentId: string,
    rating: number,
    comment?: string,
  ) => Promise<boolean>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: PatientAppointmentStatus,
  ) => Promise<boolean>;
  updateProfile: (values: PatientProfileFormValues) => Promise<boolean>;
  updateRequestStatus: (
    requestId: string,
    status: PatientRequestStatus,
  ) => Promise<boolean>;
};

type PatientStoreState = PatientModuleState & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
  isSearchingStudents: boolean;
  shouldRefresh: boolean;
};

type UsePatientModuleStoreOptions = {
  autoLoad?: boolean;
};

type PersistedPatientModuleCache = PatientModuleState & {
  updatedAt: number;
  userId: number;
};

type CachedStudentSearch = {
  students: PatientStudentDirectoryItem[];
  updatedAt: number;
};

type PersistedStudentDirectoryIndexCache = CachedStudentSearch & {
  userId: number;
  version: number;
};

const PATIENT_MODULE_CACHE_STORAGE_KEY = 'docqee.patient.module-cache.v2';
const PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY =
  'docqee.patient.student-directory-index';
const PATIENT_MODULE_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const PATIENT_STUDENT_SEARCH_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const PATIENT_STUDENT_SEARCH_CACHE_MAX_ENTRIES = 48;
const PATIENT_STUDENT_DIRECTORY_INDEX_MAX_AGE_MS = 10 * 60 * 1000;
const PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT = 120;
const PATIENT_STUDENT_DIRECTORY_INDEX_CACHE_VERSION = 3;

const listeners = new Set<() => void>();
const studentSearchCache = new Map<string, CachedStudentSearch>();
const studentSearchPromises = new Map<
  string,
  Promise<PatientStudentDirectoryItem[]>
>();
const pendingPatientRequestStudentIds = new Set<string>();
let studentDirectoryIndex: PatientStudentDirectoryItem[] | null = null;
let studentDirectoryIndexPromise: Promise<
  PatientStudentDirectoryItem[]
> | null = null;
let studentDirectoryIndexUpdatedAt = 0;
let studentSearchRequestSequence = 0;
let lastDashboardStudents: PatientStudentDirectoryItem[] | null = null;

function createStudentFilterOptions(students: PatientStudentDirectoryItem[]) {
  const cityMap = new Map<string, string>();
  const localityMap = new Map<
    string,
    { cityValue: string; label: string; value: string }
  >();

  students.forEach((student) => {
    const cityValue = normalizeText(student.city);
    const localityValue = normalizeText(student.locality);

    if (cityValue && !cityMap.has(cityValue)) {
      cityMap.set(cityValue, student.city);
    }

    if (cityValue && localityValue) {
      const key = `${cityValue}||${localityValue}`;

      if (!localityMap.has(key)) {
        localityMap.set(key, {
          cityValue,
          label: student.locality,
          value: localityValue,
        });
      }
    }
  });

  return {
    cities: [...cityMap.entries()]
      .map(([value, label]) => ({ label, value }))
      .sort((first, second) =>
        first.label.localeCompare(second.label, 'es-CO'),
      ),
    localities: [...localityMap.values()].sort((first, second) =>
      first.label.localeCompare(second.label, 'es-CO'),
    ),
    treatments: [...new Set(students.flatMap((student) => student.treatments))]
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, 'es-CO')),
    universities: [
      ...new Set(students.map((student) => student.universityName)),
    ]
      .filter(Boolean)
      .sort((first, second) => first.localeCompare(second, 'es-CO')),
  };
}

function normalizeDirectoryFilterText(value: string | undefined) {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function matchesStudentSearch(
  student: PatientStudentDirectoryItem,
  filters: PatientStudentDirectorySearchParams,
) {
  const normalizedSearch = normalizeDirectoryFilterText(filters.search);
  const normalizedTreatment =
    filters.treatment && filters.treatment !== 'all'
      ? normalizeDirectoryFilterText(filters.treatment)
      : '';
  const normalizedCity =
    filters.city && filters.city !== 'all'
      ? normalizeDirectoryFilterText(filters.city)
      : '';
  const normalizedLocality =
    filters.locality && filters.locality !== 'all'
      ? normalizeDirectoryFilterText(filters.locality)
      : '';
  const normalizedUniversity =
    filters.university && filters.university !== 'all'
      ? normalizeDirectoryFilterText(filters.university)
      : '';
  const studentFullName = normalizeDirectoryFilterText(
    `${student.firstName} ${student.lastName}`,
  );
  const studentTreatments = student.treatments.map((treatment) =>
    normalizeDirectoryFilterText(treatment),
  );
  const studentCity = normalizeDirectoryFilterText(student.city);
  const studentLocality = normalizeDirectoryFilterText(student.locality);
  const studentUniversity = normalizeDirectoryFilterText(
    student.universityName,
  );

  return (
    (!normalizedSearch || studentFullName.includes(normalizedSearch)) &&
    (!normalizedTreatment || studentTreatments.includes(normalizedTreatment)) &&
    (!normalizedCity || studentCity === normalizedCity) &&
    (!normalizedLocality || studentLocality === normalizedLocality) &&
    (!normalizedUniversity || studentUniversity === normalizedUniversity)
  );
}

function hasSearchablePracticeSite(student: PatientStudentDirectoryItem) {
  const hasPracticeSites = (student.practiceSites?.length ?? 0) > 0;

  return hasPracticeSites || Boolean(student.practiceSite?.trim());
}

function isSearchableStudent(student: PatientStudentDirectoryItem) {
  return student.treatments.length > 0 && hasSearchablePracticeSite(student);
}

function createMockState(): PatientStoreState {
  const profile: PatientProfile = {
    avatarAlt: 'Foto de perfil de Sara Lopez',
    avatarFileName: null,
    avatarSrc: null,
    birthDate: '2000-08-19',
    city: 'Bogota',
    email: 'sara.lopez@email.com',
    firstName: 'Sara',
    id: 'patient-profile-1',
    lastName: 'Lopez',
    locality: 'Chapinero',
    phone: '3004567890',
    sex: 'FEMENINO',
    tutor: {
      email: 'maria.lopez@email.com',
      firstName: 'Maria Elena',
      lastName: 'Lopez',
      phone: '3109876543',
    },
  };

  const students: PatientStudentDirectoryItem[] = [
    {
      avatarAlt: 'Foto de perfil de Daniel Pardo',
      avatarSrc: null,
      availabilityGeneral: 'Lunes, miercoles y viernes en jornada de manana.',
      availabilityStatus: 'available',
      averageRating: 4.7,
      biography:
        'Enfoque en operatoria, valoracion inicial y seguimiento preventivo con comunicacion clara.',
      city: 'Bogota',
      firstName: 'Daniel',
      id: 'patient-student-1',
      lastName: 'Pardo',
      locality: 'Chapinero',
      practiceSite: 'Sede Norte',
      practiceSites: [
        { city: 'Bogota', locality: 'Chapinero', name: 'Sede Norte' },
        {
          city: 'Bogota',
          locality: 'Teusaquillo',
          name: 'Sede Complementaria',
        },
      ],
      professionalLinks: [
        {
          id: 'patient-student-1-link-1',
          type: 'RED_PROFESIONAL',
          url: 'https://linkedin.com/in/daniel-pardo-docqee',
        },
      ],
      reviews: [
        {
          comment:
            'Explico cada paso con claridad y mantuvo una comunicacion muy tranquila durante la cita.',
          createdAt: '2026-04-10T16:20:00.000Z',
          id: 'patient-student-1-review-1',
          rating: 5,
        },
        {
          comment:
            'Fue puntual y cuidadoso con las indicaciones posteriores al procedimiento.',
          createdAt: '2026-03-22T11:10:00.000Z',
          id: 'patient-student-1-review-2',
          rating: 4,
        },
      ],
      reviewsCount: 12,
      semester: '8',
      treatments: ['Operatoria basica', 'Promocion y prevencion'],
      universityCity: 'Bogota',
      universityLogoAlt: 'Logo de Universidad Clinica del Norte',
      universityLogoSrc: null,
      universityLocality: 'Chapinero',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      avatarAlt: 'Foto de perfil de Valentina Rios',
      avatarSrc: null,
      availabilityGeneral: 'Martes y jueves en jornada de tarde.',
      availabilityStatus: 'available',
      averageRating: 4.3,
      biography:
        'Perfil orientado a rehabilitacion oral y acompanamiento continuo del paciente.',
      city: 'Bogota',
      firstName: 'Valentina',
      id: 'patient-student-2',
      lastName: 'Rios',
      locality: 'Barrios Unidos',
      practiceSite: 'Sede Escuela Clinica',
      practiceSites: [
        {
          city: 'Bogota',
          locality: 'Barrios Unidos',
          name: 'Sede Escuela Clinica',
        },
      ],
      professionalLinks: [
        {
          id: 'patient-student-2-link-1',
          type: 'PORTAFOLIO',
          url: 'https://portfolio.docqee.co/valentina-rios',
        },
      ],
      reviews: [
        {
          comment:
            'La comunicacion durante la cita fue clara y el proceso se pudo desarrollar sin inconvenientes.',
          createdAt: '2026-04-07T13:40:00.000Z',
          id: 'patient-student-2-review-1',
          rating: 4,
        },
      ],
      reviewsCount: 9,
      semester: '8',
      treatments: ['Rehabilitacion oral', 'Promocion y prevencion'],
      universityCity: 'Bogota',
      universityLogoAlt: 'Logo de Universidad Clinica del Norte',
      universityLogoSrc: null,
      universityLocality: 'Chapinero',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      avatarAlt: 'Foto de perfil de Camila Perez',
      avatarSrc: null,
      availabilityGeneral: 'Jueves en sede central y sabados alternos.',
      availabilityStatus: 'limited',
      averageRating: 4.9,
      biography:
        'Atencion centrada en seguimiento restaurativo con alto componente academico.',
      city: 'Bogota',
      firstName: 'Camila',
      id: 'patient-student-3',
      lastName: 'Perez',
      locality: 'Teusaquillo',
      practiceSite: 'Sede Central',
      practiceSites: [
        { city: 'Bogota', locality: 'Teusaquillo', name: 'Sede Central' },
      ],
      professionalLinks: [],
      reviews: [
        {
          comment:
            'Muy buena disposicion para resolver dudas y explicar el tratamiento con calma.',
          createdAt: '2026-03-26T09:15:00.000Z',
          id: 'patient-student-3-review-1',
          rating: 5,
        },
      ],
      reviewsCount: 15,
      semester: '9',
      treatments: ['Rehabilitacion oral', 'Valoracion integral'],
      universityCity: 'Bogota',
      universityLogoAlt: 'Logo de Universidad Metropolitana',
      universityLogoSrc: null,
      universityLocality: 'Teusaquillo',
      universityName: 'Universidad Metropolitana',
    },
    {
      avatarAlt: 'Foto de perfil de Mateo Diaz',
      avatarSrc: null,
      availabilityGeneral: 'Lunes a jueves en jornada combinada.',
      availabilityStatus: 'available',
      averageRating: 3.8,
      biography:
        'Interes en diagnostico inicial, educacion preventiva y procesos de remision organizada.',
      city: 'Medellin',
      firstName: 'Mateo',
      id: 'patient-student-4',
      lastName: 'Diaz',
      locality: 'Laureles',
      practiceSite: 'Sede Clinica Laureles',
      practiceSites: [
        {
          city: 'Medellin',
          locality: 'Laureles',
          name: 'Sede Clinica Laureles',
        },
      ],
      professionalLinks: [],
      reviews: [],
      reviewsCount: 6,
      semester: '7',
      treatments: ['Valoracion integral', 'Promocion y prevencion'],
      universityCity: 'Medellin',
      universityLogoAlt: 'Logo de Universidad de Antioquia Clinica',
      universityLogoSrc: null,
      universityLocality: 'Laureles',
      universityName: 'Universidad de Antioquia Clinica',
    },
    {
      avatarAlt: 'Foto de perfil de Laura Mendoza',
      avatarSrc: null,
      availabilityGeneral:
        'Martes, jueves y sabados con disponibilidad variable.',
      availabilityStatus: 'available',
      averageRating: 4.5,
      biography:
        'Seguimiento clinico enfocado en rehabilitacion, diagnostico y manejo preventivo del paciente.',
      city: 'Bogota',
      firstName: 'Laura',
      id: 'patient-student-5',
      lastName: 'Mendoza',
      locality: 'Suba',
      practiceSite: 'Sede Clinica Suba',
      practiceSites: [
        {
          city: 'Bogota',
          locality: 'Suba',
          name: 'Sede Clinica Suba',
        },
      ],
      professionalLinks: [],
      reviews: [],
      reviewsCount: 11,
      semester: '10',
      treatments: ['Rehabilitacion oral', 'Endodoncia'],
      universityCity: 'Bogota',
      universityLogoAlt: 'Logo de Universidad Distrital Clinica',
      universityLogoSrc: null,
      universityLocality: 'Suba',
      universityName: 'Universidad Distrital Clinica',
    },
  ];

  const requests: PatientRequest[] = [
    {
      appointmentsCount: 1,
      conversationId: 'patient-conversation-1',
      id: 'patient-request-1',
      reason: 'Quisiera revisar dolor persistente y una posible restauracion.',
      responseAt: '2026-04-04T11:20:00.000Z',
      sentAt: '2026-04-03T17:10:00.000Z',
      status: 'ACEPTADA',
      studentId: 'patient-student-2',
      studentName: 'Valentina Rios',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      appointmentsCount: 0,
      conversationId: null,
      id: 'patient-request-2',
      reason: 'Necesito una valoracion preventiva para control general.',
      responseAt: null,
      sentAt: '2026-04-05T08:30:00.000Z',
      status: 'PENDIENTE',
      studentId: 'patient-student-1',
      studentName: 'Daniel Pardo',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      appointmentsCount: 2,
      conversationId: 'patient-conversation-2',
      id: 'patient-request-3',
      reason: 'Seguimiento final del tratamiento restaurativo.',
      responseAt: '2026-03-29T15:10:00.000Z',
      sentAt: '2026-03-21T09:00:00.000Z',
      status: 'CERRADA',
      studentId: 'patient-student-3',
      studentName: 'Camila Perez',
      universityName: 'Universidad Metropolitana',
    },
    {
      appointmentsCount: 0,
      conversationId: null,
      id: 'patient-request-4',
      reason: 'Buscaba una valoracion inicial para ortodoncia.',
      responseAt: '2026-04-06T10:30:00.000Z',
      sentAt: '2026-04-05T14:15:00.000Z',
      status: 'RECHAZADA',
      studentId: 'patient-student-4',
      studentName: 'Nicolas Herrera',
      universityName: 'Universidad de los Andes Clinica',
    },
  ];

  const conversations: PatientConversation[] = [
    {
      id: 'patient-conversation-1',
      messages: [
        {
          author: 'PACIENTE',
          authorName: 'Sara Lopez',
          content:
            'Hola, quisiera saber si puedes revisar un dolor dental persistente.',
          id: 'patient-message-1',
          sentAt: '2026-04-03T17:12:00.000Z',
        },
        {
          author: 'ESTUDIANTE',
          authorName: 'Valentina Rios',
          content:
            'Hola Sara, claro que si. Ya revise tu solicitud y podemos avanzar.',
          id: 'patient-message-2',
          sentAt: '2026-04-04T11:22:00.000Z',
        },
      ],
      reason: 'Quisiera revisar dolor persistente y una posible restauracion.',
      requestId: 'patient-request-1',
      status: 'ACTIVA',
      studentId: 'patient-student-2',
      studentName: 'Valentina Rios',
      universityName: 'Universidad Clinica del Norte',
      unreadCount: 0,
    },
    {
      id: 'patient-conversation-2',
      messages: [
        {
          author: 'PACIENTE',
          authorName: 'Sara Lopez',
          content:
            'Gracias por el acompanamiento durante el cierre del tratamiento.',
          id: 'patient-message-3',
          sentAt: '2026-03-29T15:14:00.000Z',
        },
        {
          author: 'ESTUDIANTE',
          authorName: 'Camila Perez',
          content: 'Con gusto, Sara. Dejamos el proceso cerrado y estable.',
          id: 'patient-message-4',
          sentAt: '2026-03-29T15:22:00.000Z',
        },
      ],
      reason: 'Seguimiento final del tratamiento restaurativo.',
      requestId: 'patient-request-3',
      status: 'SOLO_LECTURA',
      studentId: 'patient-student-3',
      studentName: 'Camila Perez',
      universityName: 'Universidad Metropolitana',
      unreadCount: 0,
    },
  ];

  const appointments: PatientAppointment[] = [
    {
      additionalInfo:
        'Recuerda llevar radiografia panoramica si la tienes disponible.',
      appointmentType: 'Valoracion inicial',
      city: 'Bogota',
      createdAt: '2026-04-08T10:00:00.000Z',
      endAt: '2026-05-09T11:30:00.000Z',
      id: 'patient-appointment-1',
      myRating: null,
      respondedAt: null,
      siteAddress: 'Calle 80 # 24-19',
      siteName: 'Sede Escuela Clinica',
      startAt: '2026-05-09T10:30:00.000Z',
      status: 'PROPUESTA',
      studentName: 'Valentina Rios',
      teacherName: 'Dr. Sebastian Mora',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      additionalInfo: 'Cita confirmada por la clinica universitaria.',
      appointmentType: 'Control restaurativo',
      city: 'Bogota',
      createdAt: '2026-04-10T09:00:00.000Z',
      endAt: '2026-04-12T15:00:00.000Z',
      id: 'patient-appointment-2',
      myRating: null,
      respondedAt: '2026-04-11T08:00:00.000Z',
      siteAddress: 'Cra. 15 # 93-41',
      siteName: 'Sede Norte',
      startAt: '2026-04-12T14:00:00.000Z',
      status: 'ACEPTADA',
      studentName: 'Daniel Pardo',
      teacherName: 'Dra. Laura Rojas',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      additionalInfo: null,
      appointmentType: 'Seguimiento final',
      city: 'Bogota',
      createdAt: '2026-03-20T08:00:00.000Z',
      endAt: '2026-03-25T09:30:00.000Z',
      id: 'patient-appointment-3',
      myRating: null,
      respondedAt: '2026-03-21T07:00:00.000Z',
      siteAddress: 'Av. Caracas # 45-30',
      siteName: 'Sede Central',
      startAt: '2026-03-25T08:30:00.000Z',
      status: 'FINALIZADA',
      studentName: 'Camila Perez',
      teacherName: 'Dr. Julian Herrera',
      universityName: 'Universidad Metropolitana',
    },
    {
      additionalInfo:
        'Nueva propuesta para mover la cita a un horario con mas disponibilidad.',
      appointmentType: 'Control preventivo',
      city: 'Bogota',
      createdAt: '2026-04-18T09:30:00.000Z',
      endAt: '2026-04-28T17:00:00.000Z',
      id: 'patient-appointment-4',
      isRescheduleProposal: true,
      myRating: null,
      respondedAt: null,
      siteAddress: 'Calle 80 # 24-19',
      siteName: 'Sede Escuela Clinica',
      startAt: '2026-04-28T16:00:00.000Z',
      status: 'PROPUESTA',
      studentName: 'Valentina Rios',
      teacherName: 'Dr. Sebastian Mora',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      additionalInfo: 'Propuesta vencida sin respuesta del paciente.',
      appointmentType: 'Valoracion inicial',
      city: 'Bogota',
      createdAt: '2026-04-02T10:00:00.000Z',
      endAt: '2026-04-03T11:30:00.000Z',
      id: 'patient-appointment-5',
      myRating: null,
      respondedAt: null,
      siteAddress: 'Calle 80 # 24-19',
      siteName: 'Sede Escuela Clinica',
      startAt: '2026-04-03T10:30:00.000Z',
      status: 'PROPUESTA',
      studentName: 'Valentina Rios',
      teacherName: 'Dr. Sebastian Mora',
      universityName: 'Universidad Clinica del Norte',
    },
  ];

  const reviews: PatientAppointmentReview[] = [
    {
      appointmentLabel: 'Control restaurativo',
      comment:
        'Paciente muy puntual, atento a las indicaciones y comprometido con su seguimiento clinico.',
      createdAt: '2026-04-10T16:20:00.000Z',
      id: 'patient-review-1',
      rating: 5,
      siteName: 'Sede Norte',
      studentName: 'Daniel Pardo',
    },
    {
      appointmentLabel: 'Valoracion inicial',
      comment:
        'La comunicacion durante la cita fue clara y el proceso se pudo desarrollar sin inconvenientes.',
      createdAt: '2026-04-07T13:40:00.000Z',
      id: 'patient-review-2',
      rating: 4,
      siteName: 'Sede Escuela Clinica',
      studentName: 'Valentina Rios',
    },
    {
      appointmentLabel: 'Seguimiento final',
      comment:
        'Asistio a tiempo y mantuvo una muy buena disposicion durante toda la atencion.',
      createdAt: '2026-03-26T09:15:00.000Z',
      id: 'patient-review-3',
      rating: 5,
      siteName: 'Sede Central',
      studentName: 'Camila Perez',
    },
  ];

  return {
    appointments,
    conversations,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    isSearchingStudents: false,
    shouldRefresh: false,
    profile,
    reviews,
    requests,
    studentFilters: createStudentFilterOptions(students),
    students,
  };
}

function upsertPatientRequest(
  requests: PatientRequest[],
  request: PatientRequest,
) {
  const existingRequest = requests.some(
    (currentRequest) => currentRequest.id === request.id,
  );

  return existingRequest
    ? requests.map((currentRequest) =>
        currentRequest.id === request.id ? request : currentRequest,
      )
    : [request, ...requests];
}

function removePatientRequestById(
  requests: PatientRequest[],
  requestId: string,
) {
  return requests.filter((request) => request.id !== requestId);
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

function isPatientModuleState(value: unknown): value is PatientModuleState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PatientModuleState>;

  return (
    Array.isArray(candidate.appointments) &&
    Array.isArray(candidate.conversations) &&
    typeof candidate.profile === 'object' &&
    candidate.profile !== null &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.requests) &&
    typeof candidate.studentFilters === 'object' &&
    candidate.studentFilters !== null &&
    Array.isArray(candidate.students)
  );
}

function persistPatientModuleCache(moduleState: PatientModuleState) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || session?.user.role !== 'PATIENT') {
    return;
  }

  const payload: PersistedPatientModuleCache = {
    ...moduleState,
    students: lastDashboardStudents ?? moduleState.students,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(PATIENT_MODULE_CACHE_STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedPatientModuleCache() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(PATIENT_MODULE_CACHE_STORAGE_KEY);
  storage.removeItem(PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY);
}

function readPersistedPatientModuleCache(): PersistedPatientModuleCache | null {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || session?.user.role !== 'PATIENT') {
    return null;
  }

  const rawCache = storage.getItem(PATIENT_MODULE_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache = JSON.parse(
      rawCache,
    ) as Partial<PersistedPatientModuleCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > PATIENT_MODULE_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      !isPatientModuleState(parsedCache)
    ) {
      storage.removeItem(PATIENT_MODULE_CACHE_STORAGE_KEY);
      return null;
    }

    return parsedCache as PersistedPatientModuleCache;
  } catch {
    storage.removeItem(PATIENT_MODULE_CACHE_STORAGE_KEY);
    return null;
  }
}

function createEmptyRuntimeState(): PatientStoreState {
  return {
    appointments: [],
    conversations: [],
    errorMessage: null,
    isLoading: false,
    isReady: false,
    isSearchingStudents: false,
    profile: {
      avatarAlt: 'Foto del paciente',
      avatarFileName: null,
      avatarSrc: null,
      birthDate: '',
      city: '',
      email: '',
      firstName: '',
      id: '',
      lastName: '',
      locality: '',
      phone: '',
      sex: 'OTRO',
      tutor: null,
    },
    reviews: [],
    requests: [],
    studentFilters: {
      cities: [],
      localities: [],
      treatments: [],
      universities: [],
    },
    shouldRefresh: false,
    students: [],
  };
}

function createRuntimeInitialState(): PatientStoreState {
  const cachedState = readPersistedPatientModuleCache();

  if (!cachedState) {
    return createEmptyRuntimeState();
  }

  lastDashboardStudents = cachedState.students;

  return {
    ...createEmptyRuntimeState(),
    appointments: cachedState.appointments,
    conversations: cachedState.conversations,
    isReady: true,
    profile: cachedState.profile,
    reviews: cachedState.reviews,
    requests: cachedState.requests,
    shouldRefresh: true,
    studentFilters: cachedState.studentFilters,
    students: cachedState.students,
  };
}

const initialMockState = createMockState();

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let nextRequestSequence = initialMockState.requests.length + 1;
let nextConversationSequence = initialMockState.conversations.length + 1;
let nextMessageSequence =
  initialMockState.conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  ) + 1;
let runtimeLoadPromise: Promise<PatientStoreState> | null = null;
let appointmentsRefreshPromise: Promise<void> | null = null;
let reviewsRefreshPromise: Promise<void> | null = null;
let requestsRefreshPromise: Promise<void> | null = null;
let errorMessageDismissTimerId: number | null = null;

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

function scheduleErrorMessageDismiss(nextErrorMessage: string | null) {
  if (IS_TEST_MODE) {
    return;
  }

  errorMessageDismissTimerId = scheduleSystemMessageDismiss(
    errorMessageDismissTimerId,
    nextErrorMessage,
    (message) => {
      if (state.errorMessage === message) {
        patchState({ errorMessage: null });
      }
    },
  );
}

function updateState(nextState: PatientStoreState) {
  const previousErrorMessage = state.errorMessage;

  state = nextState;

  if (previousErrorMessage !== nextState.errorMessage) {
    scheduleErrorMessageDismiss(nextState.errorMessage);
  }

  emitChange();
}

function patchState(partialState: Partial<PatientStoreState>) {
  updateState({
    ...state,
    ...partialState,
  });
}

function extractPatientModuleState(
  storeState: PatientStoreState,
): PatientModuleState {
  return {
    appointments: storeState.appointments,
    conversations: storeState.conversations,
    profile: storeState.profile,
    reviews: storeState.reviews,
    requests: storeState.requests,
    studentFilters: storeState.studentFilters,
    students: storeState.students,
  };
}

function arePatientAppointmentReviewsEqual(
  firstReviews: PatientAppointmentReview[],
  secondReviews: PatientAppointmentReview[],
) {
  if (firstReviews.length !== secondReviews.length) {
    return false;
  }

  return firstReviews.every((firstReview, index) => {
    const secondReview = secondReviews[index];

    return (
      secondReview !== undefined &&
      firstReview.appointmentLabel === secondReview.appointmentLabel &&
      firstReview.comment === secondReview.comment &&
      firstReview.createdAt === secondReview.createdAt &&
      firstReview.id === secondReview.id &&
      firstReview.rating === secondReview.rating &&
      firstReview.siteName === secondReview.siteName &&
      firstReview.studentName === secondReview.studentName
    );
  });
}

function setRuntimeState(
  nextState: PatientStoreState,
  options: {
    persistCache?: boolean;
    updateDashboardStudents?: boolean;
  } = {},
) {
  if (options.updateDashboardStudents) {
    lastDashboardStudents = nextState.students;
  }

  if (options.persistCache && !IS_TEST_MODE) {
    persistPatientModuleCache(extractPatientModuleState(nextState));
  }

  updateState(nextState);
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeSearchFilterValue(value: string | number | undefined) {
  if (value === undefined) {
    return '';
  }

  const normalizedValue = String(value).trim();

  return normalizedValue && normalizedValue !== 'all' ? normalizedValue : '';
}

function createStudentSearchCacheKey(
  filters: PatientStudentDirectorySearchParams,
) {
  return JSON.stringify({
    city: normalizeSearchFilterValue(filters.city),
    limit: normalizeSearchFilterValue(filters.limit),
    locality: normalizeSearchFilterValue(filters.locality),
    search: normalizeSearchFilterValue(filters.search).toLowerCase(),
    treatment: normalizeSearchFilterValue(filters.treatment),
    university: normalizeSearchFilterValue(filters.university),
  });
}

function getCachedStudentSearch(cacheKey: string) {
  const cachedSearch = studentSearchCache.get(cacheKey);

  if (!cachedSearch) {
    return null;
  }

  if (
    Date.now() - cachedSearch.updatedAt >
    PATIENT_STUDENT_SEARCH_CACHE_MAX_AGE_MS
  ) {
    studentSearchCache.delete(cacheKey);
    return null;
  }

  return cachedSearch.students;
}

function cacheStudentSearch(
  cacheKey: string,
  students: PatientStudentDirectoryItem[],
) {
  studentSearchCache.set(cacheKey, {
    students,
    updatedAt: Date.now(),
  });

  if (studentSearchCache.size <= PATIENT_STUDENT_SEARCH_CACHE_MAX_ENTRIES) {
    return;
  }

  const oldestKey = studentSearchCache.keys().next().value;

  if (oldestKey) {
    studentSearchCache.delete(oldestKey);
  }
}

function getStudentSearchLimit(filters: PatientStudentDirectorySearchParams) {
  return Math.min(Math.max(filters.limit ?? 20, 1), 120);
}

function getFreshStudentDirectoryIndex() {
  if (!studentDirectoryIndex) {
    const persistedStudents = readPersistedStudentDirectoryIndex();

    if (persistedStudents) {
      studentDirectoryIndex = persistedStudents;
      studentDirectoryIndexUpdatedAt = Date.now();
      return studentDirectoryIndex;
    }

    return null;
  }

  if (
    Date.now() - studentDirectoryIndexUpdatedAt >
    PATIENT_STUDENT_DIRECTORY_INDEX_MAX_AGE_MS
  ) {
    studentDirectoryIndex = null;
    studentDirectoryIndexUpdatedAt = 0;
    return null;
  }

  return studentDirectoryIndex;
}

function persistStudentDirectoryIndex(students: PatientStudentDirectoryItem[]) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || session?.user.role !== 'PATIENT') {
    return;
  }

  const payload: PersistedStudentDirectoryIndexCache = {
    students,
    updatedAt: Date.now(),
    userId: session.user.id,
    version: PATIENT_STUDENT_DIRECTORY_INDEX_CACHE_VERSION,
  };

  storage.setItem(
    PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

function readPersistedStudentDirectoryIndex() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || session?.user.role !== 'PATIENT') {
    return null;
  }

  const rawCache = storage.getItem(PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache = JSON.parse(
      rawCache,
    ) as Partial<PersistedStudentDirectoryIndexCache>;

    if (
      !Array.isArray(parsedCache.students) ||
      parsedCache.students.length < PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT ||
      typeof parsedCache.updatedAt !== 'number' ||
      parsedCache.version !== PATIENT_STUDENT_DIRECTORY_INDEX_CACHE_VERSION ||
      parsedCache.userId !== session.user.id ||
      Date.now() - parsedCache.updatedAt >
        PATIENT_STUDENT_DIRECTORY_INDEX_MAX_AGE_MS
    ) {
      storage.removeItem(PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY);
      return null;
    }

    return parsedCache.students;
  } catch {
    storage.removeItem(PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY);
    return null;
  }
}

function clearStudentDirectorySearchState(
  options: { persisted?: boolean } = {},
) {
  studentSearchCache.clear();
  studentSearchPromises.clear();
  studentDirectoryIndex = null;
  studentDirectoryIndexPromise = null;
  studentDirectoryIndexUpdatedAt = 0;

  if (!options.persisted) {
    return;
  }

  const storage = readSessionStorage();
  storage?.removeItem(PATIENT_STUDENT_DIRECTORY_INDEX_STORAGE_KEY);
}

function hasNewlyClosedPatientRequest(
  previousRequests: PatientRequest[],
  nextRequests: PatientRequest[],
) {
  const nextRequestIds = new Set(nextRequests.map((request) => request.id));
  const hasClosedRequest = nextRequests.some((request) => {
    if (request.status !== 'CERRADA') {
      return false;
    }

    return (
      previousRequests.find(
        (previousRequest) => previousRequest.id === request.id,
      )?.status !== 'CERRADA'
    );
  });

  if (hasClosedRequest) {
    return true;
  }

  return previousRequests.some(
    (request) =>
      (request.status === 'PENDIENTE' || request.status === 'ACEPTADA') &&
      !nextRequestIds.has(request.id),
  );
}

function filterStudentDirectoryIndex(
  filters: PatientStudentDirectorySearchParams,
  source: PatientStudentDirectoryItem[],
) {
  return source
    .filter(isSearchableStudent)
    .filter((student) => matchesStudentSearch(student, filters))
    .slice(0, getStudentSearchLimit(filters));
}

function hasActiveStudentSearchFilters(
  filters: PatientStudentDirectorySearchParams,
) {
  return Boolean(
    normalizeSearchFilterValue(filters.search) ||
    normalizeSearchFilterValue(filters.treatment) ||
    normalizeSearchFilterValue(filters.city) ||
    normalizeSearchFilterValue(filters.locality) ||
    normalizeSearchFilterValue(filters.university),
  );
}

function cacheDefaultStudentSearch(moduleState: PatientModuleState) {
  if (moduleState.students.length === 0) {
    return;
  }

  lastDashboardStudents = moduleState.students;
}

function getFallbackStudentSearchSource() {
  return (
    getFreshStudentDirectoryIndex() ??
    lastDashboardStudents ??
    (state.students.length > 0 ? state.students : null)
  );
}

function patchStudentsFromLocalSearchSource(
  filters: PatientStudentDirectorySearchParams,
  source: PatientStudentDirectoryItem[],
  cacheKey: string,
  options: {
    cacheResult?: boolean;
    isSearchingStudents?: boolean;
  } = {},
) {
  const localStudents = filterStudentDirectoryIndex(filters, source);
  const shouldCacheResult = options.cacheResult ?? true;

  if (shouldCacheResult) {
    cacheStudentSearch(cacheKey, localStudents);
  }

  patchState({
    errorMessage: null,
    isReady: true,
    isSearchingStudents: options.isSearchingStudents ?? false,
    students: localStudents,
  });

  return localStudents;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError && error.statusCode >= 500) {
    return fallbackMessage;
  }

  if (error instanceof Error && error.message !== 'Unexpected server error') {
    return error.message;
  }

  return fallbackMessage;
}

function normalizeProfile(values: PatientProfileFormValues): PatientProfile {
  return {
    ...state.profile,
    avatarFileName: values.avatarFileName,
    avatarSrc: values.avatarSrc,
    city: normalizeText(values.city),
    locality: normalizeText(values.locality),
    phone: normalizeText(values.phone),
  };
}

function buildConversationFromRequest(request: PatientRequest) {
  return {
    id:
      request.conversationId ??
      `patient-conversation-${nextConversationSequence++}`,
    messages: [],
    reason: request.reason,
    requestId: request.id,
    status: 'ACTIVA',
    studentId: request.studentId,
    studentName: request.studentName,
    universityName: request.universityName,
    unreadCount: 0,
  } satisfies PatientConversation;
}

function hasActiveRequestForStudent(studentId: string) {
  return state.requests.some(
    (request) =>
      request.studentId === studentId &&
      (request.status === 'PENDIENTE' || request.status === 'ACEPTADA'),
  );
}

function updateProfileMock(values: PatientProfileFormValues) {
  updateState({
    ...state,
    profile: normalizeProfile(values),
  });
}

function createRequestMock(studentId: string, reason: string) {
  const normalizedReason = normalizeText(reason);
  const selectedStudent = state.students.find(
    (student) => student.id === studentId,
  );

  if (!selectedStudent || !normalizedReason) {
    return null;
  }

  if (hasActiveRequestForStudent(studentId)) {
    return null;
  }

  const nextRequest: PatientRequest = {
    appointmentsCount: 0,
    conversationId: null,
    id: `patient-request-${nextRequestSequence++}`,
    reason: normalizedReason,
    responseAt: null,
    sentAt: new Date().toISOString(),
    status: 'PENDIENTE',
    studentId: selectedStudent.id,
    studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
    universityName: selectedStudent.universityName,
  };

  updateState({
    ...state,
    requests: [nextRequest, ...state.requests],
  });

  return nextRequest;
}

function buildOptimisticPatientRequest(studentId: string, reason: string) {
  const normalizedReason = normalizeText(reason);
  const selectedStudent = state.students.find(
    (student) => student.id === studentId,
  );

  if (!selectedStudent || !normalizedReason) {
    return null;
  }

  if (hasActiveRequestForStudent(studentId)) {
    return null;
  }

  return {
    appointmentsCount: 0,
    conversationId: null,
    id: `optimistic-patient-request-${Date.now()}`,
    reason: normalizedReason,
    responseAt: null,
    sentAt: new Date().toISOString(),
    status: 'PENDIENTE',
    studentId: selectedStudent.id,
    studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
    universityName: selectedStudent.universityName,
  } satisfies PatientRequest;
}

function updateRequestStatusMock(
  requestId: string,
  status: PatientRequestStatus,
) {
  const currentRequest = state.requests.find(
    (request) => request.id === requestId,
  );

  if (!currentRequest) {
    return false;
  }

  const currentConversation = currentRequest.conversationId
    ? (state.conversations.find(
        (conversation) => conversation.id === currentRequest.conversationId,
      ) ?? null)
    : null;

  updateState({
    ...state,
    conversations: currentConversation
      ? state.conversations.map((conversation) =>
          conversation.id === currentConversation.id
            ? {
                ...conversation,
                status:
                  status === 'ACEPTADA'
                    ? 'ACTIVA'
                    : status === 'CANCELADA' || status === 'CERRADA'
                      ? 'CERRADA'
                      : conversation.status,
              }
            : conversation,
        )
      : state.conversations,
    requests:
      status === 'CANCELADA' || status === 'CERRADA' || status === 'RECHAZADA'
        ? state.requests.filter((request) => request.id !== requestId)
        : state.requests.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  responseAt: new Date().toISOString(),
                  status,
                }
              : request,
          ),
  });

  return true;
}

function sendConversationMessageMock(conversationId: string, content: string) {
  const normalizedContent = normalizeText(content);
  const currentConversation = state.conversations.find(
    (conversation) => conversation.id === conversationId,
  );

  if (currentConversation?.status !== 'ACTIVA' || !normalizedContent) {
    return false;
  }

  const nextMessage: PatientConversationMessage = {
    author: 'PACIENTE',
    authorName: `${state.profile.firstName} ${state.profile.lastName}`,
    content: normalizedContent,
    id: `patient-message-${nextMessageSequence++}`,
    sentAt: new Date().toISOString(),
  };

  updateState({
    ...state,
    conversations: state.conversations.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            messages: [...conversation.messages, nextMessage],
          }
        : conversation,
    ),
  });

  return true;
}

function updateAppointmentStatusMock(
  appointmentId: string,
  status: PatientAppointmentStatus,
) {
  const currentAppointment = state.appointments.find(
    (appointment) => appointment.id === appointmentId,
  );

  if (!currentAppointment) {
    return false;
  }

  updateState({
    ...state,
    appointments: state.appointments.map((appointment) =>
      appointment.id === appointmentId
        ? {
            ...appointment,
            isRescheduleProposal: false,
            status:
              appointment.isRescheduleProposal && status === 'RECHAZADA'
                ? 'ACEPTADA'
                : status,
          }
        : appointment,
    ),
  });

  return true;
}

async function loadRuntimeState(
  forceRefresh = false,
  options: { preserveStudents?: boolean } = {},
) {
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
    isLoading: !state.isReady,
  });

  runtimeLoadPromise = getPatientPortalDashboard()
    .then((payload) => {
      if (hasNewlyClosedPatientRequest(state.requests, payload.requests)) {
        clearStudentDirectorySearchState({ persisted: true });
      }

      const nextState: PatientStoreState = {
        ...createEmptyRuntimeState(),
        ...payload,
        conversations: payload.conversations.map((dashboardConv) => {
          const currentConv = state.conversations.find(
            (c) => c.id === dashboardConv.id,
          );
          if (
            currentConv &&
            currentConv.messages.length > dashboardConv.messages.length
          ) {
            return { ...dashboardConv, messages: currentConv.messages };
          }
          return dashboardConv;
        }),
        errorMessage: null,
        isLoading: false,
        isReady: true,
        isSearchingStudents: false,
        shouldRefresh: false,
        students:
          options.preserveStudents && state.students.length > 0
            ? state.students
            : payload.students,
      };

      cacheDefaultStudentSearch(payload);
      setRuntimeState(nextState, {
        persistCache: true,
        updateDashboardStudents: !options.preserveStudents,
      });
      void prefetchStudentDirectory();

      nextRequestSequence = payload.requests.length + 1;
      nextConversationSequence = payload.conversations.length + 1;
      nextMessageSequence =
        payload.conversations.reduce(
          (total, conversation) => total + conversation.messages.length,
          0,
        ) + 1;

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(
          error,
          'No pudimos cargar el portal del paciente.',
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

export async function refreshPatientModuleState(
  options: { preserveStudents?: boolean } = {},
) {
  await loadRuntimeState(true, options);
}

export async function refreshPatientAppointmentsState() {
  if (IS_TEST_MODE) {
    return;
  }

  if (appointmentsRefreshPromise) {
    return appointmentsRefreshPromise;
  }

  appointmentsRefreshPromise = getPatientPortalAppointments()
    .then((appointments) => {
      setRuntimeState(
        {
          ...state,
          appointments,
        },
        { persistCache: state.isReady },
      );
    })
    .catch(() => {
      // Background appointment sync should not interrupt the visible workflow.
    })
    .finally(() => {
      appointmentsRefreshPromise = null;
    });

  return appointmentsRefreshPromise;
}

export async function refreshPatientReviewsState() {
  if (IS_TEST_MODE) {
    return;
  }

  if (!state.isReady) {
    await loadRuntimeState();
    return;
  }

  if (reviewsRefreshPromise) {
    return reviewsRefreshPromise;
  }

  reviewsRefreshPromise = getPatientPortalReviews()
    .then((reviews) => {
      if (arePatientAppointmentReviewsEqual(state.reviews, reviews)) {
        return;
      }

      setRuntimeState(
        {
          ...state,
          isReady: true,
          reviews,
          shouldRefresh: false,
        },
        { persistCache: true },
      );
    })
    .catch(() => {
      // Background review sync should not interrupt the visible workflow.
    })
    .finally(() => {
      reviewsRefreshPromise = null;
    });

  return reviewsRefreshPromise;
}

function buildMissingConversationsFromRequests(requests: PatientRequest[]) {
  const existingConversationIds = new Set(
    state.conversations.map((conversation) => conversation.id),
  );

  return requests.flatMap((request) => {
    if (
      request.status !== 'ACEPTADA' ||
      !request.conversationId ||
      existingConversationIds.has(request.conversationId)
    ) {
      return [];
    }

    existingConversationIds.add(request.conversationId);
    return [buildConversationFromRequest(request)];
  });
}

export async function refreshPatientRequestsState() {
  if (IS_TEST_MODE) {
    return;
  }

  if (!state.isReady) {
    await loadRuntimeState();
    return;
  }

  if (requestsRefreshPromise) {
    return requestsRefreshPromise;
  }

  requestsRefreshPromise = getPatientPortalRequests()
    .then((requests) => {
      if (hasNewlyClosedPatientRequest(state.requests, requests)) {
        clearStudentDirectorySearchState({ persisted: true });
      }

      const missingConversations =
        buildMissingConversationsFromRequests(requests);

      setRuntimeState(
        {
          ...state,
          conversations:
            missingConversations.length > 0
              ? [...missingConversations, ...state.conversations]
              : state.conversations,
          isReady: true,
          requests,
          shouldRefresh: false,
        },
        { persistCache: true },
      );
    })
    .catch(() => {
      // The full dashboard refresh keeps the visible error handling path.
    })
    .finally(() => {
      requestsRefreshPromise = null;
    });

  return requestsRefreshPromise;
}

async function updateProfile(values: PatientProfileFormValues) {
  if (IS_TEST_MODE) {
    updateProfileMock(values);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const profile = await updatePatientPortalProfile(values);

    setRuntimeState(
      {
        ...state,
        errorMessage: null,
        isLoading: false,
        isReady: true,
        profile,
        shouldRefresh: false,
      },
      {
        persistCache: true,
      },
    );

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar tu perfil.'),
      isLoading: false,
    });
    return false;
  }
}

async function createRequest(studentId: string, reason: string) {
  if (IS_TEST_MODE) {
    return createRequestMock(studentId, reason);
  }

  if (pendingPatientRequestStudentIds.has(studentId)) {
    return null;
  }

  pendingPatientRequestStudentIds.add(studentId);

  let optimisticRequest = buildOptimisticPatientRequest(studentId, reason);

  if (!optimisticRequest && hasActiveRequestForStudent(studentId)) {
    await refreshPatientRequestsState();
    optimisticRequest = buildOptimisticPatientRequest(studentId, reason);
  }

  if (!optimisticRequest) {
    patchState({
      errorMessage:
        'Ya tienes una solicitud activa con este estudiante o la informacion no es valida.',
      isLoading: false,
    });
    pendingPatientRequestStudentIds.delete(studentId);
    return null;
  }

  const requestsSnapshot = state.requests;

  setRuntimeState(
    {
      ...state,
      errorMessage: null,
      isLoading: true,
      isReady: true,
      requests: upsertPatientRequest(state.requests, optimisticRequest),
      shouldRefresh: false,
    },
    {
      persistCache: false,
    },
  );

  try {
    const request = await createPatientPortalRequest(studentId, reason);

    setRuntimeState(
      {
        ...state,
        errorMessage: null,
        isLoading: false,
        isReady: true,
        requests: upsertPatientRequest(
          removePatientRequestById(state.requests, optimisticRequest.id),
          request,
        ),
        shouldRefresh: false,
      },
      {
        persistCache: true,
      },
    );

    return request;
  } catch (error) {
    setRuntimeState(
      {
        ...state,
        errorMessage: getErrorMessage(error, 'No pudimos enviar la solicitud.'),
        isLoading: false,
        requests: requestsSnapshot,
      },
      {
        persistCache: false,
      },
    );
    return null;
  } finally {
    pendingPatientRequestStudentIds.delete(studentId);
  }
}

async function searchStudents(filters: PatientStudentDirectorySearchParams) {
  if (IS_TEST_MODE) {
    const limit = filters.limit ?? 20;
    const filteredStudents = initialMockState.students
      .filter(isSearchableStudent)
      .filter((student) => matchesStudentSearch(student, filters))
      .slice(0, limit);

    patchState({
      students: filteredStudents,
    });

    return filteredStudents;
  }

  const cacheKey = createStudentSearchCacheKey(filters);
  const cachedStudents = getCachedStudentSearch(cacheKey);
  const requestSequence = ++studentSearchRequestSequence;
  const localSearchSource = getFallbackStudentSearchSource();
  const hasActiveFilters = hasActiveStudentSearchFilters(filters);

  if (cachedStudents) {
    patchState({
      errorMessage: null,
      isReady: true,
      isSearchingStudents: false,
      students: cachedStudents,
    });

    if (hasActiveFilters) {
      void refreshStudentSearchFromServer(filters, cacheKey, requestSequence);
    }

    return cachedStudents;
  }

  if (localSearchSource) {
    const currentIndex = getFreshStudentDirectoryIndex();
    const hasCompleteDirectoryIndex =
      Boolean(currentIndex) &&
      currentIndex!.length >= PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT;
    const localStudents = patchStudentsFromLocalSearchSource(
      filters,
      localSearchSource,
      cacheKey,
      {
        cacheResult: hasCompleteDirectoryIndex,
        isSearchingStudents: !hasCompleteDirectoryIndex,
      },
    );

    if (!hasCompleteDirectoryIndex) {
      void prefetchStudentDirectory();
    }

    if (studentDirectoryIndexPromise) {
      void refreshStudentSearchFromDirectoryIndex(
        filters,
        cacheKey,
        requestSequence,
      );
    }

    if (hasActiveFilters) {
      // Always sync with server when filters are active: local index is proximity-sorted
      // so it may not contain students from other localities even if the index is "complete".
      void refreshStudentSearchFromServer(filters, cacheKey, requestSequence);
    }

    return localStudents;
  }

  patchState({
    errorMessage: null,
    isSearchingStudents: true,
  });

  try {
    const students = await fetchStudentSearchFromServer(filters, cacheKey);

    if (requestSequence !== studentSearchRequestSequence) {
      return students;
    }

    patchState({
      errorMessage: null,
      isReady: true,
      isSearchingStudents: false,
      students,
    });

    return students;
  } catch (error) {
    studentSearchPromises.delete(cacheKey);

    if (requestSequence !== studentSearchRequestSequence) {
      return [];
    }

    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos buscar estudiantes.'),
      isSearchingStudents: false,
    });
    return [];
  }
}

async function fetchStudentSearchFromServer(
  filters: PatientStudentDirectorySearchParams,
  cacheKey: string,
) {
  const pendingSearch =
    studentSearchPromises.get(cacheKey) ?? getPatientPortalStudents(filters);

  studentSearchPromises.set(cacheKey, pendingSearch);

  try {
    const students = await pendingSearch;
    cacheStudentSearch(cacheKey, students);

    return students;
  } finally {
    if (studentSearchPromises.get(cacheKey) === pendingSearch) {
      studentSearchPromises.delete(cacheKey);
    }
  }
}

async function refreshStudentSearchFromServer(
  filters: PatientStudentDirectorySearchParams,
  cacheKey: string,
  requestSequence: number,
) {
  try {
    const students = await fetchStudentSearchFromServer(filters, cacheKey);

    if (requestSequence !== studentSearchRequestSequence) {
      return;
    }

    patchState({
      errorMessage: null,
      isReady: true,
      isSearchingStudents: false,
      students,
    });
  } catch {
    if (requestSequence === studentSearchRequestSequence) {
      patchState({
        isSearchingStudents: false,
      });
    }
  }
}

async function refreshStudentSearchFromDirectoryIndex(
  filters: PatientStudentDirectorySearchParams,
  cacheKey: string,
  requestSequence: number,
) {
  try {
    const pendingDirectoryIndex = studentDirectoryIndexPromise;

    if (!pendingDirectoryIndex) {
      return;
    }

    const source = await pendingDirectoryIndex;

    if (requestSequence !== studentSearchRequestSequence) {
      return;
    }

    const indexedStudents = filterStudentDirectoryIndex(filters, source);

    if (
      indexedStudents.length === 0 &&
      hasActiveStudentSearchFilters(filters)
    ) {
      void refreshStudentSearchFromServer(filters, cacheKey, requestSequence);
      return;
    }

    patchStudentsFromLocalSearchSource(filters, source, cacheKey);
  } catch {
    if (requestSequence === studentSearchRequestSequence) {
      void refreshStudentSearchFromServer(filters, cacheKey, requestSequence);
    }
  }
}

async function prefetchStudentDirectory() {
  if (IS_TEST_MODE) {
    return;
  }

  const currentIndex = getFreshStudentDirectoryIndex();

  if (
    currentIndex &&
    currentIndex.length >= PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT
  ) {
    return;
  }

  if (studentDirectoryIndexPromise) {
    await studentDirectoryIndexPromise.catch(() => []);
    return;
  }

  const filters = { limit: PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT };
  const cacheKey = createStudentSearchCacheKey(filters);
  const cachedStudents = getCachedStudentSearch(cacheKey);
  const persistedStudents = readPersistedStudentDirectoryIndex();

  if (cachedStudents) {
    if (cachedStudents.length >= PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT) {
      studentDirectoryIndex = cachedStudents;
      studentDirectoryIndexUpdatedAt = Date.now();
      return;
    }
  }

  if (persistedStudents) {
    if (persistedStudents.length >= PATIENT_STUDENT_DIRECTORY_PREFETCH_LIMIT) {
      studentDirectoryIndex = persistedStudents;
      studentDirectoryIndexUpdatedAt = Date.now();
      cacheStudentSearch(cacheKey, persistedStudents);
      return;
    }
  }

  studentDirectoryIndexPromise = getPatientPortalStudents(filters)
    .then((students) => {
      studentDirectoryIndex = students;
      studentDirectoryIndexUpdatedAt = Date.now();
      cacheStudentSearch(cacheKey, students);
      persistStudentDirectoryIndex(students);
      return students;
    })
    .finally(() => {
      studentDirectoryIndexPromise = null;
    });

  await studentDirectoryIndexPromise.catch(() => []);
}

async function updateRequestStatus(
  requestId: string,
  status: PatientRequestStatus,
) {
  if (IS_TEST_MODE) {
    return updateRequestStatusMock(requestId, status);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const request = await updatePatientPortalRequestStatus(requestId, status);
    const isTerminalRequest =
      request.status === 'CANCELADA' ||
      request.status === 'CERRADA' ||
      request.status === 'RECHAZADA';

    if (isTerminalRequest) {
      clearStudentDirectorySearchState({ persisted: true });
    }

    const nextConversation =
      request.status === 'ACEPTADA' && request.conversationId
        ? (state.conversations.find(
            (conversation) => conversation.id === request.conversationId,
          ) ?? buildConversationFromRequest(request))
        : null;
    const nextConversations =
      request.status === 'CERRADA' && request.conversationId
        ? state.conversations.map((conversation) =>
            conversation.id === request.conversationId
              ? {
                  ...conversation,
                  status: 'CERRADA' as const,
                  unreadCount: 0,
                }
              : conversation,
          )
        : state.conversations;

    setRuntimeState(
      {
        ...state,
        conversations:
          nextConversation &&
          !nextConversations.some(
            (conversation) => conversation.id === nextConversation.id,
          )
            ? [nextConversation, ...state.conversations]
            : nextConversations,
        errorMessage: null,
        isLoading: false,
        isReady: true,
        requests: isTerminalRequest
          ? state.requests.filter(
              (currentRequest) => currentRequest.id !== request.id,
            )
          : state.requests.map((currentRequest) =>
              currentRequest.id === request.id ? request : currentRequest,
            ),
        shouldRefresh: false,
      },
      {
        persistCache: true,
      },
    );

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar la solicitud.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function refreshConversation(conversationId: string) {
  if (IS_TEST_MODE) return;
  try {
    const conversation = await getPatientPortalConversation(conversationId);
    setRuntimeState(
      {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== conversationId) return c;
          const optimisticMessages = c.messages.filter((m) =>
            m.id.startsWith('optimistic-'),
          );
          const currentRealMessages = c.messages.filter(
            (m) => !m.id.startsWith('optimistic-'),
          );
          // If we have more confirmed messages than the API returned, keep ours.
          // This handles the window where a just-sent message hasn't propagated
          // to the conversation endpoint yet (race between send API and read API).
          const baseMessages =
            currentRealMessages.length > conversation.messages.length
              ? currentRealMessages
              : conversation.messages;
          return {
            ...c,
            messages: [...baseMessages, ...optimisticMessages],
            status: conversation.status,
          };
        }),
      },
      {
        persistCache: true,
      },
    );
  } catch {
    // silently ignore - background poll
  }
}

async function sendConversationMessage(
  conversationId: string,
  content: string,
) {
  if (IS_TEST_MODE) {
    return sendConversationMessageMock(conversationId, content);
  }

  const tempId = `optimistic-${Date.now()}`;
  const optimisticMessage: PatientConversationMessage = {
    author: 'PACIENTE',
    authorName: `${state.profile.firstName} ${state.profile.lastName}`,
    content: content.trim(),
    id: tempId,
    sentAt: new Date().toISOString(),
  };

  const conversationsSnapshot = state.conversations;

  setRuntimeState(
    {
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, optimisticMessage],
            }
          : conversation,
      ),
      errorMessage: null,
    },
    { persistCache: false },
  );

  try {
    const message = await sendPatientPortalConversationMessage(
      conversationId,
      content,
    );

    setRuntimeState(
      {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((m) =>
                  m.id === tempId ? message : m,
                ),
              }
            : conversation,
        ),
        errorMessage: null,
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      },
      { persistCache: true },
    );

    return true;
  } catch (error) {
    setRuntimeState(
      {
        ...state,
        conversations: conversationsSnapshot,
        errorMessage: getErrorMessage(error, 'No pudimos enviar el mensaje.'),
        isLoading: false,
      },
      { persistCache: false },
    );
    return false;
  }
}

async function updateAppointmentStatus(
  appointmentId: string,
  status: PatientAppointmentStatus,
) {
  if (IS_TEST_MODE) {
    return updateAppointmentStatusMock(appointmentId, status);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const appointment = await updatePatientPortalAppointmentStatus(
      appointmentId,
      status,
    );

    setRuntimeState(
      {
        ...state,
        appointments: state.appointments.map((currentAppointment) =>
          currentAppointment.id === appointment.id
            ? appointment
            : currentAppointment,
        ),
        errorMessage: null,
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      },
      {
        persistCache: true,
      },
    );

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        status === 'ACEPTADA' || status === 'RECHAZADA'
          ? 'No pudimos responder la reprogramación. Verifica que la propuesta siga vigente y que la fecha no esté vencida.'
          : 'No pudimos actualizar la cita.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function submitAppointmentReview(
  appointmentId: string,
  rating: number,
  comment?: string,
) {
  patchState({ errorMessage: null, isLoading: true });

  try {
    const appointment = await submitPatientPortalAppointmentReview(
      appointmentId,
      rating,
      comment,
    );

    setRuntimeState(
      {
        ...state,
        appointments: state.appointments.map((current) =>
          current.id === appointment.id ? appointment : current,
        ),
        errorMessage: null,
        isLoading: false,
        isReady: true,
        shouldRefresh: false,
      },
      { persistCache: true },
    );

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos guardar tu valoracion.'),
      isLoading: false,
    });
    return false;
  }
}

export function resetPatientModuleState() {
  if (!IS_TEST_MODE) {
    clearPersistedPatientModuleCache();
  }

  state = IS_TEST_MODE ? createMockState() : createEmptyRuntimeState();
  nextRequestSequence = initialMockState.requests.length + 1;
  nextConversationSequence = initialMockState.conversations.length + 1;
  nextMessageSequence =
    initialMockState.conversations.reduce(
      (total, conversation) => total + conversation.messages.length,
      0,
    ) + 1;
  lastDashboardStudents = null;
  studentDirectoryIndex = null;
  studentDirectoryIndexPromise = null;
  studentDirectoryIndexUpdatedAt = 0;
  pendingPatientRequestStudentIds.clear();
  runtimeLoadPromise = null;
  appointmentsRefreshPromise = null;
  reviewsRefreshPromise = null;
  requestsRefreshPromise = null;
  studentSearchCache.clear();
  studentSearchPromises.clear();
  studentSearchRequestSequence = 0;
  emitChange();
}

export function usePatientModuleStore(
  options: UsePatientModuleStoreOptions = {},
) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const shouldAutoLoad = options.autoLoad ?? true;

  useEffect(() => {
    if (
      IS_TEST_MODE ||
      !shouldAutoLoad ||
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

  const actions: PatientModuleActions = {
    createRequest,
    prefetchStudentDirectory,
    refresh: refreshPatientModuleState,
    refreshAppointments: refreshPatientAppointmentsState,
    refreshReviews: refreshPatientReviewsState,
    refreshRequests: refreshPatientRequestsState,
    refreshConversation,
    searchStudents,
    sendConversationMessage,
    submitAppointmentReview,
    updateAppointmentStatus,
    updateProfile,
    updateRequestStatus,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
