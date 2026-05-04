# University admin module

Modulo del administrador de universidad. Gestiona tablero institucional, informacion de la universidad, perfil del administrador, sedes, logo y cambio de contrasena.

## Endpoints

- `GET /university-admin/overview`
- `GET /university-admin/profile`
- `PATCH /university-admin/profile`
- `POST /university-admin/profile/logo`
- `PATCH /university-admin/password`

## Capacidades

- Resumen institucional.
- Datos del administrador.
- Datos de universidad.
- Sedes de atencion.
- Logo institucional por storage.
- Cambio de contrasena.

## Seguridad

Los datos de la universidad se resuelven desde la cuenta autenticada. No se deben aceptar identificadores de universidad del cliente para saltar el alcance del admin.
