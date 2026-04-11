CREATE INDEX IF NOT EXISTS "idx_cita_solicitud_inicio" ON "cita" ("id_solicitud", "fecha_hora_inicio");
CREATE INDEX IF NOT EXISTS "idx_cita_docente_inicio" ON "cita" ("id_docente_universidad", "fecha_hora_inicio");
CREATE INDEX IF NOT EXISTS "idx_cita_sede" ON "cita" ("id_sede");

CREATE INDEX IF NOT EXISTS "idx_credencial_inicial_fecha" ON "credencial_inicial" ("fecha_creacion");

CREATE INDEX IF NOT EXISTS "idx_cuenta_acceso_credenciales_pendientes" ON "cuenta_acceso" ("tipo_cuenta", "primer_ingreso_pendiente", "ultimo_login_at");

CREATE INDEX IF NOT EXISTS "idx_cuenta_estudiante_universidad_fecha" ON "cuenta_estudiante" ("id_universidad", "fecha_creacion");
CREATE INDEX IF NOT EXISTS "idx_cuenta_paciente_localidad" ON "cuenta_paciente" ("id_localidad");

CREATE INDEX IF NOT EXISTS "idx_docente_universidad_universidad_fecha" ON "docente_universidad" ("id_universidad", "fecha_creacion");
CREATE INDEX IF NOT EXISTS "idx_enlace_profesional_estudiante" ON "enlace_profesional" ("id_cuenta_estudiante");
CREATE INDEX IF NOT EXISTS "idx_envio_credencial_credencial_fecha" ON "envio_credencial" ("id_credencial_inicial", "enviado_at");
CREATE INDEX IF NOT EXISTS "idx_horario_bloqueado_estudiante_inicio" ON "horario_bloqueado" ("id_cuenta_estudiante", "hora_inicio");

CREATE INDEX IF NOT EXISTS "idx_mensaje_conversacion_fecha" ON "mensaje" ("id_conversacion", "enviado_at");
CREATE INDEX IF NOT EXISTS "idx_mensaje_remitente" ON "mensaje" ("id_cuenta_remitente");
CREATE INDEX IF NOT EXISTS "idx_notificacion_destino_fecha" ON "notificacion" ("id_cuenta_destino", "fecha_creacion");

CREATE INDEX IF NOT EXISTS "idx_recuperacion_cuenta_activa_fecha" ON "recuperacion_cuenta" ("id_cuenta_acceso", "usado_at", "fecha_creacion");
CREATE INDEX IF NOT EXISTS "idx_reprogramacion_cita" ON "reprogramacion_cita" ("id_cita");
CREATE INDEX IF NOT EXISTS "idx_reprogramacion_propuesta" ON "reprogramacion_cita" ("propuesta_por_cuenta");
CREATE INDEX IF NOT EXISTS "idx_reprogramacion_respuesta" ON "reprogramacion_cita" ("respuesta_por_cuenta");

CREATE INDEX IF NOT EXISTS "idx_sede_localidad" ON "sede" ("id_localidad");
CREATE INDEX IF NOT EXISTS "idx_solicitud_paciente_fecha" ON "solicitud" ("id_cuenta_paciente", "fecha_envio");
CREATE INDEX IF NOT EXISTS "idx_solicitud_estudiante_fecha" ON "solicitud" ("id_cuenta_estudiante", "fecha_envio");
CREATE INDEX IF NOT EXISTS "idx_solicitud_cerrada_por" ON "solicitud" ("cerrada_por_cuenta");
CREATE INDEX IF NOT EXISTS "idx_solicitud_estado_fecha" ON "solicitud" ("estado", "fecha_envio");

CREATE INDEX IF NOT EXISTS "idx_universidad_localidad" ON "universidad" ("id_localidad_principal");
CREATE INDEX IF NOT EXISTS "idx_valoracion_receptor_fecha" ON "valoracion" ("id_cuenta_receptor", "fecha_creacion");
CREATE INDEX IF NOT EXISTS "idx_valoracion_emisor_fecha" ON "valoracion" ("id_cuenta_emisor", "fecha_creacion");
CREATE INDEX IF NOT EXISTS "idx_verificacion_correo_activa_fecha" ON "verificacion_correo" ("id_cuenta_acceso", "usado_at", "fecha_creacion");
