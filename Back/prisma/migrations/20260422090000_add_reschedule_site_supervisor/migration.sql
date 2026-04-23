ALTER TABLE "reprogramacion_cita"
ADD COLUMN IF NOT EXISTS "nueva_id_sede" INTEGER,
ADD COLUMN IF NOT EXISTS "nuevo_id_docente_universidad" INTEGER;

DO $$
BEGIN
  ALTER TABLE "reprogramacion_cita"
  ADD CONSTRAINT "fk_reprogramacion_nueva_sede"
  FOREIGN KEY ("nueva_id_sede")
  REFERENCES "sede"("id_sede")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "reprogramacion_cita"
  ADD CONSTRAINT "fk_reprogramacion_nuevo_docente"
  FOREIGN KEY ("nuevo_id_docente_universidad")
  REFERENCES "docente_universidad"("id_docente_universidad")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_reprogramacion_nueva_sede"
ON "reprogramacion_cita" ("nueva_id_sede");

CREATE INDEX IF NOT EXISTS "idx_reprogramacion_nuevo_docente"
ON "reprogramacion_cita" ("nuevo_id_docente_universidad");
