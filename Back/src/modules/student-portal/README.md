# Student portal module

Cascaron inicial para el portal operativo del estudiante.

## Objetivo
- Exponer el dashboard del estudiante autenticado.
- Permitir actualizar perfil publico.
- Gestionar tratamientos y sedes activas.
- Gestionar bloqueos de agenda.
- Responder solicitudes recibidas.

## Nota
Este modulo se deja solo como estructura de integracion. No esta conectado al `AppModule` ni implementa logica real todavia.

## Endpoints esperados
- `GET /student-portal/dashboard`
- `PATCH /student-portal/profile`
- `PATCH /student-portal/treatments/:treatmentId/status`
- `PATCH /student-portal/practice-sites/:practiceSiteId/status`
- `POST /student-portal/schedule-blocks`
- `PATCH /student-portal/schedule-blocks/:blockId`
- `PATCH /student-portal/schedule-blocks/:blockId/status`
- `PATCH /student-portal/requests/:requestId/status`
