export const ROUTES = {
  adminCredentials: '/admin/credenciales',
  adminRegisterUniversity: '/admin/universidades/registrar',
  adminRoot: '/admin',
  adminUniversities: '/admin/universidades',
  firstLoginPassword: '/primer-ingreso/cambiar-contrasena',
  forgotPassword: '/recuperar-contrasena',
  home: '/',
  login: '/login',
  register: '/registro',
  universityBulkUpload: '/universidad/carga-masiva',
  universityCredentials: '/universidad/credenciales',
  universityInstitution: '/universidad/informacion-institucional',
  universityRegisterStudent: '/universidad/estudiantes/registrar',
  universityRegisterTeacher: '/universidad/docentes/registrar',
  universityRoot: '/universidad',
  universityStudents: '/universidad/estudiantes',
  universityTeachers: '/universidad/docentes',
  verifyEmail: '/verificar-correo',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
