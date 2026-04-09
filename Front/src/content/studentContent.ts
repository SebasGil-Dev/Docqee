import { ROUTES } from '@/constants/routes';

export const studentContent = {
  agendaPage: {
    actionLabels: {
      add: 'Agregar bloqueo',
      cancelEdit: 'Cancelar edicion',
      save: 'Guardar bloqueo',
    },
    description: '',
    emptyState: 'Aun no tienes bloqueos registrados en la agenda.',
    meta: {
      description:
        'Consulta citas y bloqueos operativos del estudiante dentro de Docqee.',
      title: 'Docqee | Agenda del Estudiante',
    },
    successNoticePrefix: 'Agenda actualizada:',
    title: 'Agenda',
  },
  appointmentsPage: {
    actionLabels: {
      cancel: 'Cancelar cita',
      create: 'Agendar cita',
      edit: 'Editar cita',
      finalize: 'Finalizar cita',
      save: 'Guardar cita',
      update: 'Actualizar cita',
    },
    description: '',
    emptyState: 'No encontramos citas con los criterios seleccionados.',
    meta: {
      description:
        'Consulta el historial y estado de las citas asignadas al estudiante dentro de Docqee.',
      title: 'Docqee | Citas del Estudiante',
    },
    searchLabel: 'Buscar paciente',
    searchPlaceholder: 'Buscar por nombre del paciente...',
    successNoticePrefix: 'Citas actualizadas:',
    title: 'Citas',
  },
  conversationsPage: {
    actionLabels: {
      openConversation: 'Abrir chat',
      sendMessage: 'Enviar mensaje',
      viewConversation: 'Ver chat',
    },
    description: '',
    emptyState: 'No encontramos conversaciones con los filtros seleccionados.',
    meta: {
      description:
        'Gestiona las conversaciones activas entre paciente y estudiante dentro de Docqee.',
      title: 'Docqee | Chat',
    },
    searchLabel: 'Buscar paciente',
    searchPlaceholder: 'Buscar por nombre del paciente...',
    successNoticePrefix: 'Conversacion actualizada:',
    title: 'Chat',
  },
  profilePage: {
    actionLabels: {
      addLink: 'Agregar enlace',
      reset: 'Restablecer',
      save: 'Guardar cambios',
      uploadPhoto: 'Subir foto',
    },
    description: '',
    helperText:
      'Tu perfil visible depende de tener tratamientos y sedes activos, ademas de una descripcion clara.',
    invalidLinkMessage: 'Ingresa un enlace valido con http:// o https://',
    linkTypes: [
      { id: 'RED_PROFESIONAL', label: 'Red profesional' },
      { id: 'PORTAFOLIO', label: 'Portafolio' },
      { id: 'HOJA_DE_VIDA', label: 'Hoja de vida' },
      { id: 'OTRO', label: 'Otro' },
    ] as const,
    meta: {
      description:
        'Gestiona el perfil profesional visible del estudiante dentro de Docqee.',
      title: 'Docqee | Mi Perfil',
    },
    successMessage: 'Tu perfil se actualizo correctamente en esta demo frontend.',
    title: 'Mi perfil',
  },
  requestsPage: {
    actionLabels: {
      accept: 'Aceptar',
      close: 'Cerrar',
      reject: 'Rechazar',
    },
    description:
      'Revisa las solicitudes de pacientes, responde cada caso y controla cuando una vinculacion sigue activa.',
    emptyState: 'No encontramos solicitudes con los criterios seleccionados.',
    meta: {
      description:
        'Gestiona las solicitudes recibidas por el estudiante dentro de Docqee.',
      title: 'Docqee | Solicitudes',
    },
    searchLabel: 'Buscar solicitud',
    searchPlaceholder: 'Buscar por paciente o ciudad...',
    successNoticePrefix: 'Solicitud actualizada:',
    title: 'Solicitudes',
  },
  shell: {
    adminUser: {
      firstName: 'Valentina',
      lastName: 'Rios',
    },
    homePath: ROUTES.home,
    mobileTitle: 'Portal estudiante',
    logoutCta: {
      label: 'Cerrar sesion',
      to: ROUTES.login,
    },
    navigation: [
      {
        icon: 'house',
        label: 'Inicio',
        matchPrefix: ROUTES.studentTreatments,
        to: ROUTES.studentTreatments,
      },
      {
        icon: 'user-round',
        label: 'Mi perfil',
        matchPrefix: ROUTES.studentProfile,
        to: ROUTES.studentProfile,
      },
      {
        icon: 'calendar-days',
        label: 'Agenda',
        matchPrefix: ROUTES.studentAgenda,
        to: ROUTES.studentAgenda,
      },
      {
        icon: 'clipboard-list',
        label: 'Solicitudes',
        matchPrefix: ROUTES.studentRequests,
        to: ROUTES.studentRequests,
      },
      {
        icon: 'calendar-check-2',
        label: 'Citas',
        matchPrefix: ROUTES.studentAppointments,
        to: ROUTES.studentAppointments,
      },
      {
        icon: 'message-square-more',
        label: 'Chat',
        matchPrefix: ROUTES.studentConversations,
        to: ROUTES.studentConversations,
      },
    ],
    title: 'Portal del estudiante',
  },
  treatmentsPage: {
    actionLabels: {
      activate: 'Activar',
      deactivate: 'Inactivar',
    },
    description: '',
    emptySitesState: 'No hay sedes asociadas a tu practica en este momento.',
    emptyTreatmentsState: 'No hay tratamientos asociados a tu perfil en este momento.',
    meta: {
      description:
        'Consulta el panel principal del estudiante con tratamientos, sedes, citas y comentarios dentro de Docqee.',
      title: 'Docqee | Inicio del Estudiante',
    },
    title: 'Inicio',
  },
} as const;
