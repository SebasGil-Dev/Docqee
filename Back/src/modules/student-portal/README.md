# Student portal module

Modulo operativo del estudiante. Esta montado en `AppModule` y usa `StudentPortalService` con repositorio Prisma.

## Endpoints

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

## Capacidades

- Dashboard del estudiante.
- Perfil profesional y avatar.
- Tratamientos y sedes de practica.
- Solicitudes de pacientes.
- Conversaciones.
- Bloques de agenda.
- Propuestas, edicion, reprogramacion, cancelacion, finalizacion y valoracion de citas.

## Integraciones

- `StorageModule` para avatar.
- `MailModule` para notificaciones de cita.
- Prisma para disponibilidad, solicitudes, conversaciones, agenda, citas y valoraciones.
