Esta carpeta contiene una copia completa del esquema que coincide con el estado actual del proyecto.

¿Por qué existe esto?
El historial activo de prisma/migrations en este repositorio comienza después de que el esquema original ya existía.
Agregar una línea base tardía en prisma/migrations sería riesgoso para las bases de datos existentes, ya que Prisma podría intentar reproducirla nuevamente.
Esta copia permite reconstruir una base de datos nueva de forma segura sin modificar el historial de migraciones que ya utilizan los entornos existentes.
Archivos
20260423_current_schema_snapshot.sql: copia actual del esquema para una base de datos completamente nueva.
¿Cómo usarlo?
Base de datos nueva: ejecutar npm run db:bootstrap
Base de datos existente: no ejecutar la copia base. Aplicar únicamente las migraciones incrementales ya presentes en prisma/migrations, o ejecutar npm run db:apply:triggers cuando solo necesites los triggers operativos.
Notas
El flujo de inicialización utiliza primero la copia del esquema y luego aplica las migraciones incrementales. Estos archivos SQL incrementales son idempotentes, por lo que alinean de forma segura índices, extensiones y las últimas modificaciones del esquema.
Los triggers operativos están versionados como una migración incremental normal, lo que permite aplicarlos también en bases de datos existentes sin necesidad de reconstruir todo el esquema.