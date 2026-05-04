# Docqee Frontend

Aplicacion web de Docqee construida con React, Vite, TypeScript y Tailwind CSS. Consume la API del backend desde `VITE_API_URL` y organiza la experiencia por rol.

No pongas tokens, credenciales ni URLs privadas en este README. Las variables reales deben vivir en archivos locales ignorados por Git o en el proveedor de despliegue.

## Stack

- React 18.
- Vite.
- TypeScript.
- Tailwind CSS.
- React Router.
- Lucide React.
- `xlsx` para carga masiva.
- Vitest para pruebas unitarias/de componentes.
- Playwright para pruebas E2E.

## Estructura

```text
Front/
  e2e/
  public/
  src/
    app/
    assets/
    components/
    constants/
    content/
    hooks/
    lib/
    pages/
    styles/
    test/
    types/
```

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:e2e
```

## Variable de entorno

- `VITE_API_URL`: URL base del backend. En local normalmente apunta a `http://localhost:3000`.

Ejemplo local:

```bash
VITE_API_URL=http://localhost:3000
```

## Rutas

Publicas:

- `/`
- `/login`
- `/registro`
- `/verificar-correo`
- `/recuperar-contrasena`
- `/primer-ingreso/cambiar-contrasena`
- `/politica-de-privacidad`
- `/terminos-y-condiciones`

Admin plataforma:

- `/admin/universidades`
- `/admin/universidades/registrar`
- `/admin/credenciales`

Admin universidad:

- `/universidad/inicio`
- `/universidad/informacion-institucional`
- `/universidad/estudiantes`
- `/universidad/estudiantes/registrar`
- `/universidad/docentes`
- `/universidad/docentes/registrar`
- `/universidad/carga-masiva`
- `/universidad/credenciales`

Paciente:

- `/paciente/inicio`
- `/paciente/buscar-estudiantes`
- `/paciente/solicitudes`
- `/paciente/agenda`
- `/paciente/conversaciones`
- `/paciente/citas`
- `/paciente/mi-perfil`

Estudiante:

- `/estudiante/inicio`
- `/estudiante/mi-perfil`
- `/estudiante/agenda`
- `/estudiante/citas`
- `/estudiante/solicitudes`
- `/estudiante/conversaciones`

## Estado y sesiones

- `AuthProvider` valida sesion con `/auth/me`, sincroniza cambios entre pestanas y limpia stores cuando cambia el usuario.
- `apiClient` agrega `Authorization`, intenta refresh con `/auth/refresh` y normaliza errores.
- Los stores de modulo usan `useSyncExternalStore` para evitar recargas completas y mantener consistencia entre paginas.

## Pruebas

- Pruebas de componentes: `src/test`.
- Pruebas E2E: `e2e`.
- Estados generados por Playwright: `e2e/generados`; estan ignorados por Git.
- Reportes y resultados Playwright: `playwright-report` y `test-results`; estan ignorados por Git.

## Mantenimiento observado

El componente `src/components/notifications/PortalNotificationsPageContent.tsx` permanece porque contiene codigo real pero se pauso, no esta conectado a nada porque se opto por usar notificaciones solo por la campana 
