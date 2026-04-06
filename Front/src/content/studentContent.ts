import { ROUTES } from '@/constants/routes';

export const studentContent = {
  agendaPage: {
    actionLabels: {
      add: 'Agregar bloqueo',
      cancelEdit: 'Cancelar edicion',
      save: 'Guardar bloqueo',
    },
    description:
      'Define tus bloqueos especificos o recurrentes para evitar programaciones en horarios no disponibles.',
    emptyState: 'Aun no tienes bloqueos registrados en la agenda.',
    meta: {
      description:
        'Gestiona la disponibilidad operativa del estudiante dentro de Docqee.',
      title: 'Docqee | Agenda del Estudiante',
    },
    successNoticePrefix: 'Agenda actualizada:',
    title: 'Agenda',
  },
  profilePage: {
    actionLabels: {
      addLink: 'Agregar enlace',
      reset: 'Restablecer',
      save: 'Guardar cambios',
      uploadPhoto: 'Subir foto',
    },
    description:
      'Actualiza la informacion publica que veran los pacientes durante la busqueda y consulta de tu perfil.',
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
        icon: 'user-round',
        label: 'Mi perfil',
        matchPrefix: ROUTES.studentProfile,
        to: ROUTES.studentProfile,
      },
      {
        icon: 'stethoscope',
        label: 'Tratamientos y sedes',
        matchPrefix: ROUTES.studentTreatments,
        to: ROUTES.studentTreatments,
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
    ],
    title: 'Portal del estudiante',
  },
  treatmentsPage: {
    actionLabels: {
      activate: 'Activar',
      deactivate: 'Inactivar',
    },
    description:
      'Controla los tratamientos y sedes que hacen parte de tu oferta activa dentro de la plataforma.',
    emptySitesState: 'No hay sedes asociadas a tu practica en este momento.',
    emptyTreatmentsState: 'No hay tratamientos asociados a tu perfil en este momento.',
    meta: {
      description:
        'Gestiona la oferta de tratamientos y sedes activas del estudiante dentro de Docqee.',
      title: 'Docqee | Tratamientos y Sedes',
    },
    title: 'Tratamientos y sedes',
  },
} as const;
