import { useEffect, useSyncExternalStore } from 'react';

import type {
  PersonOperationalStatus,
  StudentAgendaAppointment,
  StudentAgendaAppointmentStatus,
  StudentAppointmentType,
  StudentAppointmentFormValues,
  StudentAppointmentReview,
  StudentConversation,
  StudentConversationMessage,
  StudentModuleState,
  StudentPracticeSite,
  StudentProfile,
  StudentProfileFormValues,
  StudentRequest,
  StudentRequestStatus,
  StudentScheduleBlock,
  StudentScheduleBlockFormValues,
  StudentSupervisor,
  StudentTreatment,
  StudentTreatmentType,
} from '@/content/types';
import { ApiError, IS_TEST_MODE } from '@/lib/apiClient';
import { readAuthSession } from '@/lib/authSession';
import {
  createStudentPortalAppointment,
  createStudentPortalScheduleBlock,
  deleteStudentPortalScheduleBlock,
  getStudentPortalConversation,
  getStudentPortalDashboard,
  sendStudentPortalConversationMessage,
  toggleStudentPortalPracticeSiteStatus,
  toggleStudentPortalScheduleBlockStatus,
  toggleStudentPortalTreatmentStatus,
  updateStudentPortalAppointment,
  updateStudentPortalAppointmentStatus,
  getStudentPortalUniversitySites,
  getStudentPortalTreatmentTypes,
  rescheduleStudentPortalAppointment,
  updateStudentPortalPracticeSites,
  updateStudentPortalTreatments,
  updateStudentPortalProfile,
  updateStudentPortalRequestStatus,
  updateStudentPortalScheduleBlock,
  submitStudentPortalAppointmentReview,
} from '@/lib/studentApi';

type StudentModuleActions = {
  deleteScheduleBlock: (blockId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  refreshConversation: (conversationId: string) => Promise<void>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: StudentAgendaAppointmentStatus,
  ) => Promise<boolean>;
  respondToRequest: (
    requestId: string,
    nextStatus: StudentRequestStatus,
  ) => Promise<boolean>;
  sendConversationMessage: (
    conversationId: string,
    content: string,
  ) => Promise<boolean>;
  togglePracticeSiteStatus: (
    practiceSiteId: string,
  ) => Promise<PersonOperationalStatus | null>;
  toggleScheduleBlockStatus: (
    blockId: string,
  ) => Promise<PersonOperationalStatus | null>;
  toggleTreatmentStatus: (
    treatmentId: string,
  ) => Promise<PersonOperationalStatus | null>;
  updateProfile: (values: StudentProfileFormValues) => Promise<boolean>;
  getUniversitySites: () => Promise<StudentPracticeSite[]>;
  updatePracticeSites: (siteIds: string[]) => Promise<boolean>;
  getTreatmentTypes: () => Promise<StudentTreatmentType[]>;
  updateTreatments: (treatmentTypeIds: string[]) => Promise<boolean>;
  upsertAppointment: (
    values: StudentAppointmentFormValues,
    appointmentId?: string,
  ) => Promise<StudentAgendaAppointment | null>;
  rescheduleAppointment: (
    appointmentId: string,
    values: StudentAppointmentFormValues,
  ) => Promise<StudentAgendaAppointment | null>;
  upsertScheduleBlock: (
    values: StudentScheduleBlockFormValues,
    blockId?: string,
  ) => Promise<StudentScheduleBlock | null>;
  checkAppointmentConflict: (
    values: StudentAppointmentFormValues,
    appointmentId?: string,
  ) => string | null;
  submitAppointmentReview: (
    appointmentId: string,
    rating: number,
    comment?: string,
  ) => Promise<boolean>;
};

type StudentStoreState = StudentModuleState & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
  shouldRefresh: boolean;
};

type PersistedStudentModuleCache = {
  dashboard: StudentModuleState;
  updatedAt: number;
  userId: number;
};

type UseStudentModuleStoreOptions = {
  autoLoad?: boolean;
};

const STUDENT_MODULE_CACHE_STORAGE_KEY = 'docqee.student.module-cache';
const STUDENT_MODULE_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const STUDENT_REFERENCE_DATA_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const listeners = new Set<() => void>();

function createMockState(): StudentStoreState {
  const profile: StudentProfile = {
    avatarAlt: 'Foto de perfil de Valentina Rios',
    avatarFileName: null,
    avatarSrc: null,
    availabilityGeneral:
      'Disponibilidad general de lunes a jueves en jornada de tarde y sabados alternos en sede norte.',
    biography:
      'Estudiante de odontologia con enfoque preventivo, interes en rehabilitacion oral y acompanamiento cercano del paciente durante el tratamiento.',
    email: 'valentina.rios@clinicadelnorte.edu.co',
    firstName: 'Valentina',
    id: 'student-profile-1',
    lastName: 'Rios',
    links: [
      {
        id: 'student-link-1',
        type: 'RED_PROFESIONAL',
        url: 'https://linkedin.com/in/valentina-rios-docqee',
      },
      {
        id: 'student-link-2',
        type: 'PORTAFOLIO',
        url: 'https://portfolio.docqee.co/valentina-rios',
      },
    ],
    semester: '8',
    universityLogoAlt: 'Logo de Universidad Clinica del Norte',
    universityLogoSrc: '/Logo_plataforma.ico',
    universityName: 'Universidad Clinica del Norte',
  };

  const treatments: StudentTreatment[] = [
    {
      description:
        'Atencion preventiva, valoracion inicial y acompanamiento de control.',
      id: 'treatment-1',
      treatmentTypeId: 'type-1',
      name: 'Operatoria basica',
      status: 'active',
    },
    {
      description:
        'Manejo de protocolos de higiene oral y educacion al paciente.',
      id: 'treatment-2',
      treatmentTypeId: 'type-2',
      name: 'Promocion y prevencion',
      status: 'active',
    },
    {
      description:
        'Seguimiento del paciente en procedimientos de apoyo restaurativo.',
      id: 'treatment-3',
      treatmentTypeId: 'type-3',
      name: 'Rehabilitacion oral',
      status: 'inactive',
    },
  ];

  const practiceSites: StudentPracticeSite[] = [
    {
      address: 'Cra. 15 # 93-41',
      city: 'Bogota',
      id: 'practice-site-1',
      siteId: 'site-1',
      locality: 'Usaquen',
      name: 'Sede Norte',
      status: 'active',
    },
    {
      address: 'Calle 80 # 24-19',
      city: 'Bogota',
      id: 'practice-site-2',
      siteId: 'site-2',
      locality: 'Barrios Unidos',
      name: 'Sede Escuela Clinica',
      status: 'active',
    },
    {
      address: 'Av. 33 # 74B-11',
      city: 'Medellin',
      id: 'practice-site-3',
      siteId: 'site-3',
      locality: 'Laureles',
      name: 'Sede Clinica Laureles',
      status: 'inactive',
    },
  ];

  const supervisors: StudentSupervisor[] = [
    {
      id: 'student-supervisor-1',
      name: 'Dra. Catalina Mora',
      status: 'active',
    },
    {
      id: 'student-supervisor-2',
      name: 'Dr. Sergio Pineda',
      status: 'active',
    },
    {
      id: 'student-supervisor-3',
      name: 'Dra. Marcela Rojas',
      status: 'inactive',
    },
  ];

  const appointmentTypes: StudentAppointmentType[] = [
    {
      id: 'appointment-type-1',
      name: 'Valoracion inicial',
    },
    {
      id: 'appointment-type-2',
      name: 'Control restaurativo',
    },
    {
      id: 'appointment-type-3',
      name: 'Seguimiento preventivo',
    },
    {
      id: 'appointment-type-4',
      name: 'Revision de sensibilidad',
    },
    {
      id: 'appointment-type-5',
      name: 'Seguimiento final',
    },
  ];

  const scheduleBlocks: StudentScheduleBlock[] = [
    {
      dayOfWeek: null,
      endTime: '12:00',
      id: 'schedule-block-1',
      reason: 'Practica de laboratorio institucional',
      recurrenceEndDate: null,
      recurrenceStartDate: null,
      specificDate: '2026-04-10',
      startTime: '08:00',
      status: 'active',
      type: 'ESPECIFICO',
    },
    {
      dayOfWeek: 3,
      endTime: '18:00',
      id: 'schedule-block-2',
      reason: 'Rotacion academica fija',
      recurrenceEndDate: '2026-07-15',
      recurrenceStartDate: '2026-04-08',
      specificDate: null,
      startTime: '14:00',
      status: 'active',
      type: 'RECURRENTE',
    },
    {
      dayOfWeek: 6,
      endTime: '12:00',
      id: 'schedule-block-3',
      reason: 'Compromiso personal',
      recurrenceEndDate: null,
      recurrenceStartDate: '2026-04-04',
      specificDate: null,
      startTime: '09:00',
      status: 'inactive',
      type: 'RECURRENTE',
    },
  ];

  const appointments: StudentAgendaAppointment[] = [
    {
      additionalInfo:
        'Pendiente de confirmar la propuesta inicial con el paciente.',
      appointmentTypeId: 'appointment-type-1',
      appointmentType: 'Valoracion inicial',
      city: 'Bogota',
      createdAt: '2026-04-05T10:00:00.000Z',
      endAt: '2026-04-06T15:30:00.000Z',
      id: 'student-appointment-1',
      patientName: 'Ana Maria Perez',
      requestId: 'student-request-1',
      respondedAt: null,
      siteId: 'site-1',
      siteName: 'Sede Norte',
      startAt: '2026-04-06T15:00:00.000Z',
      myRating: null,
      status: 'PROPUESTA',
      supervisorId: 'student-supervisor-1',
      supervisorName: 'Dra. Catalina Mora',
      treatmentIds: ['type-1'],
      treatmentNames: ['Operatoria basica'],
    },
    {
      additionalInfo: 'Control confirmado con docente asignado en sede norte.',
      appointmentTypeId: 'appointment-type-2',
      appointmentType: 'Control restaurativo',
      city: 'Bogota',
      createdAt: '2026-04-06T09:00:00.000Z',
      endAt: '2026-04-07T20:00:00.000Z',
      id: 'student-appointment-2',
      patientName: 'Julian Torres',
      requestId: 'student-request-2',
      respondedAt: '2026-04-07T08:00:00.000Z',
      siteId: 'site-1',
      siteName: 'Sede Norte',
      startAt: '2026-04-07T19:00:00.000Z',
      myRating: null,
      status: 'ACEPTADA',
      supervisorId: 'student-supervisor-1',
      supervisorName: 'Dra. Catalina Mora',
      treatmentIds: ['type-1', 'type-2'],
      treatmentNames: ['Operatoria basica', 'Promocion y prevencion'],
    },
    {
      additionalInfo:
        'Reprogramacion solicitada por ajuste de horario del paciente.',
      appointmentTypeId: 'appointment-type-3',
      appointmentType: 'Seguimiento preventivo',
      city: 'Bogota',
      createdAt: '2026-04-07T10:00:00.000Z',
      endAt: '2026-04-08T17:00:00.000Z',
      id: 'student-appointment-3',
      patientName: 'Claudia Moreno',
      requestId: 'student-request-3',
      respondedAt: '2026-04-07T14:00:00.000Z',
      siteId: 'site-2',
      siteName: 'Sede Escuela Clinica',
      startAt: '2026-04-08T16:15:00.000Z',
      myRating: null,
      status: 'REPROGRAMACION_PENDIENTE',
      supervisorId: 'student-supervisor-2',
      supervisorName: 'Dr. Sergio Pineda',
      treatmentIds: ['type-2'],
      treatmentNames: ['Promocion y prevencion'],
    },
    {
      additionalInfo:
        'El paciente cancelo la asistencia y quedo registrado en agenda.',
      appointmentTypeId: 'appointment-type-4',
      appointmentType: 'Revision de sensibilidad',
      city: 'Soacha',
      createdAt: '2026-04-08T11:00:00.000Z',
      endAt: '2026-04-09T14:45:00.000Z',
      id: 'student-appointment-4',
      patientName: 'Ricardo Suarez',
      requestId: 'student-request-4',
      respondedAt: '2026-04-08T13:00:00.000Z',
      siteId: 'site-1',
      siteName: 'Sede Norte',
      startAt: '2026-04-09T14:00:00.000Z',
      myRating: null,
      status: 'CANCELADA',
      supervisorId: 'student-supervisor-1',
      supervisorName: 'Dra. Catalina Mora',
      treatmentIds: ['type-1'],
      treatmentNames: ['Operatoria basica'],
    },
    {
      additionalInfo: 'Cita completada con valoracion del paciente registrada.',
      appointmentTypeId: 'appointment-type-5',
      appointmentType: 'Seguimiento final',
      city: 'Bogota',
      createdAt: '2026-04-03T09:00:00.000Z',
      endAt: '2026-04-04T17:30:00.000Z',
      id: 'student-appointment-5',
      patientName: 'Ricardo Suarez',
      requestId: 'student-request-4',
      respondedAt: '2026-04-03T10:00:00.000Z',
      siteId: 'site-1',
      siteName: 'Sede Norte',
      startAt: '2026-04-04T16:45:00.000Z',
      myRating: null,
      status: 'FINALIZADA',
      supervisorId: 'student-supervisor-2',
      supervisorName: 'Dr. Sergio Pineda',
      treatmentIds: ['type-1', 'type-2'],
      treatmentNames: ['Operatoria basica', 'Promocion y prevencion'],
    },
  ];

  const requests: StudentRequest[] = [
    {
      appointmentsCount: 0,
      conversationId: null,
      conversationEnabled: false,
      id: 'student-request-1',
      patientAge: 29,
      patientCity: 'Bogota',
      patientLocality: 'Chapinero',
      patientName: 'Ana Maria Perez',
      patientProfile: {
        avatarAlt: 'Foto de perfil de Ana Maria Perez',
        avatarSrc: null,
        averageRating: 4.8,
        phone: '3001234567',
        reviews: [
          {
            authorName: 'Laura Gomez',
            comment:
              'Fue muy respetuosa con el proceso, llego puntual y siguio cada recomendacion clinica.',
            createdAt: '2026-03-30T09:15:00.000Z',
            id: 'student-request-1-review-1',
            rating: 5,
          },
          {
            authorName: 'Camilo Vargas',
            comment:
              'Cumplio con el horario acordado y mantuvo una comunicacion clara durante el tratamiento.',
            createdAt: '2026-02-18T15:40:00.000Z',
            id: 'student-request-1-review-2',
            rating: 4.5,
          },
        ],
      },
      reason: 'Dolor dental persistente y revision general.',
      responseAt: null,
      sentAt: '2026-04-04T14:30:00.000Z',
      status: 'PENDIENTE',
    },
    {
      appointmentsCount: 1,
      conversationId: 'student-conversation-1',
      conversationEnabled: true,
      id: 'student-request-2',
      patientAge: 36,
      patientCity: 'Bogota',
      patientLocality: 'Teusaquillo',
      patientName: 'Julian Torres',
      patientProfile: {
        avatarAlt: 'Foto de perfil de Julian Torres',
        avatarSrc: null,
        averageRating: 4.5,
        phone: '3015551020',
        reviews: [
          {
            authorName: 'Daniela Ruiz',
            comment:
              'Asistio preparado a la cita y fue muy receptivo con las indicaciones del seguimiento.',
            createdAt: '2026-03-12T11:10:00.000Z',
            id: 'student-request-2-review-1',
            rating: 4.5,
          },
        ],
      },
      reason: 'Seguimiento de tratamiento restaurativo.',
      responseAt: '2026-04-03T10:00:00.000Z',
      sentAt: '2026-04-02T16:10:00.000Z',
      status: 'ACEPTADA',
    },
    {
      appointmentsCount: 0,
      conversationId: null,
      conversationEnabled: false,
      id: 'student-request-3',
      patientAge: 41,
      patientCity: 'Soacha',
      patientLocality: 'Centro',
      patientName: 'Claudia Moreno',
      patientProfile: {
        avatarAlt: 'Foto de perfil de Claudia Moreno',
        avatarSrc: null,
        averageRating: null,
        phone: '3204448891',
        reviews: [],
      },
      reason: 'Consulta por sensibilidad dental.',
      responseAt: '2026-04-01T09:45:00.000Z',
      sentAt: '2026-03-31T12:20:00.000Z',
      status: 'RECHAZADA',
    },
    {
      appointmentsCount: 2,
      conversationId: 'student-conversation-2',
      conversationEnabled: false,
      id: 'student-request-4',
      patientAge: 33,
      patientCity: 'Bogota',
      patientLocality: 'Suba',
      patientName: 'Ricardo Suarez',
      patientProfile: {
        avatarAlt: 'Foto de perfil de Ricardo Suarez',
        avatarSrc: null,
        averageRating: 5,
        phone: '3159087741',
        reviews: [
          {
            authorName: 'Paula Rojas',
            comment:
              'Mantuvo una actitud colaborativa y siguio muy bien el plan indicado en cada control.',
            createdAt: '2026-03-19T08:55:00.000Z',
            id: 'student-request-4-review-1',
            rating: 5,
          },
        ],
      },
      reason: 'Proceso finalizado con control satisfactorio.',
      responseAt: '2026-03-28T13:15:00.000Z',
      sentAt: '2026-03-18T08:40:00.000Z',
      status: 'CERRADA',
    },
  ];

  const conversations: StudentConversation[] = [
    {
      id: 'student-conversation-1',
      messages: [
        {
          author: 'PACIENTE',
          authorName: 'Julian Torres',
          content:
            'Hola, quisiera confirmar si puedes revisar mi seguimiento esta semana.',
          id: 'student-message-1',
          sentAt: '2026-04-03T10:15:00.000Z',
        },
        {
          author: 'ESTUDIANTE',
          authorName: 'Valentina Rios',
          content:
            'Hola Julian, claro que si. Estoy revisando mis espacios disponibles.',
          id: 'student-message-2',
          sentAt: '2026-04-03T10:24:00.000Z',
        },
        {
          author: 'PACIENTE',
          authorName: 'Julian Torres',
          content: 'Perfecto, quedo atento al horario que me sugieras.',
          id: 'student-message-3',
          sentAt: '2026-04-03T10:29:00.000Z',
        },
      ],
      patientAge: 36,
      patientCity: 'Bogota',
      patientName: 'Julian Torres',
      reason: 'Seguimiento de tratamiento restaurativo.',
      requestId: 'student-request-2',
      status: 'ACTIVA',
      unreadCount: 1,
    },
    {
      id: 'student-conversation-2',
      messages: [
        {
          author: 'PACIENTE',
          authorName: 'Ricardo Suarez',
          content: 'Gracias por el acompanamiento durante el proceso.',
          id: 'student-message-4',
          sentAt: '2026-03-28T13:20:00.000Z',
        },
        {
          author: 'ESTUDIANTE',
          authorName: 'Valentina Rios',
          content:
            'Con gusto, Ricardo. Quedo cerrado el proceso con control satisfactorio.',
          id: 'student-message-5',
          sentAt: '2026-03-28T13:33:00.000Z',
        },
      ],
      patientAge: 33,
      patientCity: 'Bogota',
      patientName: 'Ricardo Suarez',
      reason: 'Proceso finalizado con control satisfactorio.',
      requestId: 'student-request-4',
      status: 'SOLO_LECTURA',
      unreadCount: 0,
    },
  ];

  const reviews: StudentAppointmentReview[] = [
    {
      appointmentId: 'student-appointment-3',
      appointmentLabel: 'Control restaurativo',
      comment:
        'Me senti muy bien acompanado durante la cita. Todo fue claro, ordenado y con mucha paciencia.',
      createdAt: '2026-03-28T15:10:00.000Z',
      id: 'student-review-1',
      patientName: 'Ricardo Suarez',
      rating: 5,
      siteName: 'Sede Norte',
    },
    {
      appointmentId: 'student-appointment-4',
      appointmentLabel: 'Valoracion inicial',
      comment:
        'Explico muy bien el proceso y resolvio mis dudas antes de comenzar la atencion.',
      createdAt: '2026-03-21T11:25:00.000Z',
      id: 'student-review-2',
      patientName: 'Julian Torres',
      rating: 4,
      siteName: 'Sede Escuela Clinica',
    },
    {
      appointmentId: 'student-appointment-5',
      appointmentLabel: 'Seguimiento preventivo',
      comment: null,
      createdAt: '2026-03-15T09:40:00.000Z',
      id: 'student-review-3',
      patientName: 'Claudia Moreno',
      rating: 5,
      siteName: 'Sede Norte',
    },
  ];

  return {
    appointments,
    appointmentTypes,
    conversations,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    practiceSites,
    profile,
    reviews,
    requests,
    scheduleBlocks,
    shouldRefresh: false,
    supervisors,
    treatments,
  };
}

function createEmptyRuntimeModuleState(): StudentModuleState {
  return {
    appointments: [],
    appointmentTypes: [],
    conversations: [],
    practiceSites: [],
    profile: {
      avatarAlt: 'Foto del estudiante',
      avatarFileName: null,
      avatarSrc: null,
      availabilityGeneral: '',
      biography: '',
      email: '',
      firstName: '',
      id: '',
      lastName: '',
      links: [],
      semester: '',
      universityLogoAlt: 'Logo de la universidad',
      universityLogoSrc: null,
      universityName: '',
    },
    reviews: [],
    requests: [],
    scheduleBlocks: [],
    supervisors: [],
    treatments: [],
  };
}

function createEmptyRuntimeState(): StudentStoreState {
  return {
    ...createEmptyRuntimeModuleState(),
    errorMessage: null,
    isLoading: false,
    isReady: false,
    shouldRefresh: false,
  };
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

function isStudentLinkType(value: unknown) {
  return (
    value === 'RED_PROFESIONAL' ||
    value === 'PORTAFOLIO' ||
    value === 'HOJA_DE_VIDA' ||
    value === 'OTRO'
  );
}

function isStudentAgendaStatus(
  value: unknown,
): value is StudentAgendaAppointmentStatus {
  return (
    value === 'PROPUESTA' ||
    value === 'ACEPTADA' ||
    value === 'RECHAZADA' ||
    value === 'CANCELADA' ||
    value === 'FINALIZADA' ||
    value === 'REPROGRAMACION_PENDIENTE'
  );
}

function isStudentRequestStatusValue(
  value: unknown,
): value is StudentRequestStatus {
  return (
    value === 'PENDIENTE' ||
    value === 'ACEPTADA' ||
    value === 'RECHAZADA' ||
    value === 'CERRADA' ||
    value === 'CANCELADA'
  );
}

function isStudentConversationStatusValue(value: unknown) {
  return value === 'ACTIVA' || value === 'SOLO_LECTURA' || value === 'CERRADA';
}

function isStudentScheduleBlockTypeValue(value: unknown) {
  return value === 'ESPECIFICO' || value === 'RECURRENTE';
}

function isStudentProfile(value: unknown): value is StudentProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentProfile>;

  return (
    typeof candidate.avatarAlt === 'string' &&
    (candidate.avatarFileName === null ||
      typeof candidate.avatarFileName === 'string') &&
    (candidate.avatarSrc === null || typeof candidate.avatarSrc === 'string') &&
    typeof candidate.availabilityGeneral === 'string' &&
    typeof candidate.biography === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.firstName === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.lastName === 'string' &&
    Array.isArray(candidate.links) &&
    candidate.links.every(
      (link) =>
        typeof link === 'object' &&
        link !== null &&
        typeof link.id === 'string' &&
        isStudentLinkType(link.type) &&
        typeof link.url === 'string',
    ) &&
    typeof candidate.semester === 'string' &&
    typeof candidate.universityLogoAlt === 'string' &&
    (candidate.universityLogoSrc === null ||
      typeof candidate.universityLogoSrc === 'string') &&
    typeof candidate.universityName === 'string'
  );
}

function isStudentTreatment(value: unknown): value is StudentTreatment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentTreatment>;

  return (
    typeof candidate.description === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function isStudentPracticeSite(value: unknown): value is StudentPracticeSite {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentPracticeSite>;

  return (
    typeof candidate.address === 'string' &&
    typeof candidate.city === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.locality === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function isStudentSupervisor(value: unknown): value is StudentSupervisor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentSupervisor>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive')
  );
}

function isStudentAppointmentType(
  value: unknown,
): value is StudentAppointmentType {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentAppointmentType>;

  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

function isStudentAppointmentReview(
  value: unknown,
): value is StudentAppointmentReview {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentAppointmentReview>;

  return (
    typeof candidate.appointmentLabel === 'string' &&
    (candidate.comment === null || typeof candidate.comment === 'string') &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.patientName === 'string' &&
    typeof candidate.rating === 'number' &&
    typeof candidate.siteName === 'string'
  );
}

function isStudentAgendaAppointment(
  value: unknown,
): value is StudentAgendaAppointment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentAgendaAppointment>;

  return (
    (candidate.additionalInfo === null ||
      typeof candidate.additionalInfo === 'string') &&
    typeof candidate.appointmentTypeId === 'string' &&
    typeof candidate.appointmentType === 'string' &&
    typeof candidate.city === 'string' &&
    typeof candidate.endAt === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.patientName === 'string' &&
    typeof candidate.requestId === 'string' &&
    typeof candidate.siteId === 'string' &&
    typeof candidate.siteName === 'string' &&
    typeof candidate.startAt === 'string' &&
    isStudentAgendaStatus(candidate.status) &&
    typeof candidate.supervisorId === 'string' &&
    typeof candidate.supervisorName === 'string' &&
    Array.isArray(candidate.treatmentIds) &&
    candidate.treatmentIds.every((item) => typeof item === 'string') &&
    Array.isArray(candidate.treatmentNames) &&
    candidate.treatmentNames.every((item) => typeof item === 'string')
  );
}

function isStudentRequestPatientProfileReview(
  value: unknown,
): value is NonNullable<StudentRequest['patientProfile']>['reviews'][number] {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<
    NonNullable<StudentRequest['patientProfile']>['reviews'][number]
  >;

  return (
    typeof candidate.authorName === 'string' &&
    (candidate.comment === null || typeof candidate.comment === 'string') &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.rating === 'number'
  );
}

function isStudentRequestPatientProfile(
  value: unknown,
): value is NonNullable<StudentRequest['patientProfile']> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<
    NonNullable<StudentRequest['patientProfile']>
  >;

  return (
    typeof candidate.avatarAlt === 'string' &&
    (candidate.avatarSrc === null || typeof candidate.avatarSrc === 'string') &&
    (candidate.averageRating === null ||
      typeof candidate.averageRating === 'number') &&
    (candidate.phone === null || typeof candidate.phone === 'string') &&
    Array.isArray(candidate.reviews) &&
    candidate.reviews.every(isStudentRequestPatientProfileReview)
  );
}

function isStudentRequest(value: unknown): value is StudentRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentRequest>;

  return (
    typeof candidate.appointmentsCount === 'number' &&
    (candidate.conversationId === null ||
      typeof candidate.conversationId === 'string') &&
    typeof candidate.conversationEnabled === 'boolean' &&
    typeof candidate.id === 'string' &&
    typeof candidate.patientAge === 'number' &&
    typeof candidate.patientCity === 'string' &&
    (candidate.patientLocality === undefined ||
      candidate.patientLocality === null ||
      typeof candidate.patientLocality === 'string') &&
    typeof candidate.patientName === 'string' &&
    (candidate.patientProfile === undefined ||
      candidate.patientProfile === null ||
      isStudentRequestPatientProfile(candidate.patientProfile)) &&
    (candidate.reason === null || typeof candidate.reason === 'string') &&
    (candidate.responseAt === null ||
      typeof candidate.responseAt === 'string') &&
    typeof candidate.sentAt === 'string' &&
    isStudentRequestStatusValue(candidate.status)
  );
}

function isStudentConversationMessage(
  value: unknown,
): value is StudentConversationMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentConversationMessage>;

  return (
    (candidate.author === 'ESTUDIANTE' || candidate.author === 'PACIENTE') &&
    typeof candidate.authorName === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.id === 'string' &&
    typeof candidate.sentAt === 'string'
  );
}

function isStudentConversation(value: unknown): value is StudentConversation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentConversation>;

  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.messages) &&
    candidate.messages.every(isStudentConversationMessage) &&
    typeof candidate.patientAge === 'number' &&
    typeof candidate.patientCity === 'string' &&
    typeof candidate.patientName === 'string' &&
    (candidate.reason === null || typeof candidate.reason === 'string') &&
    typeof candidate.requestId === 'string' &&
    isStudentConversationStatusValue(candidate.status) &&
    typeof candidate.unreadCount === 'number'
  );
}

function isStudentScheduleBlock(value: unknown): value is StudentScheduleBlock {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentScheduleBlock>;

  return (
    (candidate.dayOfWeek === null || typeof candidate.dayOfWeek === 'number') &&
    typeof candidate.endTime === 'string' &&
    typeof candidate.id === 'string' &&
    (candidate.reason === null || typeof candidate.reason === 'string') &&
    (candidate.recurrenceEndDate === null ||
      typeof candidate.recurrenceEndDate === 'string') &&
    (candidate.recurrenceStartDate === null ||
      typeof candidate.recurrenceStartDate === 'string') &&
    (candidate.specificDate === null ||
      typeof candidate.specificDate === 'string') &&
    typeof candidate.startTime === 'string' &&
    (candidate.status === 'active' || candidate.status === 'inactive') &&
    isStudentScheduleBlockTypeValue(candidate.type)
  );
}

function isStudentModuleData(value: unknown): value is StudentModuleState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<StudentModuleState>;

  return (
    Array.isArray(candidate.appointments) &&
    candidate.appointments.every(isStudentAgendaAppointment) &&
    Array.isArray(candidate.appointmentTypes) &&
    candidate.appointmentTypes.every(isStudentAppointmentType) &&
    Array.isArray(candidate.conversations) &&
    candidate.conversations.every(isStudentConversation) &&
    Array.isArray(candidate.practiceSites) &&
    candidate.practiceSites.every(isStudentPracticeSite) &&
    isStudentProfile(candidate.profile) &&
    Array.isArray(candidate.reviews) &&
    candidate.reviews.every(isStudentAppointmentReview) &&
    Array.isArray(candidate.requests) &&
    candidate.requests.every(isStudentRequest) &&
    Array.isArray(candidate.scheduleBlocks) &&
    candidate.scheduleBlocks.every(isStudentScheduleBlock) &&
    Array.isArray(candidate.supervisors) &&
    candidate.supervisors.every(isStudentSupervisor) &&
    Array.isArray(candidate.treatments) &&
    candidate.treatments.every(isStudentTreatment)
  );
}

function normalizeStudentModuleData(
  value: Partial<StudentModuleState>,
): StudentModuleState {
  const emptyState = createEmptyRuntimeModuleState();

  return {
    appointments: value.appointments ?? emptyState.appointments,
    appointmentTypes: value.appointmentTypes ?? emptyState.appointmentTypes,
    conversations: value.conversations ?? emptyState.conversations,
    practiceSites: value.practiceSites ?? emptyState.practiceSites,
    profile: value.profile
      ? {
          ...emptyState.profile,
          ...value.profile,
          links: value.profile.links ?? emptyState.profile.links,
        }
      : emptyState.profile,
    reviews: value.reviews ?? emptyState.reviews,
    requests: value.requests ?? emptyState.requests,
    scheduleBlocks: value.scheduleBlocks ?? emptyState.scheduleBlocks,
    supervisors: value.supervisors ?? emptyState.supervisors,
    treatments: value.treatments ?? emptyState.treatments,
  };
}

function getPersistableStudentModuleState(
  currentState: StudentStoreState,
): StudentModuleState {
  return {
    appointments: currentState.appointments,
    appointmentTypes: currentState.appointmentTypes,
    conversations: currentState.conversations,
    practiceSites: currentState.practiceSites,
    profile: currentState.profile,
    reviews: currentState.reviews,
    requests: currentState.requests,
    scheduleBlocks: currentState.scheduleBlocks,
    supervisors: currentState.supervisors,
    treatments: currentState.treatments,
  };
}

function persistStudentModuleCache(dashboard: StudentModuleState) {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'STUDENT') {
    return;
  }

  const payload: PersistedStudentModuleCache = {
    dashboard,
    updatedAt: Date.now(),
    userId: session.user.id,
  };

  storage.setItem(STUDENT_MODULE_CACHE_STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedStudentModuleCache() {
  const storage = readSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(STUDENT_MODULE_CACHE_STORAGE_KEY);
}

function readPersistedStudentModuleCache() {
  const storage = readSessionStorage();
  const session = readAuthSession();

  if (!storage || !session || session.user.role !== 'STUDENT') {
    return null;
  }

  const rawCache = storage.getItem(STUDENT_MODULE_CACHE_STORAGE_KEY);

  if (!rawCache) {
    return null;
  }

  try {
    const parsedCache = JSON.parse(
      rawCache,
    ) as Partial<PersistedStudentModuleCache>;

    if (
      typeof parsedCache.updatedAt !== 'number' ||
      Date.now() - parsedCache.updatedAt > STUDENT_MODULE_CACHE_MAX_AGE_MS ||
      parsedCache.userId !== session.user.id ||
      !isStudentModuleData(parsedCache.dashboard)
    ) {
      storage.removeItem(STUDENT_MODULE_CACHE_STORAGE_KEY);
      return null;
    }

    return parsedCache.dashboard;
  } catch {
    storage.removeItem(STUDENT_MODULE_CACHE_STORAGE_KEY);
    return null;
  }
}

function createRuntimeInitialState(): StudentStoreState {
  const cachedDashboard = readPersistedStudentModuleCache();

  if (!cachedDashboard) {
    return createEmptyRuntimeState();
  }

  return {
    ...cachedDashboard,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    shouldRefresh: true,
  };
}

const initialMockState = createMockState();

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let nextLinkSequence = initialMockState.profile.links.length + 1;
let nextAppointmentSequence = initialMockState.appointments.length + 1;
let nextScheduleBlockSequence = initialMockState.scheduleBlocks.length + 1;
let nextConversationSequence = initialMockState.conversations.length + 1;
let nextConversationMessageSequence =
  initialMockState.conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  ) + 1;
let runtimeLoadPromise: Promise<StudentStoreState> | null = null;
const conversationRefreshPromises = new Map<string, Promise<void>>();
let universitySitesCache: {
  data: StudentPracticeSite[];
  expiresAt: number;
} | null = null;
let universitySitesLoadPromise: Promise<StudentPracticeSite[]> | null = null;
let treatmentTypesCache: {
  data: StudentTreatmentType[];
  expiresAt: number;
} | null = null;
let treatmentTypesLoadPromise: Promise<StudentTreatmentType[]> | null = null;

function syncStudentRuntimeSequences(moduleState: StudentModuleState) {
  nextLinkSequence = moduleState.profile.links.length + 1;
  nextAppointmentSequence = moduleState.appointments.length + 1;
  nextScheduleBlockSequence = moduleState.scheduleBlocks.length + 1;
  nextConversationSequence = moduleState.conversations.length + 1;
  nextConversationMessageSequence =
    moduleState.conversations.reduce(
      (total, conversation) => total + conversation.messages.length,
      0,
    ) + 1;
}

if (!IS_TEST_MODE && state.isReady) {
  syncStudentRuntimeSequences(state);
}

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

export function getStudentModuleErrorMessage() {
  return state.errorMessage;
}

function didPersistableStudentModuleStateChange(
  previousState: StudentStoreState,
  nextState: StudentStoreState,
) {
  return (
    previousState.appointments !== nextState.appointments ||
    previousState.appointmentTypes !== nextState.appointmentTypes ||
    previousState.conversations !== nextState.conversations ||
    previousState.practiceSites !== nextState.practiceSites ||
    previousState.profile !== nextState.profile ||
    previousState.reviews !== nextState.reviews ||
    previousState.requests !== nextState.requests ||
    previousState.scheduleBlocks !== nextState.scheduleBlocks ||
    previousState.supervisors !== nextState.supervisors ||
    previousState.treatments !== nextState.treatments
  );
}

function didStudentStoreStateChange(
  previousState: StudentStoreState,
  nextState: StudentStoreState,
) {
  return (
    didPersistableStudentModuleStateChange(previousState, nextState) ||
    previousState.errorMessage !== nextState.errorMessage ||
    previousState.isLoading !== nextState.isLoading ||
    previousState.isReady !== nextState.isReady ||
    previousState.shouldRefresh !== nextState.shouldRefresh
  );
}

function updateState(nextState: StudentStoreState) {
  const previousState = state;

  if (!didStudentStoreStateChange(previousState, nextState)) {
    return;
  }

  state = nextState;

  if (
    !IS_TEST_MODE &&
    nextState.isReady &&
    didPersistableStudentModuleStateChange(previousState, nextState)
  ) {
    persistStudentModuleCache(getPersistableStudentModuleState(nextState));
  }

  emitChange();
}

function patchState(partialState: Partial<StudentStoreState>) {
  updateState({
    ...state,
    ...partialState,
  });
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeNullableText(value: string) {
  const normalizedValue = normalizeText(value);
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function buildConversationForRequest(
  request: StudentRequest,
  status: StudentConversation['status'] = 'ACTIVA',
) {
  const firstMessage: StudentConversationMessage = {
    author: 'PACIENTE',
    authorName: request.patientName,
    content:
      request.reason ??
      'Hola, quisiera continuar la conversacion sobre mi solicitud.',
    id: `student-message-${nextConversationMessageSequence++}`,
    sentAt: new Date().toISOString(),
  };

  return {
    id: `student-conversation-${nextConversationSequence++}`,
    messages: [firstMessage],
    patientAge: request.patientAge,
    patientCity: request.patientCity,
    patientName: request.patientName,
    reason: request.reason,
    requestId: request.id,
    status,
    unreadCount: 1,
  } satisfies StudentConversation;
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

function normalizeProfile(values: StudentProfileFormValues): StudentProfile {
  return {
    ...state.profile,
    avatarFileName: values.avatarFileName,
    avatarSrc: values.avatarSrc,
    availabilityGeneral: normalizeText(values.availabilityGeneral),
    biography: normalizeText(values.biography),
    links: values.links.map((link) => ({
      ...link,
      url: normalizeText(link.url),
    })),
  };
}

function normalizeScheduleBlockInput(values: StudentScheduleBlockFormValues) {
  return {
    dayOfWeek:
      values.type === 'RECURRENTE' && values.dayOfWeek
        ? Number(values.dayOfWeek)
        : null,
    endTime: values.endTime,
    reason: normalizeNullableText(values.reason),
    recurrenceEndDate:
      values.type === 'RECURRENTE'
        ? normalizeNullableText(values.recurrenceEndDate)
        : null,
    recurrenceStartDate:
      values.type === 'RECURRENTE'
        ? normalizeNullableText(values.recurrenceStartDate)
        : null,
    specificDate:
      values.type === 'ESPECIFICO'
        ? normalizeNullableText(values.specificDate)
        : null,
    startTime: values.startTime,
    type: values.type,
  } satisfies Omit<StudentScheduleBlock, 'id' | 'status'>;
}

function normalizeAppointmentInput(values: StudentAppointmentFormValues) {
  return {
    additionalInfo: normalizeNullableText(values.additionalInfo),
    appointmentTypeId: values.appointmentTypeId,
    endTime: values.endTime,
    requestId: values.requestId,
    siteId: values.siteId,
    startDate: values.startDate,
    startTime: values.startTime,
    supervisorId: values.supervisorId,
    treatmentIds: values.treatmentIds,
  };
}

function buildDateTime(dateValue: string, timeValue: string) {
  const [year = 2026, month = 1, day = 1] = dateValue.split('-').map(Number);
  const [hours = 0, minutes = 0] = timeValue.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

const BOGOTA_TIME_ZONE = 'America/Bogota';
const bogotaDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  timeZone: BOGOTA_TIME_ZONE,
  year: 'numeric',
});

function getBogotaDateTimeParts(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = bogotaDateTimeFormatter.formatToParts(date);
  const findPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    day: findPart('day'),
    hour: findPart('hour'),
    minute: findPart('minute'),
    month: findPart('month'),
    year: findPart('year'),
  };
}

function formatBogotaDateInputValue(value: Date | string) {
  const parts = getBogotaDateTimeParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatBogotaTimeInputValue(value: Date | string) {
  const parts = getBogotaDateTimeParts(value);
  return `${parts.hour}:${parts.minute}`;
}

function getCurrentBogotaMinute() {
  const now = new Date();
  return buildDateTime(
    formatBogotaDateInputValue(now),
    formatBogotaTimeInputValue(now),
  );
}

function doesScheduleBlockMatchDate(
  block: StudentScheduleBlock,
  dateValue: string,
) {
  if (block.type === 'ESPECIFICO') {
    return block.specificDate === dateValue;
  }

  if (!block.dayOfWeek || !block.recurrenceStartDate) {
    return false;
  }

  if (dateValue < block.recurrenceStartDate) {
    return false;
  }

  if (block.recurrenceEndDate && dateValue > block.recurrenceEndDate) {
    return false;
  }

  const date = buildDateTime(dateValue, '00:00');
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  return weekday === block.dayOfWeek;
}

function rangesOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function findAppointmentValidationError(
  values: StudentAppointmentFormValues,
  appointmentId?: string,
) {
  const normalized = normalizeAppointmentInput(values);
  const request = state.requests.find(
    (currentRequest) => currentRequest.id === normalized.requestId,
  );

  if (!request || request.status !== 'ACEPTADA') {
    return 'Debes seleccionar una solicitud aceptada para programar la cita.';
  }

  const site = state.practiceSites.find(
    (practiceSite) => practiceSite.siteId === normalized.siteId,
  );
  if (!site || site.status !== 'active') {
    return 'Selecciona una sede activa para programar la cita.';
  }

  const supervisor = state.supervisors.find(
    (currentSupervisor) => currentSupervisor.id === normalized.supervisorId,
  );
  if (!supervisor || supervisor.status !== 'active') {
    return 'Selecciona un docente supervisor activo.';
  }

  const appointmentType = state.appointmentTypes.find(
    (currentAppointmentType) =>
      currentAppointmentType.id === normalized.appointmentTypeId,
  );
  if (!appointmentType) {
    return 'Selecciona un tipo de cita valido.';
  }

  if (normalized.treatmentIds.length === 0) {
    return 'Selecciona al menos un tratamiento asociado a la cita.';
  }

  const selectedTreatments = normalized.treatmentIds.map((treatmentId) =>
    state.treatments.find(
      (treatment) => treatment.treatmentTypeId === treatmentId,
    ),
  );
  if (
    selectedTreatments.some(
      (treatment) => !treatment || treatment.status !== 'active',
    )
  ) {
    return 'Todos los tratamientos de la cita deben estar activos.';
  }

  const startAt = buildDateTime(normalized.startDate, normalized.startTime);
  const endAt = buildDateTime(normalized.startDate, normalized.endTime);
  if (startAt < getCurrentBogotaMinute()) {
    return 'La cita debe iniciar en una fecha y hora actuales o futuras.';
  }

  if (endAt <= startAt) {
    return 'La hora final debe ser posterior a la hora inicial.';
  }

  const hasConflictingAppointment = state.appointments.some((appointment) => {
    if (appointment.id === appointmentId) {
      return false;
    }

    if (
      appointment.status === 'CANCELADA' ||
      appointment.status === 'FINALIZADA'
    ) {
      return false;
    }

    const appointmentDate = formatBogotaDateInputValue(appointment.startAt);

    if (appointmentDate !== normalized.startDate) {
      return false;
    }

    return rangesOverlap(
      normalized.startTime,
      normalized.endTime,
      formatBogotaTimeInputValue(appointment.startAt),
      formatBogotaTimeInputValue(appointment.endAt),
    );
  });

  if (hasConflictingAppointment) {
    return 'Ya existe otra cita en esa franja horaria.';
  }

  const hasConflictingBlock = state.scheduleBlocks.some((block) => {
    if (block.status !== 'active') {
      return false;
    }

    if (!doesScheduleBlockMatchDate(block, normalized.startDate)) {
      return false;
    }

    return rangesOverlap(
      normalized.startTime,
      normalized.endTime,
      block.startTime,
      block.endTime,
    );
  });

  if (hasConflictingBlock) {
    return 'La franja seleccionada se encuentra bloqueada en tu agenda.';
  }

  return null;
}

function updateProfileMock(values: StudentProfileFormValues) {
  updateState({
    ...state,
    profile: normalizeProfile(values),
  });
}

function areConversationMessagesEqual(
  firstMessages: StudentConversationMessage[],
  secondMessages: StudentConversationMessage[],
) {
  if (firstMessages.length !== secondMessages.length) {
    return false;
  }

  return firstMessages.every((message, index) => {
    const nextMessage = secondMessages[index];

    if (!nextMessage) {
      return false;
    }

    return (
      message.id === nextMessage.id &&
      message.author === nextMessage.author &&
      message.authorName === nextMessage.authorName &&
      message.content === nextMessage.content &&
      message.sentAt === nextMessage.sentAt
    );
  });
}

function updatePracticeSitesMock(siteIds: string[]) {
  const selectedSiteIds = new Set(siteIds);

  updateState({
    ...state,
    practiceSites: state.practiceSites.map((practiceSite) => ({
      ...practiceSite,
      status: selectedSiteIds.has(practiceSite.siteId) ? 'active' : 'inactive',
    })),
  });
}

function updateTreatmentsMock(treatmentTypeIds: string[]) {
  const selectedTreatmentTypeIds = new Set(treatmentTypeIds);

  updateState({
    ...state,
    treatments: state.treatments.map((treatment) => ({
      ...treatment,
      status: selectedTreatmentTypeIds.has(treatment.treatmentTypeId)
        ? 'active'
        : 'inactive',
    })),
  });
}

function toggleTreatmentStatusMock(treatmentId: string) {
  const currentTreatment = state.treatments.find(
    (treatment) => treatment.id === treatmentId,
  );

  if (!currentTreatment) {
    return null;
  }

  const nextStatus: PersonOperationalStatus =
    currentTreatment.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    treatments: state.treatments.map((treatment) =>
      treatment.id === treatmentId
        ? { ...treatment, status: nextStatus }
        : treatment,
    ),
  });

  return nextStatus;
}

function togglePracticeSiteStatusMock(practiceSiteId: string) {
  const currentPracticeSite = state.practiceSites.find(
    (practiceSite) => practiceSite.id === practiceSiteId,
  );

  if (!currentPracticeSite) {
    return null;
  }

  const nextStatus: PersonOperationalStatus =
    currentPracticeSite.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    practiceSites: state.practiceSites.map((practiceSite) =>
      practiceSite.id === practiceSiteId
        ? { ...practiceSite, status: nextStatus }
        : practiceSite,
    ),
  });

  return nextStatus;
}

function upsertScheduleBlockMock(
  values: StudentScheduleBlockFormValues,
  blockId?: string,
) {
  const normalizedBlock = normalizeScheduleBlockInput(values);

  if (blockId) {
    const existingBlock = state.scheduleBlocks.find(
      (block) => block.id === blockId,
    );

    if (!existingBlock) {
      return null;
    }

    const nextBlock: StudentScheduleBlock = {
      ...existingBlock,
      ...normalizedBlock,
    };

    updateState({
      ...state,
      scheduleBlocks: state.scheduleBlocks.map((block) =>
        block.id === blockId ? nextBlock : block,
      ),
    });

    return nextBlock;
  }

  const nextBlock: StudentScheduleBlock = {
    ...normalizedBlock,
    id: `schedule-block-${nextScheduleBlockSequence}`,
    status: 'active',
  };

  nextScheduleBlockSequence += 1;

  updateState({
    ...state,
    scheduleBlocks: [nextBlock, ...state.scheduleBlocks],
  });

  return nextBlock;
}

function upsertAppointmentMock(
  values: StudentAppointmentFormValues,
  appointmentId?: string,
) {
  const validationError = findAppointmentValidationError(values, appointmentId);

  if (validationError) {
    patchState({
      errorMessage: validationError,
      isLoading: false,
    });
    return null;
  }

  const normalized = normalizeAppointmentInput(values);
  const request = state.requests.find(
    (currentRequest) => currentRequest.id === normalized.requestId,
  );
  const site = state.practiceSites.find(
    (practiceSite) => practiceSite.siteId === normalized.siteId,
  );
  const supervisor = state.supervisors.find(
    (currentSupervisor) => currentSupervisor.id === normalized.supervisorId,
  );
  const appointmentType = state.appointmentTypes.find(
    (currentAppointmentType) =>
      currentAppointmentType.id === normalized.appointmentTypeId,
  );
  const treatmentNames: string[] = normalized.treatmentIds
    .map(
      (treatmentId) =>
        state.treatments.find(
          (treatment) => treatment.treatmentTypeId === treatmentId,
        )?.name ?? '',
    )
    .filter(
      (treatmentName): treatmentName is string => treatmentName.length > 0,
    );
  const nextAppointment: StudentAgendaAppointment = {
    additionalInfo: normalized.additionalInfo,
    appointmentType: appointmentType?.name ?? 'Cita clinica',
    appointmentTypeId: normalized.appointmentTypeId,
    city: site?.city ?? '',
    createdAt: new Date().toISOString(),
    endAt: buildDateTime(
      normalized.startDate,
      normalized.endTime,
    ).toISOString(),
    id: appointmentId ?? `student-appointment-${nextAppointmentSequence}`,
    patientName: request?.patientName ?? '',
    requestId: normalized.requestId,
    respondedAt: null,
    siteId: normalized.siteId,
    siteName: site?.name ?? '',
    startAt: buildDateTime(
      normalized.startDate,
      normalized.startTime,
    ).toISOString(),
    status: appointmentId
      ? (state.appointments.find(
          (appointment) => appointment.id === appointmentId,
        )?.status ?? 'PROPUESTA')
      : 'PROPUESTA',
    myRating: null,
    supervisorId: normalized.supervisorId,
    supervisorName: supervisor?.name ?? '',
    treatmentIds: normalized.treatmentIds,
    treatmentNames,
  };

  if (!appointmentId) {
    nextAppointmentSequence += 1;
  }

  const previousRequestId = appointmentId
    ? (state.appointments.find(
        (appointment) => appointment.id === appointmentId,
      )?.requestId ?? null)
    : null;

  updateState({
    ...state,
    errorMessage: null,
    appointments: appointmentId
      ? state.appointments.map((appointment) =>
          appointment.id === appointmentId ? nextAppointment : appointment,
        )
      : [nextAppointment, ...state.appointments],
    requests: state.requests.map((currentRequest) => {
      const currentCount = currentRequest.appointmentsCount;
      const shouldIncrease =
        currentRequest.id === normalized.requestId &&
        previousRequestId !== normalized.requestId;
      const shouldDecrease =
        !!previousRequestId &&
        currentRequest.id === previousRequestId &&
        previousRequestId !== normalized.requestId;

      return {
        ...currentRequest,
        appointmentsCount: shouldIncrease
          ? currentCount + 1
          : shouldDecrease
            ? Math.max(0, currentCount - 1)
            : currentCount,
      };
    }),
  });

  return nextAppointment;
}

function rescheduleAppointmentMock(
  appointmentId: string,
  values: StudentAppointmentFormValues,
) {
  const currentAppointment = state.appointments.find(
    (appointment) => appointment.id === appointmentId,
  );

  if (!currentAppointment || currentAppointment.status !== 'ACEPTADA') {
    patchState({
      errorMessage: 'Solo puedes reprogramar citas aceptadas.',
      isLoading: false,
    });
    return null;
  }

  const validationError = findAppointmentValidationError(values, appointmentId);

  if (validationError) {
    patchState({
      errorMessage: validationError,
      isLoading: false,
    });
    return null;
  }

  const normalized = normalizeAppointmentInput(values);
  const site = state.practiceSites.find(
    (practiceSite) => practiceSite.siteId === normalized.siteId,
  );
  const supervisor = state.supervisors.find(
    (currentSupervisor) => currentSupervisor.id === normalized.supervisorId,
  );
  const nextAppointment: StudentAgendaAppointment = {
    ...currentAppointment,
    city: site?.city ?? currentAppointment.city,
    endAt: buildDateTime(
      normalized.startDate,
      normalized.endTime,
    ).toISOString(),
    isRescheduleProposal: true,
    respondedAt: null,
    siteId: normalized.siteId,
    siteName: site?.name ?? currentAppointment.siteName,
    startAt: buildDateTime(
      normalized.startDate,
      normalized.startTime,
    ).toISOString(),
    status: 'PROPUESTA',
    supervisorId: normalized.supervisorId,
    supervisorName: supervisor?.name ?? currentAppointment.supervisorName,
  };

  updateState({
    ...state,
    appointments: state.appointments.map((appointment) =>
      appointment.id === appointmentId ? nextAppointment : appointment,
    ),
    errorMessage: null,
  });

  return nextAppointment;
}

function toggleScheduleBlockStatusMock(blockId: string) {
  const currentBlock = state.scheduleBlocks.find(
    (block) => block.id === blockId,
  );

  if (!currentBlock) {
    return null;
  }

  const nextStatus: PersonOperationalStatus =
    currentBlock.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    scheduleBlocks: state.scheduleBlocks.map((block) =>
      block.id === blockId ? { ...block, status: nextStatus } : block,
    ),
  });

  return nextStatus;
}

function updateAppointmentStatusMock(
  appointmentId: string,
  status: StudentAgendaAppointmentStatus,
) {
  const currentAppointment = state.appointments.find(
    (appointment) => appointment.id === appointmentId,
  );

  if (!currentAppointment) {
    return false;
  }

  updateState({
    ...state,
    errorMessage: null,
    appointments: state.appointments.map((appointment) =>
      appointment.id === appointmentId
        ? { ...appointment, status }
        : appointment,
    ),
  });

  return true;
}

function deleteScheduleBlockMock(blockId: string) {
  const currentBlock = state.scheduleBlocks.find(
    (block) => block.id === blockId,
  );

  if (!currentBlock) {
    return false;
  }

  updateState({
    ...state,
    scheduleBlocks: state.scheduleBlocks.filter(
      (block) => block.id !== blockId,
    ),
  });

  return true;
}

function respondToRequestMock(
  requestId: string,
  nextStatus: StudentRequestStatus,
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
    : (state.conversations.find(
        (conversation) => conversation.requestId === requestId,
      ) ?? null);
  const nextConversation =
    nextStatus === 'ACEPTADA'
      ? (currentConversation ?? buildConversationForRequest(currentRequest))
      : currentConversation;

  updateState({
    ...state,
    conversations:
      nextConversation && !currentConversation
        ? [nextConversation, ...state.conversations]
        : state.conversations.map((conversation) =>
            conversation.requestId === requestId
              ? {
                  ...conversation,
                  status:
                    nextStatus === 'ACEPTADA'
                      ? 'ACTIVA'
                      : nextStatus === 'CERRADA' || nextStatus === 'CANCELADA'
                        ? 'CERRADA'
                        : conversation.status,
                  unreadCount:
                    nextStatus === 'ACEPTADA' ? conversation.unreadCount : 0,
                }
              : conversation,
          ),
    requests: state.requests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            conversationId:
              nextStatus === 'ACEPTADA'
                ? (nextConversation?.id ?? request.conversationId)
                : request.conversationId,
            conversationEnabled:
              nextStatus === 'ACEPTADA'
                ? true
                : nextStatus === 'CERRADA' || nextStatus === 'CANCELADA'
                  ? false
                  : request.conversationEnabled,
            responseAt: new Date().toISOString(),
            status: nextStatus,
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

  if (
    !currentConversation ||
    currentConversation.status !== 'ACTIVA' ||
    !normalizedContent
  ) {
    return false;
  }

  const nextMessage: StudentConversationMessage = {
    author: 'ESTUDIANTE',
    authorName: `${state.profile.firstName} ${state.profile.lastName}`,
    content: normalizedContent,
    id: `student-message-${nextConversationMessageSequence++}`,
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
    isLoading: !state.isReady,
  });

  runtimeLoadPromise = getStudentPortalDashboard()
    .then((payload) => {
      const nextDashboard = normalizeStudentModuleData(payload);
      syncStudentRuntimeSequences(nextDashboard);

      updateState({
        ...nextDashboard,
        errorMessage: null,
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
          'No pudimos cargar el portal del estudiante.',
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

export async function refreshStudentModuleState() {
  await loadRuntimeState(true);
}

async function updateProfile(values: StudentProfileFormValues) {
  if (IS_TEST_MODE) {
    updateProfileMock(values);
    return true;
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const profile = await updateStudentPortalProfile(values);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      profile,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar tu perfil.'),
      isLoading: false,
    });
    return false;
  }
}

async function toggleTreatmentStatus(treatmentId: string) {
  if (IS_TEST_MODE) {
    return toggleTreatmentStatusMock(treatmentId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await toggleStudentPortalTreatmentStatus(treatmentId);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      treatments: state.treatments.map((treatment) =>
        treatment.id === result.treatmentId
          ? { ...treatment, status: result.status }
          : treatment,
      ),
    });

    return result.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el tratamiento.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function togglePracticeSiteStatus(practiceSiteId: string) {
  if (IS_TEST_MODE) {
    return togglePracticeSiteStatusMock(practiceSiteId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await toggleStudentPortalPracticeSiteStatus(practiceSiteId);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      practiceSites: state.practiceSites.map((practiceSite) =>
        practiceSite.id === result.practiceSiteId
          ? { ...practiceSite, status: result.status }
          : practiceSite,
      ),
    });

    return result.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar la sede.'),
      isLoading: false,
    });
    return null;
  }
}

async function upsertAppointment(
  values: StudentAppointmentFormValues,
  appointmentId?: string,
) {
  if (IS_TEST_MODE) {
    return upsertAppointmentMock(values, appointmentId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const appointment = appointmentId
      ? await updateStudentPortalAppointment(appointmentId, values)
      : await createStudentPortalAppointment(values);

    updateState({
      ...state,
      appointments: appointmentId
        ? state.appointments.map((currentAppointment) =>
            currentAppointment.id === appointmentId
              ? appointment
              : currentAppointment,
          )
        : [appointment, ...state.appointments],
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return appointment;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos guardar la cita.'),
      isLoading: false,
    });
    return null;
  }
}

async function rescheduleAppointment(
  appointmentId: string,
  values: StudentAppointmentFormValues,
) {
  if (IS_TEST_MODE) {
    return rescheduleAppointmentMock(appointmentId, values);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const appointment = await rescheduleStudentPortalAppointment(
      appointmentId,
      values,
    );

    updateState({
      ...state,
      appointments: state.appointments.map((currentAppointment) =>
        currentAppointment.id === appointmentId
          ? appointment
          : currentAppointment,
      ),
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return appointment;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No se puede reprogramar esta cita porque la fecha u hora propuesta no cumple las reglas de agenda. Revisa que no se cruce con otra cita, un bloqueo o una cita demasiado próxima.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function upsertScheduleBlock(
  values: StudentScheduleBlockFormValues,
  blockId?: string,
) {
  if (IS_TEST_MODE) {
    return upsertScheduleBlockMock(values, blockId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const scheduleBlock = blockId
      ? await updateStudentPortalScheduleBlock(blockId, values)
      : await createStudentPortalScheduleBlock(values);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      scheduleBlocks: blockId
        ? state.scheduleBlocks.map((block) =>
            block.id === blockId ? scheduleBlock : block,
          )
        : [scheduleBlock, ...state.scheduleBlocks],
    });

    return scheduleBlock;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos guardar el bloqueo de agenda.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function submitAppointmentReview(
  appointmentId: string,
  rating: number,
  comment?: string,
) {
  patchState({ errorMessage: null, isLoading: true });

  try {
    const appointment = await submitStudentPortalAppointmentReview(
      appointmentId,
      rating,
      comment,
    );

    updateState({
      ...state,
      appointments: state.appointments.map((a) =>
        a.id === appointmentId ? appointment : a,
      ),
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos guardar la valoracion.'),
      isLoading: false,
    });
    return false;
  }
}

async function updateAppointmentStatus(
  appointmentId: string,
  status: StudentAgendaAppointmentStatus,
) {
  if (IS_TEST_MODE) {
    return updateAppointmentStatusMock(appointmentId, status);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const appointment = await updateStudentPortalAppointmentStatus(
      appointmentId,
      status,
    );

    updateState({
      ...state,
      appointments: state.appointments.map((currentAppointment) =>
        currentAppointment.id === appointmentId
          ? appointment
          : currentAppointment,
      ),
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el estado de la cita.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function toggleScheduleBlockStatus(blockId: string) {
  if (IS_TEST_MODE) {
    return toggleScheduleBlockStatusMock(blockId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const result = await toggleStudentPortalScheduleBlockStatus(blockId);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      scheduleBlocks: state.scheduleBlocks.map((block) =>
        block.id === result.blockId
          ? { ...block, status: result.status }
          : block,
      ),
    });

    return result.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar el estado del bloqueo.',
      ),
      isLoading: false,
    });
    return null;
  }
}

async function deleteScheduleBlock(blockId: string) {
  if (IS_TEST_MODE) {
    return deleteScheduleBlockMock(blockId);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    await deleteStudentPortalScheduleBlock(blockId);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      scheduleBlocks: state.scheduleBlocks.filter(
        (block) => block.id !== blockId,
      ),
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos eliminar el bloqueo de agenda.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function respondToRequest(
  requestId: string,
  nextStatus: StudentRequestStatus,
) {
  if (IS_TEST_MODE) {
    return respondToRequestMock(requestId, nextStatus);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const request = await updateStudentPortalRequestStatus(
      requestId,
      nextStatus,
    );

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      requests: state.requests.map((currentRequest) =>
        currentRequest.id === request.id ? request : currentRequest,
      ),
    });

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
  const pendingRefresh = conversationRefreshPromises.get(conversationId);

  if (pendingRefresh) {
    return pendingRefresh;
  }

  const refreshPromise = getStudentPortalConversation(conversationId)
    .then((conversation) => {
      let shouldUpdate = false;
      const conversations = state.conversations.map((currentConversation) => {
        if (currentConversation.id !== conversationId) {
          return currentConversation;
        }

        const optimisticMessages = currentConversation.messages.filter(
          (message) => message.id.startsWith('optimistic-'),
        );
        const currentRealMessages = currentConversation.messages.filter(
          (message) => !message.id.startsWith('optimistic-'),
        );
        // Keep locally confirmed messages while the conversation endpoint catches up.
        const baseMessages =
          currentRealMessages.length > conversation.messages.length
            ? currentRealMessages
            : conversation.messages;
        const nextMessages = [...baseMessages, ...optimisticMessages];

        if (
          currentConversation.status === conversation.status &&
          areConversationMessagesEqual(
            currentConversation.messages,
            nextMessages,
          )
        ) {
          return currentConversation;
        }

        shouldUpdate = true;

        return {
          ...currentConversation,
          messages: nextMessages,
          status: conversation.status,
        };
      });

      if (shouldUpdate) {
        updateState({
          ...state,
          conversations,
        });
      }
    })
    .catch(() => {
      // silently ignore - background poll
    })
    .finally(() => {
      if (conversationRefreshPromises.get(conversationId) === refreshPromise) {
        conversationRefreshPromises.delete(conversationId);
      }
    });

  conversationRefreshPromises.set(conversationId, refreshPromise);

  return refreshPromise;
}

async function sendConversationMessage(
  conversationId: string,
  content: string,
) {
  if (IS_TEST_MODE) {
    return sendConversationMessageMock(conversationId, content);
  }

  const tempId = `optimistic-${Date.now()}`;
  const optimisticMessage: StudentConversationMessage = {
    author: 'ESTUDIANTE',
    authorName: `${state.profile.firstName} ${state.profile.lastName}`,
    content: content.trim(),
    id: tempId,
    sentAt: new Date().toISOString(),
  };

  const conversationsSnapshot = state.conversations;

  updateState({
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
  });

  try {
    const message = await sendStudentPortalConversationMessage(
      conversationId,
      content,
    );

    updateState({
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
    });

    return true;
  } catch (error) {
    updateState({
      ...state,
      conversations: conversationsSnapshot,
      errorMessage: getErrorMessage(error, 'No pudimos enviar el mensaje.'),
      isLoading: false,
    });
    return false;
  }
}

async function getUniversitySites(): Promise<StudentPracticeSite[]> {
  if (IS_TEST_MODE) return state.practiceSites;

  if (universitySitesCache && Date.now() < universitySitesCache.expiresAt) {
    return universitySitesCache.data;
  }

  if (!universitySitesLoadPromise) {
    universitySitesLoadPromise = getStudentPortalUniversitySites()
      .then((practiceSites) => {
        universitySitesCache = {
          data: practiceSites,
          expiresAt: Date.now() + STUDENT_REFERENCE_DATA_CACHE_MAX_AGE_MS,
        };

        return practiceSites;
      })
      .catch(() => [])
      .finally(() => {
        universitySitesLoadPromise = null;
      });
  }

  return universitySitesLoadPromise;
}

async function updatePracticeSites(siteIds: string[]): Promise<boolean> {
  if (IS_TEST_MODE) {
    updatePracticeSitesMock(siteIds);
    return true;
  }

  patchState({ errorMessage: null, isLoading: true });

  try {
    const practiceSites = await updateStudentPortalPracticeSites(siteIds);
    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      practiceSites,
    });
    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar tus sedes de práctica.',
      ),
      isLoading: false,
    });
    return false;
  }
}

async function getTreatmentTypes(): Promise<StudentTreatmentType[]> {
  if (IS_TEST_MODE) return [];

  if (treatmentTypesCache && Date.now() < treatmentTypesCache.expiresAt) {
    return treatmentTypesCache.data;
  }

  if (!treatmentTypesLoadPromise) {
    treatmentTypesLoadPromise = getStudentPortalTreatmentTypes()
      .then((treatmentTypes) => {
        treatmentTypesCache = {
          data: treatmentTypes,
          expiresAt: Date.now() + STUDENT_REFERENCE_DATA_CACHE_MAX_AGE_MS,
        };

        return treatmentTypes;
      })
      .catch(() => [])
      .finally(() => {
        treatmentTypesLoadPromise = null;
      });
  }

  return treatmentTypesLoadPromise;
}

async function updateTreatments(treatmentTypeIds: string[]): Promise<boolean> {
  if (IS_TEST_MODE) {
    updateTreatmentsMock(treatmentTypeIds);
    return true;
  }

  patchState({ errorMessage: null, isLoading: true });

  try {
    const treatments = await updateStudentPortalTreatments(treatmentTypeIds);
    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      treatments,
    });
    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(
        error,
        'No pudimos actualizar tus tratamientos.',
      ),
      isLoading: false,
    });
    return false;
  }
}

export function resetStudentModuleState() {
  if (!IS_TEST_MODE) {
    clearPersistedStudentModuleCache();
  }

  state = IS_TEST_MODE ? createMockState() : createEmptyRuntimeState();
  syncStudentRuntimeSequences(
    IS_TEST_MODE ? initialMockState : createEmptyRuntimeModuleState(),
  );
  runtimeLoadPromise = null;
  conversationRefreshPromises.clear();
  universitySitesCache = null;
  universitySitesLoadPromise = null;
  treatmentTypesCache = null;
  treatmentTypesLoadPromise = null;
  emitChange();
}

export function useStudentModuleStore(
  options: UseStudentModuleStoreOptions = {},
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

  const actions: StudentModuleActions = {
    deleteScheduleBlock,
    refresh: refreshStudentModuleState,
    refreshConversation,
    updateAppointmentStatus,
    respondToRequest,
    sendConversationMessage,
    getUniversitySites,
    getTreatmentTypes,
    togglePracticeSiteStatus,
    toggleScheduleBlockStatus,
    toggleTreatmentStatus,
    updatePracticeSites,
    updateTreatments,
    updateProfile,
    upsertAppointment,
    rescheduleAppointment,
    upsertScheduleBlock,
    checkAppointmentConflict: findAppointmentValidationError,
    submitAppointmentReview,
  };

  return {
    ...snapshot,
    ...actions,
    nextLinkId: () => `student-link-${nextLinkSequence++}`,
  };
}
