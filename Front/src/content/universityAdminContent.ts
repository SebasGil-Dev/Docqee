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
    description:
      'Gestiona las credenciales iniciales de los estudiantes registrados por la universidad.',
    editEmailHelp:
      'Editar el correo actualiza tambien el estudiante y no modifica ni la contrasena ni el estado de la credencial.',
    emailInvalidMessage: 'Ingresa un correo electronico valido',
    emptyState: 'No hay credenciales pendientes por gestionar en este momento.',
    meta: {
      description:
        'Gestiona las credenciales pendientes de los estudiantes del modulo universitario de Docqee.',
      title: 'Docqee | Credenciales',
    },
    subtitle:
      'Cada credencial puede enviarse, reenviarse o actualizar su correo antes del ingreso inicial.',
    successNoticePrefix: 'Actualizacion completada:',
    tableTitle: 'Credenciales pendientes',
    title: 'Credenciales',
  },
  institutionPage: {
    actionLabels: {
      changePassword: 'Cambiar contrasena',
      reset: 'Restablecer',
      save: 'Guardar cambios',
      savePassword: 'Actualizar contrasena',
      uploadLogo: 'Subir logo',
    },
    description: '',
    logoHelper:
      'Sube un PNG o JPG para previsualizar el logo',
    meta: {
      description:
        'Edita la informacion institucional del modulo universitario de Docqee.',
      title: 'Docqee | Informacion Institucional',
    },
    passwordPanelDescription:
      'Este formulario es visual en esta etapa y deja el flujo listo para conectarse despues al backend.',
    passwordPanelTitle: 'Actualizar contrasena',
    passwordSuccessMessage:
      'La contrasena se actualizo correctamente en esta demo frontend.',
    sectionDescriptions: {
      administrator: '',
      institution: '',
    },
    sectionTitles: {
      administrator: 'Datos del administrador',
      institution: 'Datos de la universidad',
    },
    successMessage: 'Los cambios institucionales se guardaron correctamente.',
    title: 'Informacion institucional',
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
    logoutCta: {
      label: 'Cerrar sesion',
      to: ROUTES.login,
    },
    navigation: [
      {
        icon: 'building2',
        label: 'Informacion institucional',
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
        icon: 'badge',
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
      title: 'Docqee | Gestion de Estudiantes',
    },
    searchLabel: 'Buscar estudiante',
    searchPlaceholder: 'Buscar por nombre o cedula...',
    successNoticePrefix: 'Actualizacion completada:',
    subtitle: '',
    summaryLabel: 'Estudiantes registrados',
    tableTitle: 'Estudiantes registrados',
    title: 'Gestion de estudiantes',
  },
  teachersPage: {
    actionLabels: {
      activate: 'Activar',
      bulkUpload: 'Carga masiva',
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
