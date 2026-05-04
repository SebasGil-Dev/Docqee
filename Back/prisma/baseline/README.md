# Prisma baseline

Esta carpeta contiene una copia SQL del esquema base del proyecto.

## Por que existe

El historial activo de `prisma/migrations` puede comenzar despues de que una base ya existia. Agregar una migracion inicial tardia dentro de `migrations` puede ser riesgoso para entornos existentes, porque Prisma podria intentar reproducir cambios ya aplicados.

El baseline permite crear una base nueva desde un snapshot conocido sin alterar el historial de migraciones incremental.

## Archivo

- `20260423_current_schema_snapshot.sql`: snapshot del esquema para una base nueva.

## Uso

Base de datos nueva:

```bash
npm run db:bootstrap
```

Base existente:

- No ejecutes el baseline sin validar el estado del entorno.
- Usa las migraciones incrementales versionadas con Prisma cuando correspondan.
- Si hay cambios manuales en Supabase, deben documentarse y sincronizarse con el modelo o con SQL operativo versionado.

## Nota de seguridad

El baseline no debe contener credenciales, tokens ni valores secretos de entorno.
