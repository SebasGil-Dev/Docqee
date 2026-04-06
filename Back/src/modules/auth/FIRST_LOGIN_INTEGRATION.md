# First login password change

Archivos nuevos agregados para dejar preparado el flujo de primer ingreso sin tocar el backend actual.

## Objetivo
- Exponer en `POST /auth/login` la bandera `requiresPasswordChange`.
- Exponer en `GET /auth/me` la misma bandera.
- Crear el endpoint `POST /auth/first-login/change-password`.
- Aplicar el flujo solo a `UNIVERSITY_ADMIN` y `STUDENT`.

## Archivos agregados
- `dto/change-first-login-password.dto.ts`
- `application/dto/first-login-session.dto.ts`
- `application/use-cases/resolve-first-login-session.use-case.ts`
- `application/use-cases/change-first-login-password.use-case.ts`
- `domain/entities/first-login-account.entity.ts`
- `domain/repositories/first-login-account.repository.ts`
- `infrastructure/repositories/prisma-first-login-account.repository.ts`

## Regla de negocio
- `requiresPasswordChange = true` cuando `cuenta_acceso.primer_ingreso_pendiente = true`
- Solo debe forzar cambio para:
  - `ADMIN_UNIVERSIDAD`
  - `ESTUDIANTE`
- No debe forzar cambio para:
  - `PACIENTE`
  - `ADMIN_PLATAFORMA`

## Puntos de integracion sugeridos
Cuando decidas conectarlo, los unicos archivos existentes que tendrias que tocar son:

- `src/modules/auth/auth.module.ts`
  - registrar `ResolveFirstLoginSessionUseCase`
  - registrar `ChangeFirstLoginPasswordUseCase`
  - registrar `PrismaFirstLoginAccountRepository`
  - enlazar el repositorio abstracto con `useClass`

- `src/modules/auth/controller/auth.controller.ts`
  - agregar `POST auth/first-login/change-password`

- `src/modules/auth/auth.service.ts`
  - hacer que `login()` responda `{ accessToken, user, requiresPasswordChange }`
  - hacer que `getSession()` responda `{ user, requiresPasswordChange }`
  - o delegar esas respuestas al use case `ResolveFirstLoginSessionUseCase`

## Forma esperada de respuesta
### Login
```ts
{
  accessToken: string;
  user: RequestUser;
  requiresPasswordChange: boolean;
}
```

### Session
```ts
{
  user: RequestUser;
  requiresPasswordChange: boolean;
}
```

### Endpoint de primer ingreso
```ts
POST /auth/first-login/change-password
Authorization: Bearer <token>

{
  "password": "ClaveSegura1!"
}
```

Respuesta:
```ts
{ ok: true }
```

## Nota importante
Estos archivos no estan registrados todavia en el modulo para evitar afectar el backend actual.
