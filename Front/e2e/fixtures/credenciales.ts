/**
 * Credenciales y datos de prueba para la suite E2E de Docqee.
 * Entorno: https://docqee.vercel.app/
 */

export const PACIENTE = {
  correo:     'FernadaESba2@ozsaip.com',
  contrasena: 'Prueba123*',
  nombre:     'Fernanda Baez',
};

export const ESTUDIANTE = {
  correo:     'sebastian@wnbaldwy.com',
  contrasena: 'Prueba123*',
  nombre:     'Sebastián Díaz Romero',
};

export const ADMIN_PLATAFORMA = {
  correo:     'jsgil68@ucatolica.edu.co',
  contrasena: 'AdminSebas123*',
};

export const ADMIN_UNIVERSIDAD = {
  correo:      'alejandrot@xkxkud.com',
  contrasena:  'Prueba123*',
  universidad: 'Nueva Colombia',
};

/** Rutas reales de la aplicación (de src/constants/routes.ts) */
export const RUTAS = {
  home:                   '/',
  login:                  '/login',
  registro:               '/registro',
  recuperarContrasena:    '/recuperar-contrasena',

  // Paciente
  pacienteInicio:             '/paciente/inicio',
  pacienteBuscar:             '/paciente/buscar-estudiantes',
  pacienteSolicitudes:        '/paciente/solicitudes',
  pacienteCitas:              '/paciente/citas',
  pacienteConversaciones:     '/paciente/conversaciones',
  pacientePerfil:             '/paciente/mi-perfil',
  pacienteAgenda:             '/paciente/agenda',

  // Estudiante
  estudianteInicio:           '/estudiante/inicio',
  estudianteSolicitudes:      '/estudiante/solicitudes',
  estudianteCitas:            '/estudiante/citas',
  estudianteConversaciones:   '/estudiante/conversaciones',
  estudiantePerfil:           '/estudiante/mi-perfil',
  estudianteAgenda:           '/estudiante/agenda',

  // Admin Plataforma
  adminUniversidades:         '/admin/universidades',
  adminRegistrarUniversidad:  '/admin/universidades/registrar',
  adminCredenciales:          '/admin/credenciales',

  // Admin Universidad
  universidadInicio:              '/universidad/inicio',
  universidadInfo:                '/universidad/informacion-institucional',
  universidadEstudiantes:         '/universidad/estudiantes',
  universidadRegistrarEstudiante: '/universidad/estudiantes/registrar',
  universidadDocentes:            '/universidad/docentes',
  universidadRegistrarDocente:    '/universidad/docentes/registrar',
  universidadCargaMasiva:         '/universidad/carga-masiva',
  universidadCredenciales:        '/universidad/credenciales',
} as const;

/** Rutas de archivos de sesión guardados (storageState) — se generan en e2e/generados/ */
export const SESIONES = {
  paciente:         'e2e/generados/sesion-paciente.json',
  estudiante:       'e2e/generados/sesion-estudiante.json',
  adminPlataforma:  'e2e/generados/sesion-admin-plataforma.json',
  adminUniversidad: 'e2e/generados/sesion-admin-universidad.json',
} as const;
