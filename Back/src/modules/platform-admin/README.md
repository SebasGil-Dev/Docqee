# Platform admin module

Modulo del administrador de plataforma. Gestiona universidades, estado institucional y credenciales iniciales de administradores universitarios.

## Endpoints

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

## Flujo principal

Al registrar una universidad se crean la institucion, la persona administradora, la cuenta de acceso, el rol de admin universidad y una credencial inicial pendiente. El envio de credenciales usa correo transaccional y obliga cambio de contrasena en primer ingreso.

## Seguridad

No documentar contrasenas temporales ni correos reales de administracion en ejemplos publicos.
