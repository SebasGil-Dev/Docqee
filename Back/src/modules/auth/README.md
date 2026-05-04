# Auth module

Responsable de autenticacion, sesion, registro de pacientes, verificacion de correo, recuperacion de cuenta y cambio obligatorio de contrasena en primer ingreso.

## Endpoints

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

## Notas

- Usa `bcrypt` para validar contrasenas y codigos.
- Emite access token y refresh token con secretos configurados por entorno.
- El registro de pacientes se guarda primero en `registro_paciente_pendiente` y crea la cuenta real solo despues de validar el codigo.
- Estudiantes y administradores de universidad pueden quedar con `primer_ingreso_pendiente` y deben cambiar la contrasena antes de navegar normalmente.
- No documentar tokens, codigos reales ni contrasenas temporales en archivos del repositorio.
