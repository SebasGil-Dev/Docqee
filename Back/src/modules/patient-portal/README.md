# Patient portal module

Modulo operativo del paciente. Esta montado en `AppModule` y usa `PatientPortalService` con repositorio Prisma.

## Endpoints

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

## Capacidades

- Dashboard del paciente.
- Directorio de estudiantes con filtros.
- Perfil y avatar.
- Solicitudes de atencion.
- Conversaciones asociadas a solicitudes aceptadas.
- Agenda, citas y estados de cita.
- Valoraciones posteriores a citas finalizadas.

## Integraciones

- `StorageModule` para avatar.
- `MailModule` para correos de eventos de cita.
- Prisma para consultas de directorio, solicitudes, conversaciones, citas y valoraciones.
