CREATE INDEX IF NOT EXISTS "idx_credencial_inicial_pendientes_fecha"
ON "credencial_inicial" ("anulada_at", "fecha_creacion");

CREATE INDEX IF NOT EXISTS "idx_universidad_fecha"
ON "universidad" ("fecha_creacion");
