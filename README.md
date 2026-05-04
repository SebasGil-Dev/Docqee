# Docqee

Docqee es una plataforma web para conectar pacientes con estudiantes de salud vinculados a universidades. El sistema cubre administracion institucional, registro y verificacion de pacientes, gestion de estudiantes y docentes, busqueda de estudiantes, solicitudes, conversaciones, agenda, citas, reprogramaciones, valoraciones y correos transaccionales.

La documentacion evita incluir claves reales, tokens, URLs privadas de base de datos o credenciales operativas. Para configurar entornos usa archivos locales ignorados por Git y deja en el repositorio solo ejemplos con placeholders.

## Estructura general

```text
Docqee/
  Back/   API NestJS, Prisma, PostgreSQL/Supabase, correo y storage.
  Front/  SPA React con Vite, TypeScript, Tailwind CSS y pruebas.
```

La raiz contiene scripts que delegan en cada subproyecto:

```bash
npm run build
npm run build:back
npm run build:front
```

## Stack principal

Backend:

- NestJS 11.
- Prisma 6.
- PostgreSQL/Supabase.
- JWT, Passport y bcrypt.
- Brevo para correos transaccionales.
- Cloudinary para imagenes.
- `@nestjs/schedule` para tareas automaticas.

Frontend:

- React 18.
- Vite.
- TypeScript.
- Tailwind CSS.
- Lucide React.
- `xlsx` para carga masiva desde Excel.
- Vitest y Playwright.

## Roles

- `ADMIN_PLATAFORMA`: administra universidades y credenciales iniciales de administradores universitarios.
- `ADMIN_UNIVERSIDAD`: administra informacion institucional, estudiantes, docentes, carga masiva y credenciales de estudiantes.
- `ESTUDIANTE`: administra perfil, tratamientos, sedes, agenda, solicitudes, conversaciones, citas y valoraciones.
- `PACIENTE`: se registra con verificacion de correo, busca estudiantes, envia solicitudes, conversa, gestiona citas y valora atenciones.

## Modulos backend activos

Los modulos montados actualmente en `Back/src/app.module.ts` son:

- `AuthModule`
- `CatalogsModule`
- `PlatformAdminModule`
- `UniversityAdminModule`
- `StudentsModule`
- `TeachersModule`
- `CredentialsModule`
- `PatientPortalModule`
- `StudentPortalModule`
- `InstitutionalPartnershipsModule`
- `TasksModule`

Tambien estan activos los modulos compartidos de Prisma, correo, storage, guards, filtros, pipes y utilidades.

## Endpoints principales

Auth:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/register-patient`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/forgot-password/request`
- `POST /auth/forgot-password/verify`
- `POST /auth/forgot-password/reset`
- `POST /auth/first-login/change-password`

Catalogos:

- `GET /catalogs/register`
- `GET /catalogs/cities`
- `GET /catalogs/document-types`
- `GET /catalogs/localities/:cityId`

Admin plataforma:

- `GET /platform-admin/overview`
- `GET /platform-admin/universities`
- `POST /platform-admin/universities`
- `PATCH /platform-admin/universities/:universityId/status`
- `GET /platform-admin/credentials`
- `PATCH /platform-admin/credentials/:credentialId/email`
- `POST /platform-admin/credentials/:credentialId/send`
- `POST /platform-admin/credentials/:credentialId/resend`
- `POST /platform-admin/credentials/send-all`
- `DELETE /platform-admin/credentials/:credentialId`

Admin universidad:

- `GET /university-admin/overview`
- `GET /university-admin/profile`
- `PATCH /university-admin/profile`
- `POST /university-admin/profile/logo`
- `PATCH /university-admin/password`

Estudiantes y docentes administrados por universidad:

- `GET /students`
- `POST /students`
- `POST /students/bulk`
- `PATCH /students/:studentId/status`
- `GET /teachers`
- `POST /teachers`
- `POST /teachers/bulk`
- `PATCH /teachers/:teacherId/status`

Credenciales de estudiantes:

- `GET /credentials/students`
- `PATCH /credentials/students/:credentialId/email`
- `POST /credentials/students/:credentialId/send`
- `POST /credentials/students/:credentialId/resend`
- `POST /credentials/students/send-all`
- `DELETE /credentials/students/:credentialId`

Portal paciente:

- `GET /patient-portal/dashboard`
- `GET /patient-portal/requests`
- `GET /patient-portal/appointments`
- `GET /patient-portal/reviews`
- `GET /patient-portal/students`
- `PATCH /patient-portal/profile`
- `POST /patient-portal/profile/avatar`
- `POST /patient-portal/requests`
- `PATCH /patient-portal/requests/:requestId/status`
- `PATCH /patient-portal/appointments/:appointmentId/status`
- `POST /patient-portal/appointments/:appointmentId/review`
- `GET /patient-portal/conversations/:id`
- `POST /patient-portal/conversations/:id/messages`

Portal estudiante:

- `GET /student-portal/dashboard`
- `GET /student-portal/requests`
- `GET /student-portal/reviews`
- `GET /student-portal/university-sites`
- `GET /student-portal/treatment-types`
- `PATCH /student-portal/treatments`
- `PATCH /student-portal/practice-sites`
- `PATCH /student-portal/requests/:requestId/status`
- `PATCH /student-portal/profile`
- `POST /student-portal/profile/avatar`
- `POST /student-portal/appointments/:appointmentId/review`
- `GET /student-portal/appointments`
- `POST /student-portal/appointments`
- `PATCH /student-portal/appointments/:appointmentId`
- `POST /student-portal/appointments/:appointmentId/reschedule`
- `PATCH /student-portal/appointments/:appointmentId/status`
- `GET /student-portal/conversations`
- `GET /student-portal/conversations/:id`
- `POST /student-portal/conversations/:id/messages`
- `POST /student-portal/schedule-blocks`
- `PATCH /student-portal/schedule-blocks/:blockId`
- `PATCH /student-portal/schedule-blocks/:blockId/status`
- `DELETE /student-portal/schedule-blocks/:blockId`

Publico:

- `POST /api/solicitudes-vinculacion`
- `GET /health`

## Rutas frontend

Publicas:

- `/`
- `/login`
- `/registro`
- `/verificar-correo`
- `/recuperar-contrasena`
- `/primer-ingreso/cambiar-contrasena`
- `/politica-de-privacidad`
- `/terminos-y-condiciones`

Admin plataforma:

- `/admin/universidades`
- `/admin/universidades/registrar`
- `/admin/credenciales`

Admin universidad:

- `/universidad/inicio`
- `/universidad/informacion-institucional`
- `/universidad/estudiantes`
- `/universidad/estudiantes/registrar`
- `/universidad/docentes`
- `/universidad/docentes/registrar`
- `/universidad/carga-masiva`
- `/universidad/credenciales`

Paciente:

- `/paciente/inicio`
- `/paciente/buscar-estudiantes`
- `/paciente/solicitudes`
- `/paciente/agenda`
- `/paciente/conversaciones`
- `/paciente/citas`
- `/paciente/mi-perfil`

Estudiante:

- `/estudiante/inicio`
- `/estudiante/mi-perfil`
- `/estudiante/agenda`
- `/estudiante/citas`
- `/estudiante/solicitudes`
- `/estudiante/conversaciones`

La ruta historica `/estudiante/notificaciones` redirige al inicio del estudiante.

## Variables de entorno

No subas archivos `.env` reales. En Git solo debe permanecer `Back/.env.example` u otros archivos de ejemplo con placeholders.

Backend:

- `PORT`
- `NODE_ENV`
- `FRONTEND_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `BREVO_API_KEY`
- `MAIL_FROM`
- `INSTITUTIONAL_PARTNERSHIP_EMAIL`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL`
- Variables `PLATFORM_ADMIN_*` para seed local.

Frontend:

- `VITE_API_URL`

## Puesta en marcha local

Instalar dependencias:

```bash
npm --prefix Back install
npm --prefix Front install
```

Backend:

```bash
cp Back/.env.example Back/.env
npm --prefix Back run prisma:generate
npm --prefix Back run start:dev
```

Frontend:

```bash
npm --prefix Front run dev
```

Por defecto el backend escucha en `http://localhost:3000` y el frontend de Vite en `http://localhost:5173`.

## Base de datos y Prisma

El modelo vive en `Back/prisma/schema.prisma`.

Comandos utiles:

```bash
npm --prefix Back run db:bootstrap
npm --prefix Back run prisma:generate
npm --prefix Back run prisma:migrate
npm --prefix Back run prisma:migrate:deploy
npm --prefix Back run prisma:studio
npm --prefix Back run seed
```

`db:bootstrap` ejecuta el snapshot SQL de `Back/prisma/baseline/20260423_current_schema_snapshot.sql` contra una base nueva. En bases existentes revisa primero el estado de migraciones y no ejecutes el baseline sin validar el entorno.

## Pruebas y calidad

Frontend:

```bash
npm --prefix Front run lint
npm --prefix Front run test
npm --prefix Front run test:e2e
npm --prefix Front run build
```

Backend:

```bash
npm --prefix Back run build
```

No hay pruebas backend versionadas todavia; el directorio `Back/test` fue retirado porque solo contenia marcadores vacios.

## Archivos clave

- `Back/src/app.module.ts`: modulos activos del backend.
- `Back/src/main.ts`: bootstrap, CORS, body limit, filtros, pipes y health check.
- `Back/prisma/schema.prisma`: modelo relacional.
- `Back/prisma/seed.ts`: datos iniciales y administradores de plataforma.
- `Back/src/shared/mail/mail.service.ts`: correos transaccionales.
- `Back/src/shared/tasks/tasks.service.ts`: recordatorios horarios de citas.
- `Front/src/app/router/router.tsx`: rutas principales.
- `Front/src/constants/routes.ts`: constantes de navegacion.
- `Front/src/lib/apiClient.ts`: cliente HTTP, refresh de sesion y errores.
- `Front/src/app/providers/AuthProvider.tsx`: hidratacion y validacion de sesion.
- `Front/src/pages/university-admin/bulk-upload/UniversityBulkUploadPage.tsx`: carga masiva con Excel.
