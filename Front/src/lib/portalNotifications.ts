import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { ROUTES } from '@/constants/routes';
import type {
  PatientAppointment,
  PatientConversation,
  PatientRequest,
  PortalNotification,
  StudentAgendaAppointment,
  StudentConversation,
  StudentRequest,
} from '@/content/types';

type PortalNotificationScope = 'patient' | 'student';

const NOTIFICATION_STORAGE_KEYS: Record<PortalNotificationScope, string> = {
  patient: 'docqee.patient.notifications.read',
  student: 'docqee.student.notifications.read',
};

const notificationListeners: Record<
  PortalNotificationScope,
  Set<() => void>
> = {
  patient: new Set(),
  student: new Set(),
};

function emitNotificationReadStateChange(scope: PortalNotificationScope) {
  notificationListeners[scope].forEach((listener) => {
    listener();
  });
}

function subscribeToNotificationReadState(
  scope: PortalNotificationScope,
  listener: () => void,
) {
  notificationListeners[scope].add(listener);

  return () => {
    notificationListeners[scope].delete(listener);
  };
}

function normalizeNotificationReadIds(ids: string[]) {
  return JSON.stringify(
    [...new Set(ids.filter((value) => typeof value === 'string' && value.length > 0))].sort(),
  );
}

function readNotificationReadSnapshot(scope: PortalNotificationScope) {
  if (typeof window === 'undefined') {
    return '[]';
  }

  try {
    const storedValue = window.localStorage.getItem(NOTIFICATION_STORAGE_KEYS[scope]);

    if (!storedValue) {
      return '[]';
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? normalizeNotificationReadIds(parsedValue)
      : '[]';
  } catch {
    return '[]';
  }
}

function writeNotificationReadSnapshot(
  scope: PortalNotificationScope,
  notificationIds: string[],
) {
  const nextSnapshot = normalizeNotificationReadIds(notificationIds);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        NOTIFICATION_STORAGE_KEYS[scope],
        nextSnapshot,
      );
    } catch {
      // Ignore storage write failures and keep the UI interactive.
    }
  }

  emitNotificationReadStateChange(scope);
}

function parseNotificationReadIds(snapshot: string) {
  try {
    const parsedValue = JSON.parse(snapshot);
    return Array.isArray(parsedValue)
      ? parsedValue.filter(
          (value): value is string =>
            typeof value === 'string' && value.length > 0,
        )
      : [];
  } catch {
    return [];
  }
}

function usePortalNotificationReadState(scope: PortalNotificationScope) {
  const readSnapshot = useSyncExternalStore(
    (listener) => subscribeToNotificationReadState(scope, listener),
    () => readNotificationReadSnapshot(scope),
    () => '[]',
  );

  const readIds = useMemo(
    () => new Set(parseNotificationReadIds(readSnapshot)),
    [readSnapshot],
  );

  const markNotificationAsRead = useCallback(
    (notificationId: string) => {
      if (!notificationId || readIds.has(notificationId)) {
        return;
      }

      writeNotificationReadSnapshot(scope, [...readIds, notificationId]);
    },
    [readIds, scope],
  );

  const markAllNotificationsAsRead = useCallback(
    (notificationIds: string[]) => {
      if (notificationIds.length === 0) {
        return;
      }

      writeNotificationReadSnapshot(scope, [...readIds, ...notificationIds]);
    },
    [readIds, scope],
  );

  return {
    markAllNotificationsAsRead,
    markNotificationAsRead,
    readIds,
  };
}

function sortNotifications(notifications: PortalNotification[]) {
  return [...notifications].sort(
    (firstNotification, secondNotification) =>
      new Date(secondNotification.createdAt).getTime() -
      new Date(firstNotification.createdAt).getTime(),
  );
}

function buildStudentRequestNotifications(
  requests: StudentRequest[],
  readIds: Set<string>,
) {
  return requests
    .filter((request) => request.status === 'PENDIENTE')
    .map<PortalNotification>((request) => ({
      createdAt: request.sentAt,
      description: request.reason
        ? `${request.patientCity} - ${request.reason}`
        : `${request.patientCity} - Tienes una nueva solicitud pendiente por revisar.`,
      id: `student-request-${request.id}-${request.status}`,
      isRead: readIds.has(`student-request-${request.id}-${request.status}`),
      title: `Nueva solicitud de ${request.patientName}`,
      to: ROUTES.studentRequests,
      tone: 'warning',
    }));
}

function buildStudentAppointmentNotifications(
  appointments: StudentAgendaAppointment[],
  readIds: Set<string>,
) {
  return appointments.flatMap<PortalNotification>((appointment) => {
    if (appointment.status === 'ACEPTADA') {
      const notificationId = `student-appointment-${appointment.id}-${appointment.status}`;

      return [
        {
          createdAt: appointment.startAt,
          description: `${appointment.appointmentType} - ${appointment.siteName}`,
          id: notificationId,
          isRead: readIds.has(notificationId),
          title: `${appointment.patientName} acepto la cita`,
          to: ROUTES.studentAppointments,
          tone: 'success',
        },
      ];
    }

    if (appointment.status === 'REPROGRAMACION_PENDIENTE') {
      const notificationId = `student-appointment-${appointment.id}-${appointment.status}`;

      return [
        {
          createdAt: appointment.startAt,
          description: `${appointment.patientName} solicito reprogramar ${appointment.appointmentType.toLowerCase()}.`,
          id: notificationId,
          isRead: readIds.has(notificationId),
          title: 'Solicitud de reprogramacion',
          to: ROUTES.studentAppointments,
          tone: 'warning',
        },
      ];
    }

    if (appointment.status === 'CANCELADA') {
      const notificationId = `student-appointment-${appointment.id}-${appointment.status}`;

      return [
        {
          createdAt: appointment.startAt,
          description: `${appointment.appointmentType} - ${appointment.siteName}`,
          id: notificationId,
          isRead: readIds.has(notificationId),
          title: `${appointment.patientName} cancelo la cita`,
          to: ROUTES.studentAppointments,
          tone: 'danger',
        },
      ];
    }

    return [];
  });
}

function buildStudentConversationNotifications(
  conversations: StudentConversation[],
  readIds: Set<string>,
) {
  return conversations.flatMap<PortalNotification>((conversation) => {
    if (conversation.unreadCount <= 0 || conversation.messages.length === 0) {
      return [];
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (!lastMessage || lastMessage.author !== 'PACIENTE') {
      return [];
    }

    const notificationId = `student-conversation-${conversation.id}-unread`;

    return [
      {
        createdAt: lastMessage.sentAt,
        description: lastMessage.content,
        id: notificationId,
        isRead: readIds.has(notificationId),
        title: `Nuevo mensaje de ${conversation.patientName}`,
        to: `${ROUTES.studentConversations}?conversation=${conversation.id}`,
        tone: 'info',
      },
    ];
  });
}

function buildPatientRequestNotifications(
  requests: PatientRequest[],
  readIds: Set<string>,
) {
  return requests.flatMap<PortalNotification>((request) => {
    if (
      request.status === 'PENDIENTE' ||
      !request.responseAt
    ) {
      return [];
    }

    const notificationId = `patient-request-${request.id}-${request.status}`;
    const isRead = readIds.has(notificationId);
    const destination =
      request.status === 'ACEPTADA' && request.conversationId
        ? `${ROUTES.patientConversations}?conversation=${request.conversationId}`
        : ROUTES.patientRequests;

    if (request.status === 'ACEPTADA') {
      return [
        {
          createdAt: request.responseAt,
          description: `${request.studentName} habilito la conversacion para continuar el proceso.`,
          id: notificationId,
          isRead,
          title: 'Tu solicitud fue aceptada',
          to: destination,
          tone: 'success',
        },
      ];
    }

    if (request.status === 'RECHAZADA') {
      return [
        {
          createdAt: request.responseAt,
          description: `${request.studentName} respondio tu solicitud en ${request.universityName}.`,
          id: notificationId,
          isRead,
          title: 'Tu solicitud fue rechazada',
          to: destination,
          tone: 'danger',
        },
      ];
    }

    if (request.status === 'CERRADA') {
      return [
        {
          createdAt: request.responseAt,
          description: `${request.studentName} cerro el proceso asociado a tu solicitud.`,
          id: notificationId,
          isRead,
          title: 'Tu solicitud fue cerrada',
          to: destination,
          tone: 'info',
        },
      ];
    }

    return [
      {
        createdAt: request.responseAt,
        description: `${request.studentName} actualizo el estado de tu solicitud.`,
        id: notificationId,
        isRead,
        title: 'Tu solicitud fue cancelada',
        to: destination,
        tone: 'warning',
      },
    ];
  });
}

function buildPatientAppointmentNotifications(
  appointments: PatientAppointment[],
  readIds: Set<string>,
) {
  return appointments.flatMap<PortalNotification>((appointment) => {
    if (
      appointment.status !== 'PROPUESTA' &&
      appointment.status !== 'ACEPTADA' &&
      appointment.status !== 'CANCELADA' &&
      appointment.status !== 'RECHAZADA'
    ) {
      return [];
    }

    const notificationId = `patient-appointment-${appointment.id}-${appointment.status}`;
    const baseNotification = {
      createdAt: appointment.startAt,
      description: `${appointment.studentName} - ${appointment.appointmentType} en ${appointment.siteName}`,
      id: notificationId,
      isRead: readIds.has(notificationId),
      to: ROUTES.patientAppointments,
    } satisfies Omit<PortalNotification, 'title'>;

    if (appointment.status === 'PROPUESTA') {
      return [
        {
          ...baseNotification,
          title: 'Tienes una nueva propuesta de cita',
          tone: 'warning',
        },
      ];
    }

    if (appointment.status === 'ACEPTADA') {
      return [
        {
          ...baseNotification,
          title: 'Tu cita fue aceptada',
          tone: 'success',
        },
      ];
    }

    if (appointment.status === 'RECHAZADA') {
      return [
        {
          ...baseNotification,
          title: 'Tu cita fue rechazada',
          tone: 'danger',
        },
      ];
    }

    return [
      {
        ...baseNotification,
        title: 'Tu cita fue cancelada',
        tone: 'danger',
      },
    ];
  });
}

function buildPatientConversationNotifications(
  conversations: PatientConversation[],
  readIds: Set<string>,
) {
  return conversations.flatMap<PortalNotification>((conversation) => {
    if (conversation.unreadCount <= 0 || conversation.messages.length === 0) {
      return [];
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (!lastMessage || lastMessage.author !== 'ESTUDIANTE') {
      return [];
    }

    const notificationId = `patient-conversation-${conversation.id}-unread`;

    return [
      {
        createdAt: lastMessage.sentAt,
        description: lastMessage.content,
        id: notificationId,
        isRead: readIds.has(notificationId),
        title: `Nuevo mensaje de ${conversation.studentName}`,
        to: `${ROUTES.patientConversations}?conversation=${conversation.id}`,
        tone: 'info',
      },
    ];
  });
}

export function useStudentPortalNotifications({
  appointments,
  conversations,
  requests,
}: {
  appointments: StudentAgendaAppointment[];
  conversations: StudentConversation[];
  requests: StudentRequest[];
}) {
  const { markAllNotificationsAsRead, markNotificationAsRead, readIds } =
    usePortalNotificationReadState('student');

  const notifications = useMemo(
    () =>
      sortNotifications([
        ...buildStudentRequestNotifications(requests, readIds),
        ...buildStudentAppointmentNotifications(appointments, readIds),
        ...buildStudentConversationNotifications(conversations, readIds),
      ]),
    [appointments, conversations, readIds, requests],
  );

  const markAllVisibleNotificationsAsRead = useCallback(
    () =>
      markAllNotificationsAsRead(
        notifications.map((notification) => notification.id),
      ),
    [markAllNotificationsAsRead, notifications],
  );

  return {
    markAllNotificationsAsRead: markAllVisibleNotificationsAsRead,
    markNotificationAsRead,
    notifications,
    unreadCount: notifications.filter(
      (notification) => notification.isRead !== true,
    ).length,
  };
}

export function usePatientPortalNotifications({
  appointments,
  conversations,
  requests,
}: {
  appointments: PatientAppointment[];
  conversations: PatientConversation[];
  requests: PatientRequest[];
}) {
  const { markAllNotificationsAsRead, markNotificationAsRead, readIds } =
    usePortalNotificationReadState('patient');

  const notifications = useMemo(
    () =>
      sortNotifications([
        ...buildPatientRequestNotifications(requests, readIds),
        ...buildPatientAppointmentNotifications(appointments, readIds),
        ...buildPatientConversationNotifications(conversations, readIds),
      ]),
    [appointments, conversations, readIds, requests],
  );

  const markAllVisibleNotificationsAsRead = useCallback(
    () =>
      markAllNotificationsAsRead(
        notifications.map((notification) => notification.id),
      ),
    [markAllNotificationsAsRead, notifications],
  );

  return {
    markAllNotificationsAsRead: markAllVisibleNotificationsAsRead,
    markNotificationAsRead,
    notifications,
    unreadCount: notifications.filter(
      (notification) => notification.isRead !== true,
    ).length,
  };
}
