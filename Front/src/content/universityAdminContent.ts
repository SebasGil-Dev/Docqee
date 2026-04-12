import { ROUTES } from '@/constants/routes';

export const universityAdminContent = {
  bulkUploadPage: {
    actionLabels: {
      downloadTemplate: 'Descargar plantilla',
      process: 'Procesar carga',
      removeFile: 'Quitar archivo',
      validate: 'Validar archivo',
    },
    description: '',
    filePickerLabel: 'Seleccionar archivo',
    helperText:
      'Esta primera version valida solo el flujo visual y deja la integracion lista para backend.',
    invalidFileMessage:
      'Solo aceptamos archivos .csv, .xlsx o .xls en este flujo de carga.',
    invalidMockMessage:
      'La validacion mock encontro inconsistencias. Usa un nombre de archivo sin palabras como error o invalido para continuar.',
    meta: {
      description:
        'Gestiona la carga masiva de estudiantes y docentes dentro del modulo universitario de Docqee.',
      title: 'Docqee | Carga Masiva',
    },
    processedStudentsMessage:
      'La carga mock creo estudiantes activos y sus credenciales quedaron generadas.',
    processedTeachersMessage:
      'La carga mock creo docentes activos sin generar credenciales.',
    readyToValidateMessage: 'Archivo listo para validar.',
    subtitle: '',
    templateDescription:
      'Elige si vas a preparar un archivo para estudiantes o para docentes.',
    templateOptions: [
      { description: 'Incluye nombres, documento, correo, celular y semestre.', value: 'students' },
      { description: 'Incluye nombres y datos basicos de documento.', value: 'teachers' },
    ] as const,
    title: 'Carga masiva',
    uploadCardTitle: 'Subir archivo',
    validatedMessage:
      'La validacion mock fue exitosa. Ya puedes continuar con el procesamiento.',
  },
  credentialsPage: {
    actionLabels: {
      delete: 'Eliminar',
      editEmail: 'Editar correo',
      resend: 'Reenviar',
      saveEmail: 'Guardar correo',
      send: 'Enviar',
      sendAll: 'Enviar todas',
    },
    description: '',
    editEmailHelp: '',
    emailInvalidMessage: 'Ingresa un correo electronico valido',
    emptyState: 'No hay credenciales pendientes por gestionar en este momento.',
    meta: {
      description:
        'Gestiona las credenciales pendientes de los estudiantes del modulo universitario de Docqee.',
      title: 'Docqee | Credenciales',
    },
    subtitle: '',
    successNoticePrefix: 'Actualizacion completada:',
    tableTitle: 'Credenciales pendientes',
    title: 'Credenciales',
  },
  homePage: {
    description: '',
    meta: {
      description:
        'Consulta el panel principal del administrador universitario dentro de Docqee.',
      title: 'Docqee | Inicio Universidad',
    },
    title: 'Inicio',
  },
  institutionPage: {
    actionLabels: {
      changePassword: 'Cambiar contraseña',
      reset: 'Restablecer',
      save: 'Guardar cambios',
      savePassword: 'Actualizar contraseña',
      uploadLogo: 'Subir logo',
    },
    description: '',
    logoHelper: '',
    meta: {
      description:
        'Edita la información institucional del módulo universitario de Docqee.',
      title: 'Docqee | Información Institucional',
    },
    passwordPanelDescription: '',
    passwordPanelTitle: 'Actualizar contraseña',
    passwordSuccessMessage: 'La contraseña se actualizó correctamente',
    sectionDescriptions: {
      administrator: '',
      institution: '',
    },
    sectionTitles: {
      administrator: 'Datos del administrador',
      institution: 'Datos de la universidad',
    },
    successMessage: 'Los cambios institucionales se guardaron correctamente.',
    title: 'Información institucional',
  },
  registerStudentPage: {
    backLabel: 'Volver a estudiantes',
    credentialNotice: '',
    description: '',
    meta: {
      description:
        'Registra estudiantes dentro del modulo universitario de Docqee.',
      title: 'Docqee | Registrar Estudiante',
    },
    submitLabel: 'Registrar estudiante',
    successMessage:
      'El estudiante se registro correctamente y su credencial inicial quedo generada.',
    title: 'Registrar estudiante',
  },
  registerTeacherPage: {
    backLabel: 'Volver a docentes',
    description:
      'Completa el formulario para registrar un nuevo docente dentro de la universidad.',
    meta: {
      description:
        'Registra docentes dentro del modulo universitario de Docqee.',
      title: 'Docqee | Registrar Docente',
    },
    submitLabel: 'Registrar docente',
    successMessage: 'El docente se registro correctamente.',
    title: 'Registrar docente',
  },
  shell: {
    adminUser: {
      firstName: 'Daniela',
      lastName: 'Quintero',
    },
    homePath: ROUTES.home,
    mobileTitle: 'Admin Universidad',
    logoutCta: {
      label: 'Cerrar sesion',
      to: ROUTES.login,
    },
    navigation: [
      {
        icon: 'house',
        label: 'Inicio',
        matchPrefix: ROUTES.universityHome,
        to: ROUTES.universityHome,
      },
      {
        icon: 'building2',
        label: 'Información institucional',
        matchPrefix: ROUTES.universityInstitution,
        to: ROUTES.universityInstitution,
      },
      {
        icon: 'graduation-cap',
        label: 'Estudiantes',
        matchPrefix: ROUTES.universityStudents,
        to: ROUTES.universityStudents,
      },
      {
        icon: 'presentation',
        label: 'Docentes',
        matchPrefix: ROUTES.universityTeachers,
        to: ROUTES.universityTeachers,
      },
      {
        icon: 'upload',
        label: 'Carga masiva',
        matchPrefix: ROUTES.universityBulkUpload,
        to: ROUTES.universityBulkUpload,
      },
      {
        icon: 'key-round',
        label: 'Credenciales',
        matchPrefix: ROUTES.universityCredentials,
        to: ROUTES.universityCredentials,
      },
    ],
    title: 'Administrador de la universidad',
  },
  studentsPage: {
    actionLabels: {
      activate: 'Activar',
      deactivate: 'Inactivar',
      register: 'Registrar estudiante',
    },
    description: '',
    emptyState: 'No encontramos estudiantes con esos criterios.',
    meta: {
      description:
        'Gestiona los estudiantes del modulo universitario de Docqee.',
      title: 'Docqee | Gestión de Estudiantes',
    },
    searchLabel: 'Buscar estudiante',
    searchPlaceholder: 'Buscar por nombre o número de identificación',
    successNoticePrefix: 'Actualizacion completada:',
    subtitle: '',
    summaryLabel: 'Estudiantes registrados',
    tableTitle: 'Estudiantes registrados',
    title: 'Gestión de estudiantes',
  },
  teachersPage: {
    actionLabels: {
      activate: 'Activar',
      deactivate: 'Inactivar',
      register: 'Registrar docente',
    },
    description: '',
    emptyState: 'No encontramos docentes con esos criterios.',
    meta: {
      description:
        'Gestiona los docentes del modulo universitario de Docqee.',
      title: 'Docqee | Gestion de Docentes',
    },
    searchLabel: 'Buscar docente',
    searchPlaceholder: 'Buscar por nombre o cedula...',
    successNoticePrefix: 'Actualizacion completada:',
    subtitle: '',
    summaryLabel: 'Docentes registrados',
    tableTitle: 'Docentes registrados',
    title: 'Gestion de docentes',
  },
} as const;
