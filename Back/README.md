# Docqee Backend

API NestJS de Docqee. Contiene autenticacion, reglas de negocio, persistencia con Prisma, correos transaccionales, carga de imagenes, tareas automaticas y endpoints por rol.

Este README no incluye valores reales de secretos. Usa `Back/.env.example` como guia y guarda credenciales reales solo en `Back/.env` o en el proveedor de despliegue.

## Stack

- NestJS 11.
- Prisma 6.
- PostgreSQL/Supabase.
- JWT, Passport y bcrypt.
- Brevo para correo.
- Cloudinary para imagenes.
- `@nestjs/schedule` para cron jobs.
- TypeScript.

## Estructura

```text
Back/
  prisma/
    baseline/
    migrations/
    schema.prisma
    seed.ts
  src/
    config/
    modules/
    shared/
    types/
    app.module.ts
    main.ts
```

## Modulos activos

`AppModule` monta:

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

## Comandos

```bash
npm install
npm run start:dev
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run seed
npm run db:bootstrap
```

`npm run build` ejecuta `prisma generate`, compila Nest y aplica `tsc-alias`.

## Variables de entorno

Usa placeholders en documentacion y ejemplos. No pegues valores reales en README, issues ni commits.

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
- `PLATFORM_ADMIN_1_EMAIL`
- `PLATFORM_ADMIN_1_PASSWORD`
- `PLATFORM_ADMIN_1_FIRST_NAME`
- `PLATFORM_ADMIN_1_LAST_NAME`
- `PLATFORM_ADMIN_2_EMAIL`
- `PLATFORM_ADMIN_2_PASSWORD`
- `PLATFORM_ADMIN_2_FIRST_NAME`
- `PLATFORM_ADMIN_2_LAST_NAME`

## Endpoints por dominio

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

Administracion:

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
- `GET /university-admin/overview`
- `GET /university-admin/profile`
- `PATCH /university-admin/profile`
- `POST /university-admin/profile/logo`
- `PATCH /university-admin/password`

Usuarios institucionales:

- `GET /students`
- `POST /students`
- `POST /students/bulk`
- `PATCH /students/:studentId/status`
- `GET /teachers`
- `POST /teachers`
- `POST /teachers/bulk`
- `PATCH /teachers/:teacherId/status`
- `GET /credentials/students`
- `PATCH /credentials/students/:credentialId/email`
- `POST /credentials/students/:credentialId/send`
- `POST /credentials/students/:credentialId/resend`
- `POST /credentials/students/send-all`
- `DELETE /credentials/students/:credentialId`

Portales:

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

Publico y salud:

- `POST /api/solicitudes-vinculacion`
- `GET /health`

## Seguridad operativa

- Las contrasenas, codigos de verificacion y codigos de recuperacion se guardan con hash.
- Los endpoints protegidos usan `JwtAuthGuard`.
- `ValidationPipe` se aplica globalmente.
- CORS depende de `FRONTEND_URL`.
- El body parser limita cargas a `6mb`; los avatares usan limite de `5mb`.
- Los tokens reales y URLs privadas nunca deben documentarse.

## Tareas automaticas

`TasksService` corre cada hora. Busca citas aceptadas dentro de las siguientes 24 horas, envia recordatorios por correo a estudiante, paciente y tutor cuando aplica, y marca la cita como recordada.

## Base de datos

`prisma/schema.prisma` es la fuente del modelo. El baseline en `prisma/baseline` reconstruye una base nueva desde un snapshot SQL. En bases existentes valida primero migraciones y entorno antes de ejecutar `db:bootstrap`.
