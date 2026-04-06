# Patient portal module

Cascaron inicial para el portal operativo del paciente.

## Objetivo
- Exponer el dashboard del paciente autenticado.
- Permitir actualizar datos basicos del perfil.
- Buscar estudiantes disponibles y crear solicitudes.
- Consultar solicitudes, conversaciones y citas asociadas.

## Nota
Este modulo se deja solo como estructura de integracion. No esta conectado al `AppModule` ni implementa logica real todavia.

## Endpoints esperados
- `GET /patient-portal/dashboard`
- `PATCH /patient-portal/profile`
- `POST /patient-portal/requests`
- `PATCH /patient-portal/requests/:requestId/status`
- `POST /patient-portal/conversations/:conversationId/messages`
- `PATCH /patient-portal/appointments/:appointmentId/status`
