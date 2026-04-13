import { useEffect, useSyncExternalStore } from 'react';

import type {
  PatientAppointment,
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
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  createPatientPortalRequest,
  getPatientPortalDashboard,
  sendPatientPortalConversationMessage,
  updatePatientPortalAppointmentStatus,
  updatePatientPortalProfile,
  updatePatientPortalRequestStatus,
} from '@/lib/patientApi';

type PatientModuleActions = {
  createRequest: (studentId: string, reason: string) => Promise<PatientRequest | null>;
  refresh: () => Promise<void>;
  sendConversationMessage: (
    conversationId: string,
    content: string,
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
};

type UsePatientModuleStoreOptions = {
  autoLoad?: boolean;
};

const listeners = new Set<() => void>();

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
      biography:
        'Enfoque en operatoria, valoracion inicial y seguimiento preventivo con comunicacion clara.',
      city: 'Bogota',
      firstName: 'Daniel',
      id: 'patient-student-1',
      lastName: 'Pardo',
      locality: 'Usaquen',
      practiceSite: 'Sede Norte',
      semester: '8',
      treatments: ['Operatoria basica', 'Promocion y prevencion'],
      universityName: 'Universidad Clinica del Norte',
    },
    {
      avatarAlt: 'Foto de perfil de Valentina Rios',
      avatarSrc: null,
      availabilityGeneral: 'Martes y jueves en jornada de tarde.',
      availabilityStatus: 'available',
      biography:
        'Perfil orientado a rehabilitacion oral y acompanamiento continuo del paciente.',
      city: 'Bogota',
      firstName: 'Valentina',
      id: 'patient-student-2',
      lastName: 'Rios',
      locality: 'Barrios Unidos',
      practiceSite: 'Sede Escuela Clinica',
      semester: '8',
      treatments: ['Rehabilitacion oral', 'Promocion y prevencion'],
      universityName: 'Universidad Clinica del Norte',
    },
    {
      avatarAlt: 'Foto de perfil de Camila Perez',
      avatarSrc: null,
      availabilityGeneral: 'Jueves en sede central y sabados alternos.',
      availabilityStatus: 'limited',
      biography:
        'Atencion centrada en seguimiento restaurativo con alto componente academico.',
      city: 'Bogota',
      firstName: 'Camila',
      id: 'patient-student-3',
      lastName: 'Perez',
      locality: 'Teusaquillo',
      practiceSite: 'Sede Central',
      semester: '9',
      treatments: ['Rehabilitacion oral', 'Valoracion integral'],
      universityName: 'Universidad Metropolitana',
    },
    {
      avatarAlt: 'Foto de perfil de Mateo Diaz',
      avatarSrc: null,
      availabilityGeneral: 'Lunes a jueves en jornada combinada.',
      availabilityStatus: 'available',
      biography:
        'Interes en diagnostico inicial, educacion preventiva y procesos de remision organizada.',
      city: 'Medellin',
      firstName: 'Mateo',
      id: 'patient-student-4',
      lastName: 'Diaz',
      locality: 'Laureles',
      practiceSite: 'Sede Clinica Laureles',
      semester: '7',
      treatments: ['Valoracion integral', 'Promocion y prevencion'],
      universityName: 'Universidad de Antioquia Clinica',
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
  ];

  const conversations: PatientConversation[] = [
    {
      id: 'patient-conversation-1',
      messages: [
        {
          author: 'PACIENTE',
          authorName: 'Sara Lopez',
          content: 'Hola, quisiera saber si puedes revisar un dolor dental persistente.',
          id: 'patient-message-1',
          sentAt: '2026-04-03T17:12:00.000Z',
        },
        {
          author: 'ESTUDIANTE',
          authorName: 'Valentina Rios',
          content: 'Hola Sara, claro que si. Ya revise tu solicitud y podemos avanzar.',
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
          content: 'Gracias por el acompanamiento durante el cierre del tratamiento.',
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
      additionalInfo: 'Recuerda llevar radiografia panoramica si la tienes disponible.',
      appointmentType: 'Valoracion inicial',
      city: 'Bogota',
      endAt: '2026-04-09T11:30:00.000Z',
      id: 'patient-appointment-1',
      siteName: 'Sede Escuela Clinica',
      startAt: '2026-04-09T10:30:00.000Z',
      status: 'PROPUESTA',
      studentName: 'Valentina Rios',
      teacherName: 'Dr. Sebastian Mora',
      universityName: 'Universidad Clinica del Norte',
    },
    {
      additionalInfo: 'Cita confirmada por la clinica universitaria.',
      appointmentType: 'Control restaurativo',
      city: 'Bogota',
      endAt: '2026-04-12T15:00:00.000Z',
      id: 'patient-appointment-2',
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
      endAt: '2026-03-25T09:30:00.000Z',
      id: 'patient-appointment-3',
      siteName: 'Sede Central',
      startAt: '2026-03-25T08:30:00.000Z',
      status: 'FINALIZADA',
      studentName: 'Camila Perez',
      teacherName: 'Dr. Julian Herrera',
      universityName: 'Universidad Metropolitana',
    },
  ];

  return {
    appointments,
    conversations,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    profile,
    requests,
    students,
  };
}

function createRuntimeInitialState(): PatientStoreState {
  return {
    appointments: [],
    conversations: [],
    errorMessage: null,
    isLoading: false,
    isReady: false,
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
    requests: [],
    students: [],
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

function updateState(nextState: PatientStoreState) {
  state = nextState;
  emitChange();
}

function patchState(partialState: Partial<PatientStoreState>) {
  updateState({
    ...state,
    ...partialState,
  });
}

function normalizeText(value: string) {
  return value.trim();
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
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
  const firstMessage: PatientConversationMessage = {
    author: 'PACIENTE',
    authorName: `${state.profile.firstName} ${state.profile.lastName}`,
    content:
      request.reason ?? 'Hola, quisiera iniciar la conversacion a partir de mi solicitud.',
    id: `patient-message-${nextMessageSequence++}`,
    sentAt: new Date().toISOString(),
  };

  return {
    id: `patient-conversation-${nextConversationSequence++}`,
    messages: [firstMessage],
    reason: request.reason,
    requestId: request.id,
    status: 'ACTIVA',
    studentId: request.studentId,
    studentName: request.studentName,
    universityName: request.universityName,
    unreadCount: 0,
  } satisfies PatientConversation;
}

function updateProfileMock(values: PatientProfileFormValues) {
  updateState({
    ...state,
    profile: normalizeProfile(values),
  });
}

function createRequestMock(studentId: string, reason: string) {
  const normalizedReason = normalizeText(reason);
  const selectedStudent = state.students.find((student) => student.id === studentId);

  if (!selectedStudent || !normalizedReason) {
    return null;
  }

  const hasActiveRequest = state.requests.some(
    (request) =>
      request.studentId === studentId &&
      (request.status === 'PENDIENTE' || request.status === 'ACEPTADA'),
  );

  if (hasActiveRequest) {
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

function updateRequestStatusMock(requestId: string, status: PatientRequestStatus) {
  const currentRequest = state.requests.find((request) => request.id === requestId);

  if (!currentRequest) {
    return false;
  }

  const currentConversation = currentRequest.conversationId
    ? state.conversations.find(
        (conversation) => conversation.id === currentRequest.conversationId,
      ) ?? null
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
    requests: state.requests.map((request) =>
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

  if (!currentConversation || currentConversation.status !== 'ACTIVA' || !normalizedContent) {
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
      appointment.id === appointmentId ? { ...appointment, status } : appointment,
    ),
  });

  return true;
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

  runtimeLoadPromise = getPatientPortalDashboard()
    .then((payload) => {
      updateState({
        ...createRuntimeInitialState(),
        ...payload,
        errorMessage: null,
        isLoading: false,
        isReady: true,
      });

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
        errorMessage: getErrorMessage(error, 'No pudimos cargar el portal del paciente.'),
        isLoading: false,
      });

      return state;
    })
    .finally(() => {
      runtimeLoadPromise = null;
    });

  return runtimeLoadPromise;
}

export async function refreshPatientModuleState() {
  await loadRuntimeState(true);
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

async function createRequest(studentId: string, reason: string) {
  if (IS_TEST_MODE) {
    return createRequestMock(studentId, reason);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const request = await createPatientPortalRequest(studentId, reason);

    updateState({
      ...state,
      errorMessage: null,
      isLoading: false,
      isReady: true,
      requests: [request, ...state.requests],
    });

    return request;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos enviar la solicitud.'),
      isLoading: false,
    });
    return null;
  }
}

async function updateRequestStatus(requestId: string, status: PatientRequestStatus) {
  if (IS_TEST_MODE) {
    return updateRequestStatusMock(requestId, status);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const request = await updatePatientPortalRequestStatus(requestId, status);
    const nextConversation =
      request.status === 'ACEPTADA' && request.conversationId
        ? state.conversations.find((conversation) => conversation.id === request.conversationId) ??
          buildConversationFromRequest(request)
        : null;

    updateState({
      ...state,
      conversations:
        nextConversation && !state.conversations.some((conversation) => conversation.id === nextConversation.id)
          ? [nextConversation, ...state.conversations]
          : state.conversations,
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
      errorMessage: getErrorMessage(error, 'No pudimos actualizar la solicitud.'),
      isLoading: false,
    });
    return false;
  }
}

async function sendConversationMessage(conversationId: string, content: string) {
  if (IS_TEST_MODE) {
    return sendConversationMessageMock(conversationId, content);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const message = await sendPatientPortalConversationMessage(conversationId, content);

    updateState({
      ...state,
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
            }
          : conversation,
      ),
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos enviar el mensaje.'),
      isLoading: false,
    });
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
    const appointment = await updatePatientPortalAppointmentStatus(appointmentId, status);

    updateState({
      ...state,
      appointments: state.appointments.map((currentAppointment) =>
        currentAppointment.id === appointment.id ? appointment : currentAppointment,
      ),
      errorMessage: null,
      isLoading: false,
      isReady: true,
    });

    return true;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar la cita.'),
      isLoading: false,
    });
    return false;
  }
}

export function resetPatientModuleState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  nextRequestSequence = initialMockState.requests.length + 1;
  nextConversationSequence = initialMockState.conversations.length + 1;
  nextMessageSequence =
    initialMockState.conversations.reduce(
      (total, conversation) => total + conversation.messages.length,
      0,
    ) + 1;
  runtimeLoadPromise = null;
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
      snapshot.isReady
    ) {
      return;
    }

    void loadRuntimeState();
  }, [shouldAutoLoad, snapshot.isLoading, snapshot.isReady]);

  const actions: PatientModuleActions = {
    createRequest,
    refresh: refreshPatientModuleState,
    sendConversationMessage,
    updateAppointmentStatus,
    updateProfile,
    updateRequestStatus,
  };

  return {
    ...snapshot,
    ...actions,
  };
}
