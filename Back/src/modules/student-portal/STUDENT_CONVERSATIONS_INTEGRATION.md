# Student conversations integration

Archivos de referencia para conectar mas adelante la mensajeria entre paciente y estudiante.

## Objetivo
- Exponer las conversaciones asociadas a solicitudes aceptadas.
- Permitir enviar mensajes del estudiante al paciente.
- Bloquear nuevos mensajes cuando la conversacion quede en `SOLO_LECTURA` o `CERRADA`.

## Endpoints sugeridos
- `GET /student-portal/conversations`
- `POST /student-portal/conversations/:conversationId/messages`

## Ajustes esperados cuando se conecte
- El dashboard del estudiante deberia incluir `conversations`.
- La respuesta de `PATCH /student-portal/requests/:requestId/status` deberia devolver `conversationId` cuando la solicitud pase a `ACEPTADA`.
- El envio de mensajes deberia crear registros sobre `mensaje` y usar `conversacion`.
