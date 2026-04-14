CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "idx_persona_nombres_trgm"
ON "persona" USING gin ("nombres" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_persona_apellidos_trgm"
ON "persona" USING gin ("apellidos" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_cuenta_estudiante_fecha"
ON "cuenta_estudiante" ("fecha_creacion");

CREATE INDEX IF NOT EXISTS "idx_estudiante_tratamiento_estado_estudiante"
ON "estudiante_tratamiento" ("estado", "id_cuenta_estudiante");

CREATE INDEX IF NOT EXISTS "idx_estudiante_tratamiento_tipo_estado_estudiante"
ON "estudiante_tratamiento" ("id_tipo_tratamiento", "estado", "id_cuenta_estudiante");

CREATE INDEX IF NOT EXISTS "idx_estudiante_sede_estado_estudiante"
ON "estudiante_sede_practica" ("estado", "id_cuenta_estudiante");

CREATE INDEX IF NOT EXISTS "idx_estudiante_sede_sede_estado_estudiante"
ON "estudiante_sede_practica" ("id_sede", "estado", "id_cuenta_estudiante");

CREATE INDEX IF NOT EXISTS "idx_sede_localidad_estado"
ON "sede" ("id_localidad", "estado");
