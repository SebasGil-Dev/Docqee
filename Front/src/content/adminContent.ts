import { ROUTES } from '@/constants/routes';

export const adminContent = {
  credentialsPage: {
    actionLabels: {
      delete: 'Eliminar',
      editEmail: 'Editar correo',
      resend: 'Reenviar',
      saveEmail: 'Guardar correo',
      send: 'Enviar',
    },
    description:
      'Gestiona las credenciales iniciales de las universidades registradas y aun no consolidadas operativamente.',
    emailInvalidMessage: 'Ingresa un correo electronico valido',
    emptyState:
      'No hay credenciales pendientes por gestionar en este momento.',
    eyebrow: '',
    meta: {
      description:
        'Docqee permite revisar y administrar las credenciales pendientes del modulo admin.',
      title: 'Docqee | Envio de Credenciales',
    },
    subtitle: '',
    title: 'Envio de Credenciales',
  },
  registerPage: {
    administratorSectionTitle: 'Datos del administrador universitario',
    backLabel: 'Volver a universidades',
    description:
      'Completa los datos basicos para registrar una nueva universidad y dejar su credencial inicial lista para gestion.',
    fields: {
      adminEmail: {
        invalidMessage: 'Ingresa un correo electronico valido',
        label: 'Correo del administrador universitario',
        placeholder: 'admin@universidad.edu.co',
        requiredMessage: 'El correo del administrador universitario es obligatorio',
      },
      adminFirstName: {
        label: 'Nombres del administrador universitario',
        placeholder: 'Ingresa los nombres',
        requiredMessage: 'Los nombres del administrador universitario son obligatorios',
      },
      adminLastName: {
        label: 'Apellidos del administrador universitario',
        placeholder: 'Ingresa los apellidos',
        requiredMessage: 'Los apellidos del administrador universitario son obligatorios',
      },
      adminPhone: {
        label: 'Celular opcional',
        placeholder: '3001234567',
      },
      city: {
        emptyMessage: 'No encontramos ciudades disponibles',
        errorMessage: 'No pudimos cargar las ciudades',
        label: 'Ciudad',
        loadingMessage: 'Cargando ciudades...',
        placeholder: 'Selecciona una ciudad',
        requiredMessage: 'La ciudad es obligatoria',
      },
      mainLocality: {
        label: 'Localidad principal',
        emptyMessage: 'No encontramos localidades disponibles',
        errorMessage: 'No pudimos cargar las localidades',
        loadingMessage: 'Cargando localidades...',
        placeholder: 'Selecciona una localidad',
        placeholderWithoutCity: 'Selecciona una ciudad primero',
        requiredMessage: 'La localidad principal es obligatoria',
      },
      name: {
        label: 'Nombre de la universidad',
        placeholder: 'Ingresa el nombre oficial',
        requiredMessage: 'El nombre de la universidad es obligatorio',
      },
    },
    institutionSectionTitle: 'Datos de la institucion',
    meta: {
      description:
        'Registra nuevas universidades dentro del modulo administrativo de Docqee.',
      title: 'Docqee | Registrar Universidad',
    },
    submitLabel: 'Registrar universidad',
    successMessage:
      'La universidad se registro correctamente y la credencial quedo lista para envio.',
    title: 'Registrar Universidad',
  },
  shell: {
    adminUser: {
      firstName: 'Laura',
      lastName: 'Gomez',
    },
    homePath: ROUTES.home,
    eyebrow: 'Panel administrativo',
    logoutCta: {
      kind: 'internal',
      label: 'Cerrar sesion',
      to: ROUTES.login,
    },
    navigation: [
      {
        icon: 'building2',
        label: 'Universidades',
        matchPrefix: ROUTES.adminUniversities,
        to: ROUTES.adminUniversities,
      },
      {
        icon: 'key-round',
        label: 'Envio de Credenciales',
        matchPrefix: ROUTES.adminCredentials,
        to: ROUTES.adminCredentials,
      },
    ],
    subtitle:
      'Controla el registro, consolidacion y acceso inicial de las universidades aliadas.',
    supportNote:
      'Esta version funciona solo en frontend y queda lista para conectarse luego a la API.',
    title: 'Administrador de la plataforma',
  },
  statusLabels: {
    credential: {
      generated: 'Generada',
      sent: 'Enviada',
    },
    university: {
      active: 'Activa',
      inactive: 'Inactiva',
      pending: 'Pendiente',
    },
  },
  universitiesPage: {
    actionLabels: {
      activate: 'Activar',
      deactivate: 'Inactivar',
      register: 'Registrar universidad',
    },
    description:
      'Centraliza la gestion de universidades registradas, su estado operativo y el avance de consolidacion.',
    emptyState:
      'No encontramos universidades con ese nombre.',
    meta: {
      description:
        'Consulta el estado de las universidades registradas dentro del modulo admin de Docqee.',
      title: 'Docqee | Gestion de Universidades',
    },
    pendingActionLabel: 'Pendiente',
    searchLabel: 'Buscar universidad',
    searchPlaceholder: 'Buscar por nombre de universidad...',
    subtitle: '',
    successNoticePrefix: 'Actualizacion completada:',
    summaryLabel: 'Universidades registradas',
    tableTitle: 'Instituciones registradas',
    title: 'Gestion de Universidades',
  },
} as const;
