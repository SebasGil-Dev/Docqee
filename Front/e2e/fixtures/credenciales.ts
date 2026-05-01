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

/** Rutas reales de la aplicación (de src/constants/routes.ts) */
export const RUTAS = {
  home:                   '/',
  login:                  '/login',
  registro:               '/registro',
  recuperarContrasena:    '/recuperar-contrasena',

  pacienteInicio:         '/paciente/inicio',
  pacienteBuscar:         '/paciente/buscar-estudiantes',
  pacienteSolicitudes:    '/paciente/solicitudes',
  pacienteCitas:          '/paciente/citas',
  pacienteConversaciones: '/paciente/conversaciones',
  pacientePerfil:         '/paciente/mi-perfil',

  estudianteInicio:       '/estudiante/inicio',
  estudianteSolicitudes:  '/estudiante/solicitudes',
  estudianteCitas:        '/estudiante/citas',
  estudianteConversaciones: '/estudiante/conversaciones',
  estudiantePerfil:       '/estudiante/mi-perfil',
} as const;

/** Rutas de archivos de sesión guardados (storageState) */
export const SESIONES = {
  paciente:   'e2e/fixtures/sesion-paciente.json',
  estudiante: 'e2e/fixtures/sesion-estudiante.json',
} as const;
