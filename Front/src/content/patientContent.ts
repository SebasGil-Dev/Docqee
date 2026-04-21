import { ROUTES } from '@/constants/routes';

export const patientContent = {
  agendaPage: {
    description:
      'Organiza tus citas por dia, semana o mes y mantente al tanto de cada espacio confirmado, pendiente o finalizado.',
    meta: {
      description: 'Consulta la agenda del paciente dentro de Docqee.',
      title: 'Docqee | Agenda del Paciente',
    },
    title: 'Agenda',
  },
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
    description: '',
    emptyState: 'No encontramos conversaciones con los criterios seleccionados.',
    meta: {
      description: 'Gestiona el chat del paciente dentro de Docqee.',
      title: 'Docqee | Chat del Paciente',
    },
    searchLabel: 'Buscar conversacion',
    searchPlaceholder: 'Buscar por estudiante o universidad...',
    successNoticePrefix: 'Conversacion actualizada:',
    title: 'Chat',
  },
  homePage: {
    ctaLabel: 'Buscar estudiantes',
    description:
      'Consulta rapidamente tus solicitudes, proximas citas, conversaciones activas y estudiantes disponibles.',
    meta: {
      description: 'Consulta el resumen principal del portal del paciente dentro de Docqee.',
      title: 'Docqee | Inicio del Paciente',
    },
    title: 'Inicio',
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
    title: 'Perfil',
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
    title: 'Solicitudes',
  },
  searchPage: {
    actionLabels: {
      sendRequest: 'Enviar solicitud',
    },
    description:
      'Busca por nombre o combina filtros para encontrar estudiantes segun tratamiento, ubicacion, universidad y calificacion.',
    emptyState: 'No encontramos estudiantes con los criterios seleccionados.',
    meta: {
      description: 'Explora estudiantes y solicita atencion odontologica universitaria en Docqee.',
      title: 'Docqee | Buscar Estudiantes',
    },
    searchLabel: 'Buscar estudiante',
    searchPlaceholder: 'Buscar por nombre de estudiante',
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
        icon: 'house',
        label: 'Inicio',
        matchPrefix: ROUTES.patientHome,
        to: ROUTES.patientHome,
      },
      {
        icon: 'search',
        label: 'Buscar estudiantes',
        matchPrefix: ROUTES.patientSearchStudents,
        to: ROUTES.patientSearchStudents,
      },
      {
        icon: 'clipboard-list',
        label: 'Solicitudes',
        matchPrefix: ROUTES.patientRequests,
        to: ROUTES.patientRequests,
      },
      {
        icon: 'calendar-check-2',
        label: 'Citas',
        matchPrefix: ROUTES.patientAppointments,
        to: ROUTES.patientAppointments,
      },
      {
        icon: 'calendar-days',
        label: 'Agenda',
        matchPrefix: ROUTES.patientAgenda,
        to: ROUTES.patientAgenda,
      },
      {
        icon: 'message-square-more',
        label: 'Chat',
        matchPrefix: ROUTES.patientConversations,
        to: ROUTES.patientConversations,
      },
      {
        icon: 'bell',
        label: 'Notificaciones',
        matchPrefix: ROUTES.patientNotifications,
        to: ROUTES.patientNotifications,
      },
      {
        icon: 'user-round',
        label: 'Perfil',
        matchPrefix: ROUTES.patientProfile,
        to: ROUTES.patientProfile,
      },
    ],
    title: 'Portal del paciente',
  },
} as const;
