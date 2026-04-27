CREATE INDEX IF NOT EXISTS "idx_solicitud_patient_student_estado"
ON "solicitud" ("id_cuenta_paciente", "id_cuenta_estudiante", "estado");

CREATE INDEX IF NOT EXISTS "idx_solicitud_patient_student_fecha"
ON "solicitud" ("id_cuenta_paciente", "id_cuenta_estudiante", "fecha_envio" DESC);
