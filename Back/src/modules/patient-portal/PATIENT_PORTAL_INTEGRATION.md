# Integracion del portal del paciente

## Fuente de datos esperada
- `cuenta_paciente` para los datos base del paciente autenticado.
- `persona` para nombres, apellidos y documento del paciente.
- `tutor_responsable` para el bloque opcional de tutor.
- `cuenta_estudiante`, `perfil_estudiante`, `estudiante_tratamiento` y `estudiante_sede_practica` para el directorio visible de estudiantes.
- `solicitud` para el historial del flujo paciente-estudiante.
- `conversacion` y `mensaje` para los hilos asociados a solicitudes aceptadas.
- `cita`, `tipo_cita`, `sede`, `docente_universidad`, `docente` y `universidad` para el modulo de citas.

## Contratos frontend ya preparados
- `GET /patient-portal/dashboard`
- `PATCH /patient-portal/profile`
- `POST /patient-portal/requests`
- `PATCH /patient-portal/requests/:requestId/status`
- `POST /patient-portal/conversations/:conversationId/messages`
- `PATCH /patient-portal/appointments/:appointmentId/status`

## Respuesta sugerida del dashboard
- `profile`
- `students`
- `requests`
- `conversations`
- `appointments`

## Regla de negocio importante
- El paciente solo crea solicitudes.
- El estado de la solicitud cambia por accion del estudiante o por cierre del flujo.
- La conversacion se habilita cuando la solicitud pasa a `ACEPTADA`.
- Las citas del paciente pueden pasar por `PROPUESTA`, `ACEPTADA`, `RECHAZADA`, `CANCELADA` y `FINALIZADA`.
