import { ROUTES } from '@/constants/routes';

export const patientContent = {
  appointmentsPage: {
    actionLabels: {
      accept: 'Aceptar',
      cancel: 'Cancelar',
      reject: 'Rechazar',
    },
    description:
      'Gestiona las propuestas de cita, confirma espacios aceptados y consulta el historial de atencion.',
    emptyState: 'No encontramos citas con los criterios seleccionados.',
    meta: {
      description: 'Gestiona las citas del paciente dentro de Docqee.',
      title: 'Docqee | Citas del Paciente',
    },
    searchLabel: 'Buscar cita',
    searchPlaceholder: 'Buscar por estudiante, sede o universidad...',
    successNoticePrefix: 'Cita actualizada:',
    title: 'Citas',
  },
  conversationsPage: {
    actionLabels: {
      sendMessage: 'Enviar mensaje',
    },
    description:
      'Habla con los estudiantes cuando una solicitud fue aceptada y consulta hilos previos en solo lectura.',
    emptyState: 'No encontramos conversaciones con los criterios seleccionados.',
    meta: {
      description: 'Gestiona las conversaciones del paciente dentro de Docqee.',
      title: 'Docqee | Conversaciones del Paciente',
    },
    searchLabel: 'Buscar conversacion',
    searchPlaceholder: 'Buscar por estudiante o universidad...',
    successNoticePrefix: 'Conversacion actualizada:',
    title: 'Conversaciones',
  },
  notificationsPage: {
    description:
      'Revisa las novedades del portal, marca avisos como leidos y abre el detalle asociado cuando quieras profundizar.',
    emptyState: 'No tienes notificaciones por ahora.',
    markAllReadLabel: 'Marcar todas como leidas',
    markReadLabel: 'Marcar como leida',
    meta: {
      description: 'Consulta y gestiona las notificaciones del portal del paciente dentro de Docqee.',
      title: 'Docqee | Notificaciones del Paciente',
    },
    title: 'Notificaciones',
    unreadLabel: 'Sin leer',
    viewDetailLabel: 'Ver detalle',
  },
  profilePage: {
    actionLabels: {
      reset: 'Restablecer',
      save: 'Guardar cambios',
      uploadPhoto: 'Subir foto',
    },
    description:
      'Mantiene al dia tus datos de contacto y la informacion base que acompana tus solicitudes dentro de la plataforma.',
    meta: {
      description: 'Gestiona el perfil y la informacion de contacto del paciente dentro de Docqee.',
      title: 'Docqee | Perfil del Paciente',
    },
    successMessage: 'Tu perfil se actualizo correctamente en esta demo frontend.',
    title: 'Mi perfil',
  },
  requestsPage: {
    actionLabels: {
      cancel: 'Cancelar solicitud',
      viewConversation: 'Ver chat',
    },
    description:
      'Consulta el estado de cada solicitud enviada, revisa respuestas y mantén visibilidad del seguimiento.',
    emptyState: 'No encontramos solicitudes con los criterios seleccionados.',
    meta: {
      description: 'Gestiona las solicitudes del paciente dentro de Docqee.',
      title: 'Docqee | Solicitudes del Paciente',
    },
    searchLabel: 'Buscar solicitud',
    searchPlaceholder: 'Buscar por estudiante o universidad...',
    successNoticePrefix: 'Solicitud actualizada:',
    title: 'Mis solicitudes',
  },
  searchPage: {
    actionLabels: {
      sendRequest: 'Enviar solicitud',
    },
    description:
      'Explora estudiantes disponibles, revisa su perfil clinico y deja lista tu solicitud de atencion.',
    emptyState: 'No encontramos estudiantes con los criterios seleccionados.',
    meta: {
      description: 'Explora estudiantes y solicita atencion odontologica universitaria en Docqee.',
      title: 'Docqee | Buscar Estudiantes',
    },
    searchLabel: 'Buscar estudiante',
    searchPlaceholder: 'Buscar por nombre, universidad o tratamiento...',
    successNoticePrefix: 'Solicitud enviada:',
    title: 'Buscar estudiantes',
  },
  shell: {
    adminUser: {
      firstName: 'Sara',
      lastName: 'Lopez',
    },
    homePath: ROUTES.home,
    mobileTitle: 'Portal paciente',
    logoutCta: {
      label: 'Cerrar sesion',
      to: ROUTES.login,
    },
    navigation: [
      {
        icon: 'search',
        label: 'Buscar estudiantes',
        matchPrefix: ROUTES.patientSearchStudents,
        to: ROUTES.patientSearchStudents,
      },
      {
        icon: 'clipboard-list',
        label: 'Mis solicitudes',
        matchPrefix: ROUTES.patientRequests,
        to: ROUTES.patientRequests,
      },
      {
        icon: 'bell',
        label: 'Notificaciones',
        matchPrefix: ROUTES.patientNotifications,
        to: ROUTES.patientNotifications,
      },
      {
        icon: 'message-square-more',
        label: 'Conversaciones',
        matchPrefix: ROUTES.patientConversations,
        to: ROUTES.patientConversations,
      },
      {
        icon: 'calendar-days',
        label: 'Citas',
        matchPrefix: ROUTES.patientAppointments,
        to: ROUTES.patientAppointments,
      },
      {
        icon: 'user-round',
        label: 'Mi perfil',
        matchPrefix: ROUTES.patientProfile,
        to: ROUTES.patientProfile,
      },
    ],
    title: 'Portal del paciente',
  },
} as const;
