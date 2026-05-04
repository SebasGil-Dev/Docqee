# Credentials module

Gestiona credenciales iniciales de estudiantes para administradores de universidad.

## Endpoints

- `GET /credentials/students`
- `PATCH /credentials/students/:credentialId/email`
- `POST /credentials/students/:credentialId/send`
- `POST /credentials/students/:credentialId/resend`
- `POST /credentials/students/send-all`
- `DELETE /credentials/students/:credentialId`

## Flujo

1. La creacion de estudiantes genera credenciales pendientes.
2. El admin universidad puede editar correo antes del envio.
3. Al enviar se genera contrasena temporal, se guarda hash y se envia correo.
4. El estudiante debe cambiar contrasena en primer ingreso.

## Seguridad

No registrar contrasenas temporales en logs ni documentacion. Solo se muestran al destinatario por el correo transaccional correspondiente.
