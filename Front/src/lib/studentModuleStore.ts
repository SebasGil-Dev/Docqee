import { useEffect, useSyncExternalStore } from 'react';

import type {
  PersonOperationalStatus,
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
  StudentTreatment,
} from '@/content/types';
import { IS_TEST_MODE } from '@/lib/apiClient';
import {
  createStudentPortalScheduleBlock,
  getStudentPortalDashboard,
  sendStudentPortalConversationMessage,
  toggleStudentPortalPracticeSiteStatus,
  toggleStudentPortalScheduleBlockStatus,
  toggleStudentPortalTreatmentStatus,
  updateStudentPortalProfile,
  updateStudentPortalRequestStatus,
  updateStudentPortalScheduleBlock,
} from '@/lib/studentApi';

type StudentModuleActions = {
  refresh: () => Promise<void>;
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
  upsertScheduleBlock: (
    values: StudentScheduleBlockFormValues,
    blockId?: string,
  ) => Promise<StudentScheduleBlock | null>;
};

type StudentStoreState = StudentModuleState & {
  errorMessage: string | null;
  isLoading: boolean;
  isReady: boolean;
};

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
    universityName: 'Universidad Clinica del Norte',
  };

  const treatments: StudentTreatment[] = [
    {
      description: 'Atencion preventiva, valoracion inicial y acompanamiento de control.',
      id: 'treatment-1',
      name: 'Operatoria basica',
      status: 'active',
    },
    {
      description: 'Manejo de protocolos de higiene oral y educacion al paciente.',
      id: 'treatment-2',
      name: 'Promocion y prevencion',
      status: 'active',
    },
    {
      description: 'Seguimiento del paciente en procedimientos de apoyo restaurativo.',
      id: 'treatment-3',
      name: 'Rehabilitacion oral',
      status: 'inactive',
    },
  ];

  const practiceSites: StudentPracticeSite[] = [
    {
      address: 'Cra. 15 # 93-41',
      city: 'Bogota',
      id: 'practice-site-1',
      locality: 'Usaquen',
      name: 'Sede Norte',
      status: 'active',
    },
    {
      address: 'Calle 80 # 24-19',
      city: 'Bogota',
      id: 'practice-site-2',
      locality: 'Barrios Unidos',
      name: 'Sede Escuela Clinica',
      status: 'active',
    },
    {
      address: 'Av. 33 # 74B-11',
      city: 'Medellin',
      id: 'practice-site-3',
      locality: 'Laureles',
      name: 'Sede Clinica Laureles',
      status: 'inactive',
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

  const requests: StudentRequest[] = [
    {
      appointmentsCount: 0,
      conversationId: null,
      conversationEnabled: false,
      id: 'student-request-1',
      patientAge: 29,
      patientCity: 'Bogota',
      patientName: 'Ana Maria Perez',
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
      patientName: 'Julian Torres',
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
      patientName: 'Claudia Moreno',
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
      patientName: 'Ricardo Suarez',
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
          content: 'Hola, quisiera confirmar si puedes revisar mi seguimiento esta semana.',
          id: 'student-message-1',
          sentAt: '2026-04-03T10:15:00.000Z',
        },
        {
          author: 'ESTUDIANTE',
          authorName: 'Valentina Rios',
          content: 'Hola Julian, claro que si. Estoy revisando mis espacios disponibles.',
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
          content: 'Con gusto, Ricardo. Quedo cerrado el proceso con control satisfactorio.',
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

  return {
    conversations,
    errorMessage: null,
    isLoading: false,
    isReady: true,
    practiceSites,
    profile,
    requests,
    scheduleBlocks,
    treatments,
  };
}

function createRuntimeInitialState(): StudentStoreState {
  return {
    errorMessage: null,
    isLoading: false,
    isReady: false,
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
      universityName: '',
    },
    requests: [],
    scheduleBlocks: [],
    treatments: [],
  };
}

const initialMockState = createMockState();

let state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
let nextLinkSequence = initialMockState.profile.links.length + 1;
let nextScheduleBlockSequence = initialMockState.scheduleBlocks.length + 1;
let nextConversationSequence = initialMockState.conversations.length + 1;
let nextConversationMessageSequence =
  initialMockState.conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  ) + 1;
let runtimeLoadPromise: Promise<StudentStoreState> | null = null;

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

function updateState(nextState: StudentStoreState) {
  state = nextState;
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
      request.reason ?? 'Hola, quisiera continuar la conversacion sobre mi solicitud.',
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
  return error instanceof Error ? error.message : fallbackMessage;
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
      values.type === 'RECURRENTE' ? normalizeNullableText(values.recurrenceEndDate) : null,
    recurrenceStartDate:
      values.type === 'RECURRENTE' ? normalizeNullableText(values.recurrenceStartDate) : null,
    specificDate:
      values.type === 'ESPECIFICO' ? normalizeNullableText(values.specificDate) : null,
    startTime: values.startTime,
    type: values.type,
  } satisfies Omit<StudentScheduleBlock, 'id' | 'status'>;
}

function updateProfileMock(values: StudentProfileFormValues) {
  updateState({
    ...state,
    profile: normalizeProfile(values),
  });
}

function toggleTreatmentStatusMock(treatmentId: string) {
  const currentTreatment = state.treatments.find((treatment) => treatment.id === treatmentId);

  if (!currentTreatment) {
    return null;
  }

  const nextStatus: PersonOperationalStatus =
    currentTreatment.status === 'active' ? 'inactive' : 'active';

  updateState({
    ...state,
    treatments: state.treatments.map((treatment) =>
      treatment.id === treatmentId ? { ...treatment, status: nextStatus } : treatment,
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
    const existingBlock = state.scheduleBlocks.find((block) => block.id === blockId);

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

function toggleScheduleBlockStatusMock(blockId: string) {
  const currentBlock = state.scheduleBlocks.find((block) => block.id === blockId);

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

function respondToRequestMock(requestId: string, nextStatus: StudentRequestStatus) {
  const currentRequest = state.requests.find((request) => request.id === requestId);

  if (!currentRequest) {
    return false;
  }

  const currentConversation = currentRequest.conversationId
    ? state.conversations.find(
        (conversation) => conversation.id === currentRequest.conversationId,
      ) ?? null
    : state.conversations.find((conversation) => conversation.requestId === requestId) ?? null;
  const nextConversation =
    nextStatus === 'ACEPTADA'
      ? currentConversation ?? buildConversationForRequest(currentRequest)
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
                        ? 'SOLO_LECTURA'
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
                ? nextConversation?.id ?? request.conversationId
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

  if (!currentConversation || currentConversation.status !== 'ACTIVA' || !normalizedContent) {
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

  runtimeLoadPromise = getStudentPortalDashboard()
    .then((payload) => {
      updateState({
        ...createRuntimeInitialState(),
        ...payload,
        errorMessage: null,
        isLoading: false,
        isReady: true,
      });

      nextLinkSequence = payload.profile.links.length + 1;
      nextScheduleBlockSequence = payload.scheduleBlocks.length + 1;
      nextConversationSequence = payload.conversations.length + 1;
      nextConversationMessageSequence =
        payload.conversations.reduce(
          (total, conversation) => total + conversation.messages.length,
          0,
        ) + 1;

      return state;
    })
    .catch((error) => {
      patchState({
        errorMessage: getErrorMessage(error, 'No pudimos cargar el portal del estudiante.'),
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
      errorMessage: getErrorMessage(error, 'No pudimos actualizar el tratamiento.'),
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
      errorMessage: getErrorMessage(error, 'No pudimos guardar el bloqueo de agenda.'),
      isLoading: false,
    });
    return null;
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
        block.id === result.blockId ? { ...block, status: result.status } : block,
      ),
    });

    return result.status;
  } catch (error) {
    patchState({
      errorMessage: getErrorMessage(error, 'No pudimos actualizar el estado del bloqueo.'),
      isLoading: false,
    });
    return null;
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
    const request = await updateStudentPortalRequestStatus(requestId, nextStatus);

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
      errorMessage: getErrorMessage(error, 'No pudimos actualizar la solicitud.'),
      isLoading: false,
    });
    return false;
  }
}

async function sendConversationMessage(
  conversationId: string,
  content: string,
) {
  if (IS_TEST_MODE) {
    return sendConversationMessageMock(conversationId, content);
  }

  patchState({
    errorMessage: null,
    isLoading: true,
  });

  try {
    const message = await sendStudentPortalConversationMessage(conversationId, content);

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

export function resetStudentModuleState() {
  state = IS_TEST_MODE ? createMockState() : createRuntimeInitialState();
  nextLinkSequence = initialMockState.profile.links.length + 1;
  nextScheduleBlockSequence = initialMockState.scheduleBlocks.length + 1;
  nextConversationSequence = initialMockState.conversations.length + 1;
  nextConversationMessageSequence =
    initialMockState.conversations.reduce(
      (total, conversation) => total + conversation.messages.length,
      0,
    ) + 1;
  runtimeLoadPromise = null;
  emitChange();
}

export function useStudentModuleStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (IS_TEST_MODE || snapshot.isLoading || snapshot.isReady) {
      return;
    }

    void loadRuntimeState();
  }, [snapshot.isLoading, snapshot.isReady]);

  const actions: StudentModuleActions = {
    refresh: refreshRuntimeState,
    respondToRequest,
    sendConversationMessage,
    togglePracticeSiteStatus,
    toggleScheduleBlockStatus,
    toggleTreatmentStatus,
    updateProfile,
    upsertScheduleBlock,
  };

  return {
    ...snapshot,
    ...actions,
    nextLinkId: () => `student-link-${nextLinkSequence++}`,
  };
}
