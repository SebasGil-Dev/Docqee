# Integracion de conversaciones del paciente

## Objetivo
Preparar el envio de mensajes del paciente sin acoplar todavia el modulo a infraestructura real.

## Tablas relacionadas
- `conversacion`
- `mensaje`
- `solicitud`

## Endpoint esperado
- `POST /patient-portal/conversations/:conversationId/messages`

## Validaciones sugeridas
- Verificar que la conversacion pertenece a una solicitud del paciente autenticado.
- Permitir envio solo cuando la conversacion este en estado `ACTIVA`.
- Persistir el remitente como la cuenta del paciente autenticado.
