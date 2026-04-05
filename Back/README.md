# Docqee Backend

Backend modular separado de Front, pensado para que el equipo pueda trabajar la API sin mezclar logica de interfaz con logica de negocio.

## Stack propuesto
- NestJS
- Prisma
- PostgreSQL
- TypeScript

## Objetivo de esta base
- Dejar una arquitectura inicial lista para desarrollo por modulos.
- Mantener separados controller, application, domain e infrastructure.
- Facilitar la futura conexion con el frontend ya existente.

## Modulos iniciales
- auth
- users
- catalogs
- universities
- platform-admin
- university-admin
- students
- teachers
- credentials
- bulk-upload
- notifications
- files

## Primeros pasos sugeridos para el compañero de backend
1. Ejecutar 
pm install.
2. Configurar .env segun el entorno local.
3. Crear la base de datos PostgreSQL.
4. Ejecutar 
px prisma generate.
5. Revisar y ajustar prisma/schema.prisma.
6. Crear migraciones iniciales.
7. Empezar por uth, catalogs, universities y university-admin.

## Regla de separacion
- Front: UI, formularios, tablas, estados visuales y llamadas HTTP.
- Back: autenticacion, reglas de negocio, base de datos, credenciales, correos, carga masiva y permisos.

## Notas
- Este scaffold no instala dependencias por si mismo.
- Esta base no mezcla ningun archivo del frontend.
- La estructura esta pensada para que el backend pueda crecer por dominios sin romperse.
