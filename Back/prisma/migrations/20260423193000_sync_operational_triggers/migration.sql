-- Operational triggers and database validations
-- Generated from the verified SQL scripts shared for this project.

-- =====================================================================
-- Source: fecha_actualizacion.txt
-- =====================================================================

-- =========================================================
-- 1) FUNCION GENERICA DE AUDITORIA
-- =========================================================

CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Aplica el trigger a TODAS las tablas del esquema public
-- que tengan la columna fecha_actualizacion.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'fecha_actualizacion'
        ORDER BY table_name
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%I_fecha_actualizacion ON %I.%I;',
            r.table_name,
            r.table_schema,
            r.table_name
        );

        EXECUTE format(
            'CREATE TRIGGER trg_%I_fecha_actualizacion
             BEFORE UPDATE ON %I.%I
             FOR EACH ROW
             EXECUTE FUNCTION actualizar_fecha_actualizacion();',
            r.table_name,
            r.table_schema,
            r.table_name
        );
    END LOOP;
END;
$$;


-- =========================================================
-- 2) CONVERSACION:
--    solo_lectura_at cuando pasa a SOLO_LECTURA
-- =========================================================

CREATE OR REPLACE FUNCTION trg_conversacion_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado = 'SOLO_LECTURA' AND NEW.solo_lectura_at IS NULL THEN
            NEW.solo_lectura_at := NOW();
        ELSIF NEW.estado = 'ACTIVA' THEN
            NEW.solo_lectura_at := NULL;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.estado = 'SOLO_LECTURA' THEN
        IF OLD.estado IS DISTINCT FROM 'SOLO_LECTURA'
           AND NEW.solo_lectura_at IS NULL THEN
            NEW.solo_lectura_at := NOW();
        END IF;

    ELSIF NEW.estado = 'ACTIVA' THEN
        NEW.solo_lectura_at := NULL;

    ELSIF NEW.estado = 'CERRADA' THEN
        -- Si ya habia pasado por SOLO_LECTURA, conserva la marca.
        IF NEW.solo_lectura_at IS NULL THEN
            NEW.solo_lectura_at := OLD.solo_lectura_at;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversacion_timestamps ON conversacion;

CREATE TRIGGER trg_conversacion_timestamps
BEFORE INSERT OR UPDATE OF estado, solo_lectura_at
ON conversacion
FOR EACH ROW
EXECUTE FUNCTION trg_conversacion_timestamps();


-- =========================================================
-- 3) SOLICITUD:
--    fecha_respuesta y fecha_cierre segun estado
-- =========================================================

CREATE OR REPLACE FUNCTION trg_solicitud_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado IN ('ACEPTADA', 'RECHAZADA')
           AND NEW.fecha_respuesta IS NULL THEN
            NEW.fecha_respuesta := NOW();
        END IF;

        IF NEW.estado IN ('CERRADA', 'CANCELADA')
           AND NEW.fecha_cierre IS NULL THEN
            NEW.fecha_cierre := NOW();
        END IF;

        RETURN NEW;
    END IF;

    -- fecha_respuesta
    IF NEW.estado IN ('ACEPTADA', 'RECHAZADA') THEN
        IF OLD.estado IS DISTINCT FROM NEW.estado
           AND NEW.fecha_respuesta IS NULL THEN
            NEW.fecha_respuesta := NOW();
        END IF;

    ELSIF NEW.estado = 'PENDIENTE' THEN
        NEW.fecha_respuesta := NULL;
    END IF;

    -- fecha_cierre
    IF NEW.estado IN ('CERRADA', 'CANCELADA') THEN
        IF OLD.estado IS DISTINCT FROM NEW.estado
           AND NEW.fecha_cierre IS NULL THEN
            NEW.fecha_cierre := NOW();
        END IF;
    ELSE
        NEW.fecha_cierre := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitud_timestamps ON solicitud;

CREATE TRIGGER trg_solicitud_timestamps
BEFORE INSERT OR UPDATE OF estado, fecha_respuesta, fecha_cierre
ON solicitud
FOR EACH ROW
EXECUTE FUNCTION trg_solicitud_timestamps();


-- =========================================================
-- 4) CUENTA_ACCESO:
--    correo_verificado_at cuando correo_verificado = TRUE
-- =========================================================

CREATE OR REPLACE FUNCTION trg_cuenta_acceso_correo_verificado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.correo_verificado = TRUE THEN
        IF TG_OP = 'INSERT' THEN
            IF NEW.correo_verificado_at IS NULL THEN
                NEW.correo_verificado_at := NOW();
            END IF;
        ELSE
            IF OLD.correo_verificado IS DISTINCT FROM TRUE
               AND NEW.correo_verificado_at IS NULL THEN
                NEW.correo_verificado_at := NOW();
            END IF;
        END IF;
    ELSE
        NEW.correo_verificado_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cuenta_acceso_correo_verificado ON cuenta_acceso;

CREATE TRIGGER trg_cuenta_acceso_correo_verificado
BEFORE INSERT OR UPDATE OF correo_verificado, correo_verificado_at
ON cuenta_acceso
FOR EACH ROW
EXECUTE FUNCTION trg_cuenta_acceso_correo_verificado();


-- =========================================================
-- 5) CITA:
--    respondida_at cuando se acepta/rechaza
--    finalizada_at cuando pasa a FINALIZADA
--    motivo obligatorio si se cancela
-- =========================================================

CREATE OR REPLACE FUNCTION trg_cita_timestamps_y_validaciones()
RETURNS TRIGGER AS $$
BEGIN
    -- Motivo obligatorio al cancelar
    IF NEW.estado = 'CANCELADA'
       AND COALESCE(BTRIM(NEW.motivo_cancelacion), '') = '' THEN
        RAISE EXCEPTION 'Una cita cancelada debe registrar motivo_cancelacion.';
    END IF;

    -- respondida_at
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado IN ('ACEPTADA', 'RECHAZADA')
           AND NEW.respondida_at IS NULL THEN
            NEW.respondida_at := NOW();
        END IF;
    ELSE
        IF NEW.estado IN ('ACEPTADA', 'RECHAZADA') THEN
            IF OLD.estado IS DISTINCT FROM NEW.estado
               AND NEW.respondida_at IS NULL THEN
                NEW.respondida_at := NOW();
            END IF;
        ELSIF NEW.estado = 'PROPUESTA' THEN
            NEW.respondida_at := NULL;
        END IF;
    END IF;

    -- finalizada_at
    IF NEW.estado = 'FINALIZADA' THEN
        IF NEW.fecha_hora_fin > NOW() THEN
            RAISE EXCEPTION
                'No se puede marcar la cita como FINALIZADA antes de fecha_hora_fin.';
        END IF;

        IF TG_OP = 'INSERT' THEN
            IF NEW.finalizada_at IS NULL THEN
                NEW.finalizada_at := NOW();
            END IF;
        ELSE
            IF OLD.estado IS DISTINCT FROM 'FINALIZADA'
               AND NEW.finalizada_at IS NULL THEN
                NEW.finalizada_at := NOW();
            END IF;
        END IF;
    ELSE
        NEW.finalizada_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cita_timestamps_y_validaciones ON cita;

CREATE TRIGGER trg_cita_timestamps_y_validaciones
BEFORE INSERT OR UPDATE OF estado, respondida_at, finalizada_at, motivo_cancelacion
ON cita
FOR EACH ROW
EXECUTE FUNCTION trg_cita_timestamps_y_validaciones();


-- =========================================================
-- 6) REPROGRAMACION_CITA:
--    fecha_respuesta cuando se acepta/rechaza
-- =========================================================

CREATE OR REPLACE FUNCTION trg_reprogramacion_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.estado IN ('ACEPTADA', 'RECHAZADA')
           AND NEW.fecha_respuesta IS NULL THEN
            NEW.fecha_respuesta := NOW();
        END IF;

        IF NEW.estado = 'PENDIENTE' THEN
            NEW.respuesta_por_cuenta := NULL;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.estado IN ('ACEPTADA', 'RECHAZADA') THEN
        IF OLD.estado IS DISTINCT FROM NEW.estado
           AND NEW.fecha_respuesta IS NULL THEN
            NEW.fecha_respuesta := NOW();
        END IF;

    ELSIF NEW.estado = 'PENDIENTE' THEN
        NEW.fecha_respuesta := NULL;
        NEW.respuesta_por_cuenta := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reprogramacion_timestamps ON reprogramacion_cita;

CREATE TRIGGER trg_reprogramacion_timestamps
BEFORE INSERT OR UPDATE OF estado, fecha_respuesta, respuesta_por_cuenta
ON reprogramacion_cita
FOR EACH ROW
EXECUTE FUNCTION trg_reprogramacion_timestamps();

-- =====================================================================
-- Source: Menor de edad + inactivar.txt
-- =====================================================================

-- =========================================================
-- 1) COHERENCIA ENTRE cuenta_acceso.tipo_cuenta
--    Y SU TABLA HIJA CORRESPONDIENTE
--
--    Se hace con CONSTRAINT TRIGGERS DEFERRABLE
--    para permitir el flujo normal:
--    INSERT cuenta_acceso -> INSERT tabla_hija
--    dentro de la misma transaccion.
-- =========================================================

CREATE OR REPLACE FUNCTION validar_especializacion_cuenta(p_id_cuenta INT)
RETURNS VOID AS $$
DECLARE
    v_tipo tipo_cuenta_enum;
    v_tiene_paciente BOOLEAN;
    v_tiene_estudiante BOOLEAN;
    v_tiene_admin_universidad BOOLEAN;
    v_tiene_admin_plataforma BOOLEAN;
    v_total INT;
BEGIN
    IF p_id_cuenta IS NULL THEN
        RETURN;
    END IF;

    SELECT ca.tipo_cuenta
      INTO v_tipo
    FROM cuenta_acceso ca
    WHERE ca.id_cuenta = p_id_cuenta;

    -- Si la cuenta ya no existe al cierre de la transaccion, no valida.
    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM cuenta_paciente cp WHERE cp.id_cuenta = p_id_cuenta
    ) INTO v_tiene_paciente;

    SELECT EXISTS (
        SELECT 1 FROM cuenta_estudiante ce WHERE ce.id_cuenta = p_id_cuenta
    ) INTO v_tiene_estudiante;

    SELECT EXISTS (
        SELECT 1 FROM cuenta_admin_universidad cau WHERE cau.id_cuenta = p_id_cuenta
    ) INTO v_tiene_admin_universidad;

    SELECT EXISTS (
        SELECT 1 FROM cuenta_admin_plataforma cap WHERE cap.id_cuenta = p_id_cuenta
    ) INTO v_tiene_admin_plataforma;

    v_total :=
          CASE WHEN v_tiene_paciente THEN 1 ELSE 0 END
        + CASE WHEN v_tiene_estudiante THEN 1 ELSE 0 END
        + CASE WHEN v_tiene_admin_universidad THEN 1 ELSE 0 END
        + CASE WHEN v_tiene_admin_plataforma THEN 1 ELSE 0 END;

    IF v_total = 0 THEN
        RAISE EXCEPTION
            'La cuenta_acceso % debe tener exactamente una tabla hija compatible con tipo_cuenta.',
            p_id_cuenta;
    END IF;

    IF v_total > 1 THEN
        RAISE EXCEPTION
            'La cuenta_acceso % tiene mas de una tabla hija asociada; eso no es valido con el esquema actual.',
            p_id_cuenta;
    END IF;

    CASE v_tipo
        WHEN 'PACIENTE' THEN
            IF NOT v_tiene_paciente THEN
                RAISE EXCEPTION
                    'La cuenta_acceso % es PACIENTE pero no tiene registro en cuenta_paciente.',
                    p_id_cuenta;
            END IF;

        WHEN 'ESTUDIANTE' THEN
            IF NOT v_tiene_estudiante THEN
                RAISE EXCEPTION
                    'La cuenta_acceso % es ESTUDIANTE pero no tiene registro en cuenta_estudiante.',
                    p_id_cuenta;
            END IF;

        WHEN 'ADMIN_UNIVERSIDAD' THEN
            IF NOT v_tiene_admin_universidad THEN
                RAISE EXCEPTION
                    'La cuenta_acceso % es ADMIN_UNIVERSIDAD pero no tiene registro en cuenta_admin_universidad.',
                    p_id_cuenta;
            END IF;

        WHEN 'ADMIN_PLATAFORMA' THEN
            IF NOT v_tiene_admin_plataforma THEN
                RAISE EXCEPTION
                    'La cuenta_acceso % es ADMIN_PLATAFORMA pero no tiene registro en cuenta_admin_plataforma.',
                    p_id_cuenta;
            END IF;
    END CASE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION trg_validar_especializacion_cuenta()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cuenta INT;
BEGIN
    v_id_cuenta := COALESCE(NEW.id_cuenta, OLD.id_cuenta);
    PERFORM validar_especializacion_cuenta(v_id_cuenta);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS ctrg_cuenta_acceso_especializacion ON cuenta_acceso;
CREATE CONSTRAINT TRIGGER ctrg_cuenta_acceso_especializacion
AFTER INSERT OR UPDATE OF tipo_cuenta OR DELETE
ON cuenta_acceso
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_especializacion_cuenta();

DROP TRIGGER IF EXISTS ctrg_cuenta_paciente_especializacion ON cuenta_paciente;
CREATE CONSTRAINT TRIGGER ctrg_cuenta_paciente_especializacion
AFTER INSERT OR UPDATE OR DELETE
ON cuenta_paciente
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_especializacion_cuenta();

DROP TRIGGER IF EXISTS ctrg_cuenta_estudiante_especializacion ON cuenta_estudiante;
CREATE CONSTRAINT TRIGGER ctrg_cuenta_estudiante_especializacion
AFTER INSERT OR UPDATE OR DELETE
ON cuenta_estudiante
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_especializacion_cuenta();

DROP TRIGGER IF EXISTS ctrg_cuenta_admin_universidad_especializacion ON cuenta_admin_universidad;
CREATE CONSTRAINT TRIGGER ctrg_cuenta_admin_universidad_especializacion
AFTER INSERT OR UPDATE OR DELETE
ON cuenta_admin_universidad
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_especializacion_cuenta();

DROP TRIGGER IF EXISTS ctrg_cuenta_admin_plataforma_especializacion ON cuenta_admin_plataforma;
CREATE CONSTRAINT TRIGGER ctrg_cuenta_admin_plataforma_especializacion
AFTER INSERT OR UPDATE OR DELETE
ON cuenta_admin_plataforma
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_especializacion_cuenta();


-- =========================================================
-- 2) VALIDACION DE MENOR DE EDAD Y TUTOR RESPONSABLE
-- =========================================================

CREATE OR REPLACE FUNCTION trg_cuenta_paciente_validar_tutor()
RETURNS TRIGGER AS $$
DECLARE
    v_es_menor BOOLEAN;
BEGIN
    IF NEW.fecha_nacimiento > CURRENT_DATE THEN
        RAISE EXCEPTION
            'fecha_nacimiento no puede estar en el futuro.';
    END IF;

    v_es_menor := NEW.fecha_nacimiento > (CURRENT_DATE - INTERVAL '18 years')::date;

    IF v_es_menor AND NEW.id_tutor_responsable IS NULL THEN
        RAISE EXCEPTION
            'Un paciente menor de edad debe tener id_tutor_responsable.';
    END IF;

    IF NOT v_es_menor AND NEW.id_tutor_responsable IS NOT NULL THEN
        RAISE EXCEPTION
            'Un paciente mayor de edad no debe tener id_tutor_responsable asociado operativamente.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cuenta_paciente_validar_tutor ON cuenta_paciente;
CREATE TRIGGER trg_cuenta_paciente_validar_tutor
BEFORE INSERT OR UPDATE OF fecha_nacimiento, id_tutor_responsable
ON cuenta_paciente
FOR EACH ROW
EXECUTE FUNCTION trg_cuenta_paciente_validar_tutor();


-- =========================================================
-- 3) FUNCION AUXILIAR:
--    cierre operativo al inactivar PACIENTE o ESTUDIANTE
-- =========================================================

CREATE OR REPLACE FUNCTION aplicar_cierre_operativo_por_cuenta(
    p_id_cuenta INT,
    p_tipo_cuenta tipo_cuenta_enum
)
RETURNS VOID AS $$
BEGIN
    IF p_tipo_cuenta = 'ESTUDIANTE' THEN

        -- Solicitudes pendientes -> CANCELADA
        UPDATE solicitud
           SET estado = 'CANCELADA',
               cerrada_por_cuenta = p_id_cuenta
         WHERE id_cuenta_estudiante = p_id_cuenta
           AND estado = 'PENDIENTE';

        -- Solicitudes aceptadas -> CERRADA
        UPDATE solicitud
           SET estado = 'CERRADA',
               cerrada_por_cuenta = p_id_cuenta
         WHERE id_cuenta_estudiante = p_id_cuenta
           AND estado = 'ACEPTADA';

        -- Conversaciones -> SOLO_LECTURA
        UPDATE conversacion c
           SET estado = 'SOLO_LECTURA'
          FROM solicitud s
         WHERE c.id_solicitud = s.id_solicitud
           AND s.id_cuenta_estudiante = p_id_cuenta
           AND c.estado <> 'SOLO_LECTURA';

        -- Citas futuras activas -> CANCELADA
        UPDATE cita c
           SET estado = 'CANCELADA',
               cancelada_por_cuenta = p_id_cuenta,
               motivo_cancelacion = COALESCE(
                   c.motivo_cancelacion,
                   'Cancelada automaticamente por inactivacion del estudiante'
               )
          FROM solicitud s
         WHERE c.id_solicitud = s.id_solicitud
           AND s.id_cuenta_estudiante = p_id_cuenta
           AND c.estado IN ('PROPUESTA', 'ACEPTADA')
           AND c.fecha_hora_inicio > NOW();

    ELSIF p_tipo_cuenta = 'PACIENTE' THEN

        -- Solicitudes pendientes -> CANCELADA
        UPDATE solicitud
           SET estado = 'CANCELADA',
               cerrada_por_cuenta = p_id_cuenta
         WHERE id_cuenta_paciente = p_id_cuenta
           AND estado = 'PENDIENTE';

        -- Solicitudes aceptadas -> CERRADA
        UPDATE solicitud
           SET estado = 'CERRADA',
               cerrada_por_cuenta = p_id_cuenta
         WHERE id_cuenta_paciente = p_id_cuenta
           AND estado = 'ACEPTADA';

        -- Conversaciones -> SOLO_LECTURA
        UPDATE conversacion c
           SET estado = 'SOLO_LECTURA'
          FROM solicitud s
         WHERE c.id_solicitud = s.id_solicitud
           AND s.id_cuenta_paciente = p_id_cuenta
           AND c.estado <> 'SOLO_LECTURA';

        -- Citas futuras activas -> CANCELADA
        UPDATE cita c
           SET estado = 'CANCELADA',
               cancelada_por_cuenta = p_id_cuenta,
               motivo_cancelacion = COALESCE(
                   c.motivo_cancelacion,
                   'Cancelada automaticamente por inactivacion del paciente'
               )
          FROM solicitud s
         WHERE c.id_solicitud = s.id_solicitud
           AND s.id_cuenta_paciente = p_id_cuenta
           AND c.estado IN ('PROPUESTA', 'ACEPTADA')
           AND c.fecha_hora_inicio > NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- 4) CUENTA_ACCESO:
--    al inactivar paciente/estudiante, aplicar cierre operativo
-- =========================================================

CREATE OR REPLACE FUNCTION trg_cuenta_acceso_inactivacion_operativa()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'INACTIVO'
       AND OLD.estado IS DISTINCT FROM 'INACTIVO'
       AND NEW.tipo_cuenta IN ('PACIENTE', 'ESTUDIANTE') THEN

        PERFORM aplicar_cierre_operativo_por_cuenta(
            NEW.id_cuenta,
            NEW.tipo_cuenta
        );
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cuenta_acceso_inactivacion_operativa ON cuenta_acceso;
CREATE TRIGGER trg_cuenta_acceso_inactivacion_operativa
AFTER UPDATE OF estado
ON cuenta_acceso
FOR EACH ROW
WHEN (NEW.estado = 'INACTIVO' AND OLD.estado IS DISTINCT FROM 'INACTIVO')
EXECUTE FUNCTION trg_cuenta_acceso_inactivacion_operativa();


-- =========================================================
-- 5) UNIVERSIDAD:
--    al inactivar universidad:
--      - inactiva admin universitario
--      - inactiva estudiantes
--      - inactiva docente_universidad
--
--    OJO:
--    No se implementa reactivacion automatica segura
--    porque el esquema actual no distingue que fue
--    inactivado "por arrastre" y que fue inactivado manualmente.
-- =========================================================

CREATE OR REPLACE FUNCTION trg_universidad_inactivacion_cascada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'INACTIVO'
       AND OLD.estado IS DISTINCT FROM 'INACTIVO' THEN

        -- Administrador universitario
        UPDATE cuenta_acceso ca
           SET estado = 'INACTIVO'
          FROM cuenta_admin_universidad cau
         WHERE ca.id_cuenta = cau.id_cuenta
           AND cau.id_universidad = NEW.id_universidad
           AND ca.estado <> 'INACTIVO';

        -- Estudiantes de la universidad
        UPDATE cuenta_acceso ca
           SET estado = 'INACTIVO'
          FROM cuenta_estudiante ce
         WHERE ca.id_cuenta = ce.id_cuenta
           AND ce.id_universidad = NEW.id_universidad
           AND ca.estado <> 'INACTIVO';

        -- Docentes vinculados a esa universidad
        UPDATE docente_universidad du
           SET estado = 'INACTIVO'
         WHERE du.id_universidad = NEW.id_universidad
           AND du.estado <> 'INACTIVO';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_universidad_inactivacion_cascada ON universidad;
CREATE TRIGGER trg_universidad_inactivacion_cascada
AFTER UPDATE OF estado
ON universidad
FOR EACH ROW
WHEN (NEW.estado = 'INACTIVO' AND OLD.estado IS DISTINCT FROM 'INACTIVO')
EXECUTE FUNCTION trg_universidad_inactivacion_cascada();

-- =====================================================================
-- Source: solicitudes + chat + agenda operativa.txt
-- =====================================================================

-- =========================================================
-- 1) FUNCION AUXILIAR:
--    valida conflictos de agenda para cita/reprogramacion
-- =========================================================

CREATE OR REPLACE FUNCTION validar_disponibilidad_intervalo(
    p_id_solicitud INT,
    p_fecha_hora_inicio TIMESTAMPTZ,
    p_fecha_hora_fin TIMESTAMPTZ,
    p_id_cita_excluir INT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_id_cuenta_estudiante INT;
    v_id_cuenta_paciente   INT;
    v_inicio_local         TIMESTAMP;
    v_fin_local            TIMESTAMP;
BEGIN
    IF p_fecha_hora_fin <= p_fecha_hora_inicio THEN
        RAISE EXCEPTION 'La fecha_hora_fin debe ser mayor que fecha_hora_inicio.';
    END IF;

    SELECT s.id_cuenta_estudiante, s.id_cuenta_paciente
      INTO v_id_cuenta_estudiante, v_id_cuenta_paciente
    FROM solicitud s
    WHERE s.id_solicitud = p_id_solicitud;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la solicitud %.', p_id_solicitud;
    END IF;

    -- Se usa la zona local del dominio para validar bloqueos recurrentes.
    v_inicio_local := p_fecha_hora_inicio AT TIME ZONE 'America/Bogota';
    v_fin_local    := p_fecha_hora_fin    AT TIME ZONE 'America/Bogota';

    -- Conflicto con otras citas activas del estudiante
    IF EXISTS (
        SELECT 1
        FROM cita c
        JOIN solicitud s2
          ON s2.id_solicitud = c.id_solicitud
        WHERE s2.id_cuenta_estudiante = v_id_cuenta_estudiante
          AND c.estado IN ('PROPUESTA', 'ACEPTADA')
          AND c.id_cita <> COALESCE(p_id_cita_excluir, -1)
          AND p_fecha_hora_inicio < c.fecha_hora_fin
          AND p_fecha_hora_fin    > c.fecha_hora_inicio
    ) THEN
        RAISE EXCEPTION
            'Conflicto de horario: el estudiante ya tiene otra cita activa en ese intervalo.';
    END IF;

    -- Conflicto con otras citas activas del paciente
    IF EXISTS (
        SELECT 1
        FROM cita c
        JOIN solicitud s2
          ON s2.id_solicitud = c.id_solicitud
        WHERE s2.id_cuenta_paciente = v_id_cuenta_paciente
          AND c.estado IN ('PROPUESTA', 'ACEPTADA')
          AND c.id_cita <> COALESCE(p_id_cita_excluir, -1)
          AND p_fecha_hora_inicio < c.fecha_hora_fin
          AND p_fecha_hora_fin    > c.fecha_hora_inicio
    ) THEN
        RAISE EXCEPTION
            'Conflicto de horario: el paciente ya tiene otra cita activa en ese intervalo.';
    END IF;

    -- Conflicto con horario bloqueado especifico o recurrente del estudiante
    IF EXISTS (
        SELECT 1
        FROM horario_bloqueado hb
        WHERE hb.id_cuenta_estudiante = v_id_cuenta_estudiante
          AND hb.estado = 'ACTIVO'
          AND (
                (
                    hb.tipo_bloqueo = 'ESPECIFICO'
                    AND hb.fecha_especifica = v_inicio_local::date
                    AND v_inicio_local::time < hb.hora_fin
                    AND v_fin_local::time    > hb.hora_inicio
                )
                OR
                (
                    hb.tipo_bloqueo = 'RECURRENTE'
                    AND hb.dia_semana = EXTRACT(ISODOW FROM v_inicio_local)::INT
                    AND v_inicio_local::date >= hb.fecha_inicio_recurrencia
                    AND (
                        hb.fecha_fin_recurrencia IS NULL
                        OR v_inicio_local::date <= hb.fecha_fin_recurrencia
                    )
                    AND v_inicio_local::time < hb.hora_fin
                    AND v_fin_local::time    > hb.hora_inicio
                )
          )
    ) THEN
        RAISE EXCEPTION
            'Conflicto de horario: el intervalo cae en un horario bloqueado del estudiante.';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- 2) SOLICITUD:
--    duplicado activo, limite diario, cuentas activas
-- =========================================================

CREATE OR REPLACE FUNCTION trg_solicitud_validaciones()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_paciente   estado_simple_enum;
    v_estado_estudiante estado_simple_enum;
BEGIN
    -- Solo para nuevas solicitudes
    IF TG_OP = 'INSERT' THEN
        SELECT ca.estado
          INTO v_estado_paciente
        FROM cuenta_acceso ca
        WHERE ca.id_cuenta = NEW.id_cuenta_paciente;

        SELECT ca.estado
          INTO v_estado_estudiante
        FROM cuenta_acceso ca
        WHERE ca.id_cuenta = NEW.id_cuenta_estudiante;

        IF v_estado_paciente IS DISTINCT FROM 'ACTIVO' THEN
            RAISE EXCEPTION 'La cuenta del paciente debe estar ACTIVA para crear una solicitud.';
        END IF;

        IF v_estado_estudiante IS DISTINCT FROM 'ACTIVO' THEN
            RAISE EXCEPTION 'La cuenta del estudiante debe estar ACTIVA para crear una solicitud.';
        END IF;

        IF (
            SELECT COUNT(*)
            FROM solicitud s
            WHERE s.id_cuenta_paciente = NEW.id_cuenta_paciente
              AND s.fecha_envio >= NOW() - INTERVAL '24 hours'
        ) >= 3 THEN
            RAISE EXCEPTION
                'Limite excedido: el paciente no puede enviar mas de 3 solicitudes en 24 horas.';
        END IF;
    END IF;

    -- No mas de una solicitud activa entre el mismo paciente y estudiante
    IF NEW.estado IN ('PENDIENTE', 'ACEPTADA') THEN
        IF EXISTS (
            SELECT 1
            FROM solicitud s
            WHERE s.id_cuenta_paciente   = NEW.id_cuenta_paciente
              AND s.id_cuenta_estudiante = NEW.id_cuenta_estudiante
              AND s.estado IN ('PENDIENTE', 'ACEPTADA')
              AND s.id_solicitud <> COALESCE(NEW.id_solicitud, -1)
        ) THEN
            RAISE EXCEPTION
                'Ya existe otra solicitud activa entre este paciente y este estudiante.';
        END IF;
    END IF;

    -- Si se cierra o cancela, debe quedar quien la cerro
    IF NEW.estado IN ('CERRADA', 'CANCELADA') THEN
        IF NEW.cerrada_por_cuenta IS NULL THEN
            RAISE EXCEPTION
                'Una solicitud en estado % debe registrar cerrada_por_cuenta.',
                NEW.estado;
        END IF;
    ELSE
        NEW.cerrada_por_cuenta := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitud_validaciones ON solicitud;

CREATE TRIGGER trg_solicitud_validaciones
BEFORE INSERT OR UPDATE OF estado, cerrada_por_cuenta
ON solicitud
FOR EACH ROW
EXECUTE FUNCTION trg_solicitud_validaciones();


-- =========================================================
-- 3) SOLICITUD:
--    sincroniza conversacion y cancela citas futuras al cerrar
-- =========================================================

CREATE OR REPLACE FUNCTION trg_solicitud_post_estado()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la solicitud queda aceptada, habilita conversacion si no existe
    IF NEW.estado = 'ACEPTADA' THEN
        INSERT INTO conversacion (id_solicitud, estado, habilitada_at)
        VALUES (NEW.id_solicitud, 'ACTIVA', NOW())
        ON CONFLICT (id_solicitud) DO NOTHING;
    END IF;

    -- Si la solicitud se cierra o cancela, deja el chat en solo lectura
    -- y cancela citas futuras asociadas
    IF TG_OP = 'UPDATE'
       AND NEW.estado IN ('CERRADA', 'CANCELADA')
       AND OLD.estado IS DISTINCT FROM NEW.estado THEN

        UPDATE conversacion
           SET estado = 'SOLO_LECTURA'
         WHERE id_solicitud = NEW.id_solicitud
           AND estado <> 'SOLO_LECTURA';

        UPDATE cita
           SET estado = 'CANCELADA',
               cancelada_por_cuenta = NEW.cerrada_por_cuenta,
               motivo_cancelacion = COALESCE(
                   motivo_cancelacion,
                   'Cancelada automaticamente por cierre/cancelacion de la solicitud'
               )
         WHERE id_solicitud = NEW.id_solicitud
           AND estado IN ('PROPUESTA', 'ACEPTADA')
           AND fecha_hora_inicio > NOW();
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solicitud_post_estado ON solicitud;

CREATE TRIGGER trg_solicitud_post_estado
AFTER INSERT OR UPDATE OF estado
ON solicitud
FOR EACH ROW
EXECUTE FUNCTION trg_solicitud_post_estado();


-- =========================================================
-- 4) MENSAJE:
--    solo participantes y solo conversacion ACTIVA
-- =========================================================

CREATE OR REPLACE FUNCTION trg_mensaje_validaciones()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_conversacion conversacion_estado_enum;
    v_id_cuenta_paciente  INT;
    v_id_cuenta_estudiante INT;
BEGIN
    SELECT c.estado, s.id_cuenta_paciente, s.id_cuenta_estudiante
      INTO v_estado_conversacion, v_id_cuenta_paciente, v_id_cuenta_estudiante
    FROM conversacion c
    JOIN solicitud s
      ON s.id_solicitud = c.id_solicitud
    WHERE c.id_conversacion = NEW.id_conversacion;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe la conversacion % para registrar el mensaje.',
            NEW.id_conversacion;
    END IF;

    IF v_estado_conversacion <> 'ACTIVA' THEN
        RAISE EXCEPTION
            'No se pueden registrar mensajes en una conversacion con estado %.',
            v_estado_conversacion;
    END IF;

    IF NEW.id_cuenta_remitente NOT IN (v_id_cuenta_paciente, v_id_cuenta_estudiante) THEN
        RAISE EXCEPTION
            'El remitente no participa en la conversacion.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mensaje_validaciones ON mensaje;

CREATE TRIGGER trg_mensaje_validaciones
BEFORE INSERT
ON mensaje
FOR EACH ROW
EXECUTE FUNCTION trg_mensaje_validaciones();


-- =========================================================
-- 5) CITA:
--    solicitud aceptada, una propuesta por solicitud,
--    docente/sede en misma universidad, sin choques
-- =========================================================

CREATE OR REPLACE FUNCTION trg_cita_validaciones_operativas()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_solicitud     solicitud_estado_enum;
    v_id_cuenta_paciente   INT;
    v_id_cuenta_estudiante INT;
    v_id_universidad_est   INT;
    v_id_universidad_doc   INT;
    v_id_universidad_sede  INT;
    v_estado_docente       estado_simple_enum;
    v_estado_sede          estado_simple_enum;
BEGIN
    SELECT s.estado,
           s.id_cuenta_paciente,
           s.id_cuenta_estudiante,
           ce.id_universidad
      INTO v_estado_solicitud,
           v_id_cuenta_paciente,
           v_id_cuenta_estudiante,
           v_id_universidad_est
    FROM solicitud s
    JOIN cuenta_estudiante ce
      ON ce.id_cuenta = s.id_cuenta_estudiante
    WHERE s.id_solicitud = NEW.id_solicitud;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la solicitud % asociada a la cita.', NEW.id_solicitud;
    END IF;

    -- Solo aplica para generar/proponer/aceptar citas,
    -- no para cancelar citas viejas cuando la solicitud se cierra.
    IF TG_OP = 'INSERT' OR NEW.estado IN ('PROPUESTA', 'ACEPTADA') THEN
        IF v_estado_solicitud <> 'ACEPTADA' THEN
            RAISE EXCEPTION
                'Solo una solicitud ACEPTADA puede generar o mantener citas activas.';
        END IF;
    END IF;

    IF NEW.estado IN ('PROPUESTA', 'ACEPTADA') THEN
        -- Una sola cita propuesta por solicitud
        IF NEW.estado = 'PROPUESTA' AND EXISTS (
            SELECT 1
            FROM cita c
            WHERE c.id_solicitud = NEW.id_solicitud
              AND c.estado = 'PROPUESTA'
              AND c.id_cita <> COALESCE(NEW.id_cita, -1)
        ) THEN
            RAISE EXCEPTION
                'Solo puede existir una cita en estado PROPUESTA por solicitud.';
        END IF;

        SELECT du.id_universidad, du.estado
          INTO v_id_universidad_doc, v_estado_docente
        FROM docente_universidad du
        WHERE du.id_docente_universidad = NEW.id_docente_universidad;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No existe la vinculacion docente_universidad %.',
                NEW.id_docente_universidad;
        END IF;

        SELECT s.id_universidad, s.estado
          INTO v_id_universidad_sede, v_estado_sede
        FROM sede s
        WHERE s.id_sede = NEW.id_sede;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No existe la sede %.',
                NEW.id_sede;
        END IF;

        IF v_id_universidad_doc <> v_id_universidad_est THEN
            RAISE EXCEPTION
                'El docente supervisor no pertenece a la universidad del estudiante.';
        END IF;

        IF v_id_universidad_sede <> v_id_universidad_est THEN
            RAISE EXCEPTION
                'La sede seleccionada no pertenece a la universidad del estudiante.';
        END IF;

        IF v_estado_docente <> 'ACTIVO' THEN
            RAISE EXCEPTION
                'La vinculacion docente_universidad seleccionada no esta ACTIVA.';
        END IF;

        IF v_estado_sede <> 'ACTIVO' THEN
            RAISE EXCEPTION
                'La sede seleccionada no esta ACTIVA.';
        END IF;

        PERFORM validar_disponibilidad_intervalo(
            NEW.id_solicitud,
            NEW.fecha_hora_inicio,
            NEW.fecha_hora_fin,
            NEW.id_cita
        );
    END IF;

    -- Cancelacion consistente
    IF NEW.estado = 'CANCELADA' THEN
        IF NEW.cancelada_por_cuenta IS NULL THEN
            RAISE EXCEPTION
                'Una cita cancelada debe registrar cancelada_por_cuenta.';
        END IF;

        IF NEW.cancelada_por_cuenta NOT IN (v_id_cuenta_paciente, v_id_cuenta_estudiante) THEN
            RAISE EXCEPTION
                'Solo el paciente o el estudiante participantes pueden cancelar la cita.';
        END IF;
    ELSE
        NEW.cancelada_por_cuenta := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cita_validaciones_operativas ON cita;

CREATE TRIGGER trg_cita_validaciones_operativas
BEFORE INSERT OR UPDATE OF
    estado,
    id_solicitud,
    id_docente_universidad,
    id_sede,
    fecha_hora_inicio,
    fecha_hora_fin,
    cancelada_por_cuenta
ON cita
FOR EACH ROW
EXECUTE FUNCTION trg_cita_validaciones_operativas();


-- =========================================================
-- 6) CITA_TRATAMIENTO:
--    el tratamiento debe estar activo para el estudiante
-- =========================================================

CREATE OR REPLACE FUNCTION trg_cita_tratamiento_validacion()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cuenta_estudiante INT;
BEGIN
    SELECT s.id_cuenta_estudiante
      INTO v_id_cuenta_estudiante
    FROM cita c
    JOIN solicitud s
      ON s.id_solicitud = c.id_solicitud
    WHERE c.id_cita = NEW.id_cita;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la cita %.', NEW.id_cita;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM estudiante_tratamiento et
        WHERE et.id_cuenta_estudiante = v_id_cuenta_estudiante
          AND et.id_tipo_tratamiento = NEW.id_tipo_tratamiento
          AND et.estado = 'ACTIVO'
    ) THEN
        RAISE EXCEPTION
            'El tratamiento % no esta activo para el estudiante asociado a la cita.',
            NEW.id_tipo_tratamiento;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cita_tratamiento_validacion ON cita_tratamiento;

CREATE TRIGGER trg_cita_tratamiento_validacion
BEFORE INSERT OR UPDATE OF id_tipo_tratamiento
ON cita_tratamiento
FOR EACH ROW
EXECUTE FUNCTION trg_cita_tratamiento_validacion();


-- =========================================================
-- 7) REPROGRAMACION_CITA:
--    solo sobre cita aceptada, participantes validos,
--    48h antes, sin conflictos, respuesta por contraparte
-- =========================================================

CREATE OR REPLACE FUNCTION trg_reprogramacion_validaciones()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_cita          cita_estado_enum;
    v_fecha_hora_inicio    TIMESTAMPTZ;
    v_id_solicitud         INT;
    v_id_cuenta_paciente   INT;
    v_id_cuenta_estudiante INT;
    v_id_universidad_est   INT;
    v_id_universidad_doc   INT;
    v_id_universidad_sede  INT;
    v_estado_docente       estado_simple_enum;
    v_estado_sede          estado_simple_enum;
BEGIN
    SELECT c.estado,
           c.fecha_hora_inicio,
           c.id_solicitud,
           s.id_cuenta_paciente,
           s.id_cuenta_estudiante,
           ce.id_universidad
      INTO v_estado_cita,
           v_fecha_hora_inicio,
           v_id_solicitud,
           v_id_cuenta_paciente,
           v_id_cuenta_estudiante,
           v_id_universidad_est
    FROM cita c
    JOIN solicitud s
      ON s.id_solicitud = c.id_solicitud
    JOIN cuenta_estudiante ce
      ON ce.id_cuenta = s.id_cuenta_estudiante
    WHERE c.id_cita = NEW.id_cita;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la cita % para reprogramar.', NEW.id_cita;
    END IF;

    IF NEW.propuesta_por_cuenta NOT IN (v_id_cuenta_paciente, v_id_cuenta_estudiante) THEN
        RAISE EXCEPTION
            'Solo el paciente o el estudiante participantes pueden proponer la reprogramacion.';
    END IF;

    IF NEW.estado IN ('ACEPTADA', 'RECHAZADA') THEN
        IF v_estado_cita NOT IN ('ACEPTADA', 'PROPUESTA') THEN
            RAISE EXCEPTION
                'Solo se puede responder una reprogramacion cuando la cita esta activa.';
        END IF;
    ELSE
        IF TG_OP = 'INSERT' THEN
            IF v_estado_cita <> 'ACEPTADA' THEN
                RAISE EXCEPTION
                    'Solo se puede proponer una reprogramacion sobre una cita ACEPTADA.';
            END IF;
        ELSE
            IF v_estado_cita NOT IN ('ACEPTADA', 'PROPUESTA') THEN
                RAISE EXCEPTION
                    'Solo se puede mantener una reprogramacion pendiente sobre una cita activa.';
            END IF;
        END IF;

        IF NOW() > v_fecha_hora_inicio - INTERVAL '48 hours' THEN
            RAISE EXCEPTION
                'La reprogramacion solo puede proponerse hasta 48 horas antes de la cita.';
        END IF;
    END IF;

    IF NEW.nuevo_id_docente_universidad IS NOT NULL THEN
        SELECT du.id_universidad,
               du.estado
          INTO v_id_universidad_doc,
               v_estado_docente
        FROM docente_universidad du
        WHERE du.id_docente_universidad = NEW.nuevo_id_docente_universidad;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No existe la vinculacion docente_universidad % propuesta.',
                NEW.nuevo_id_docente_universidad;
        END IF;

        IF v_id_universidad_doc <> v_id_universidad_est THEN
            RAISE EXCEPTION
                'El docente supervisor propuesto no pertenece a la universidad del estudiante.';
        END IF;

        IF v_estado_docente <> 'ACTIVO' THEN
            RAISE EXCEPTION
                'La vinculacion docente_universidad propuesta no esta ACTIVA.';
        END IF;
    END IF;

    IF NEW.nueva_id_sede IS NOT NULL THEN
        SELECT s.id_universidad,
               s.estado
          INTO v_id_universidad_sede,
               v_estado_sede
        FROM sede s
        WHERE s.id_sede = NEW.nueva_id_sede;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No existe la sede % propuesta.',
                NEW.nueva_id_sede;
        END IF;

        IF v_id_universidad_sede <> v_id_universidad_est THEN
            RAISE EXCEPTION
                'La sede propuesta no pertenece a la universidad del estudiante.';
        END IF;

        IF v_estado_sede <> 'ACTIVO' THEN
            RAISE EXCEPTION
                'La sede propuesta no esta ACTIVA.';
        END IF;
    END IF;

    IF NEW.estado IN ('PENDIENTE', 'ACEPTADA') THEN
        PERFORM validar_disponibilidad_intervalo(
            v_id_solicitud,
            NEW.nueva_fecha_hora_inicio,
            NEW.nueva_fecha_hora_fin,
            NEW.id_cita
        );
    END IF;

    IF NEW.estado IN ('ACEPTADA', 'RECHAZADA') THEN
        IF NEW.respuesta_por_cuenta IS NULL THEN
            RAISE EXCEPTION
                'Una reprogramacion % debe registrar respuesta_por_cuenta.',
                NEW.estado;
        END IF;

        IF NEW.respuesta_por_cuenta NOT IN (v_id_cuenta_paciente, v_id_cuenta_estudiante) THEN
            RAISE EXCEPTION
                'La cuenta que responde la reprogramacion no participa en la cita.';
        END IF;

        IF NEW.respuesta_por_cuenta = NEW.propuesta_por_cuenta THEN
            RAISE EXCEPTION
                'La reprogramacion debe ser respondida por la contraparte, no por quien la propuso.';
        END IF;
    ELSE
        NEW.respuesta_por_cuenta := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reprogramacion_validaciones ON reprogramacion_cita;

CREATE TRIGGER trg_reprogramacion_validaciones
BEFORE INSERT OR UPDATE OF
    estado,
    propuesta_por_cuenta,
    respuesta_por_cuenta,
    nueva_id_sede,
    nuevo_id_docente_universidad,
    nueva_fecha_hora_inicio,
    nueva_fecha_hora_fin
ON reprogramacion_cita
FOR EACH ROW
EXECUTE FUNCTION trg_reprogramacion_validaciones();


-- =========================================================
-- 8) REPROGRAMACION_CITA:
--    si se acepta, actualiza la misma cita
-- =========================================================

CREATE OR REPLACE FUNCTION trg_reprogramacion_aplicar_si_aceptada()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT'
       OR OLD.estado IS DISTINCT FROM NEW.estado
       OR OLD.nueva_fecha_hora_inicio IS DISTINCT FROM NEW.nueva_fecha_hora_inicio
       OR OLD.nueva_fecha_hora_fin IS DISTINCT FROM NEW.nueva_fecha_hora_fin
       OR OLD.nueva_id_sede IS DISTINCT FROM NEW.nueva_id_sede
       OR OLD.nuevo_id_docente_universidad IS DISTINCT FROM NEW.nuevo_id_docente_universidad THEN

        IF NEW.estado = 'ACEPTADA' THEN
            UPDATE cita
               SET fecha_hora_inicio = NEW.nueva_fecha_hora_inicio,
                   fecha_hora_fin = NEW.nueva_fecha_hora_fin,
                   id_sede = COALESCE(NEW.nueva_id_sede, id_sede),
                   id_docente_universidad = COALESCE(NEW.nuevo_id_docente_universidad, id_docente_universidad)
             WHERE id_cita = NEW.id_cita;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reprogramacion_aplicar_si_aceptada ON reprogramacion_cita;

CREATE TRIGGER trg_reprogramacion_aplicar_si_aceptada
AFTER INSERT OR UPDATE OF
    estado,
    nueva_fecha_hora_inicio,
    nueva_fecha_hora_fin,
    nueva_id_sede,
    nuevo_id_docente_universidad
ON reprogramacion_cita
FOR EACH ROW
WHEN (NEW.estado = 'ACEPTADA')
EXECUTE FUNCTION trg_reprogramacion_aplicar_si_aceptada();

-- =====================================================================
-- Source: valoracion + cita + notificacion.txt
-- =====================================================================

-- =========================================================
-- 1) VALORACION:
--    solo sobre cita FINALIZADA
--    emisor y receptor deben ser las dos partes de la cita
-- =========================================================

CREATE OR REPLACE FUNCTION trg_valoracion_validaciones()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_cita cita_estado_enum;
    v_id_cuenta_paciente INT;
    v_id_cuenta_estudiante INT;
BEGIN
    SELECT c.estado,
           s.id_cuenta_paciente,
           s.id_cuenta_estudiante
      INTO v_estado_cita,
           v_id_cuenta_paciente,
           v_id_cuenta_estudiante
    FROM cita c
    JOIN solicitud s
      ON s.id_solicitud = c.id_solicitud
    WHERE c.id_cita = NEW.id_cita;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe la cita % asociada a la valoracion.',
            NEW.id_cita;
    END IF;

    IF v_estado_cita <> 'FINALIZADA' THEN
        RAISE EXCEPTION
            'Solo se pueden registrar valoraciones sobre citas FINALIZADAS.';
    END IF;

    IF NEW.id_cuenta_emisor = NEW.id_cuenta_receptor THEN
        RAISE EXCEPTION
            'El emisor y el receptor de la valoracion no pueden ser la misma cuenta.';
    END IF;

    -- Deben ser exactamente paciente y estudiante de esa cita
    IF NOT (
        (NEW.id_cuenta_emisor = v_id_cuenta_paciente AND NEW.id_cuenta_receptor = v_id_cuenta_estudiante)
        OR
        (NEW.id_cuenta_emisor = v_id_cuenta_estudiante AND NEW.id_cuenta_receptor = v_id_cuenta_paciente)
    ) THEN
        RAISE EXCEPTION
            'El emisor y el receptor de la valoracion deben ser las dos partes que participaron en la cita.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valoracion_validaciones ON valoracion;

CREATE TRIGGER trg_valoracion_validaciones
BEFORE INSERT OR UPDATE OF id_cita, id_cuenta_emisor, id_cuenta_receptor
ON valoracion
FOR EACH ROW
EXECUTE FUNCTION trg_valoracion_validaciones();


-- =========================================================
-- 2) NOTIFICACION:
--    validacion basica de contenido no vacio
--    (la pertenencia a cuenta autenticada ya la cubre el FK)
-- =========================================================

CREATE OR REPLACE FUNCTION trg_notificacion_validaciones_basicas()
RETURNS TRIGGER AS $$
BEGIN
    IF COALESCE(BTRIM(NEW.contenido), '') = '' THEN
        RAISE EXCEPTION
            'El contenido de la notificacion no puede estar vacio.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificacion_validaciones_basicas ON notificacion;

CREATE TRIGGER trg_notificacion_validaciones_basicas
BEFORE INSERT OR UPDATE OF contenido
ON notificacion
FOR EACH ROW
EXECUTE FUNCTION trg_notificacion_validaciones_basicas();


-- =========================================================
-- 3) CITA:
--    debe tener al menos un tratamiento
--
--    Se resuelve con CONSTRAINT TRIGGER DEFERRABLE
--    para permitir:
--    INSERT cita
--    INSERT cita_tratamiento
--    en la misma transaccion.
-- =========================================================

CREATE OR REPLACE FUNCTION validar_cita_con_tratamientos(p_id_cita INT)
RETURNS VOID AS $$
BEGIN
    IF p_id_cita IS NULL THEN
        RETURN;
    END IF;

    -- Si la cita ya no existe, no se valida
    IF NOT EXISTS (
        SELECT 1
        FROM cita c
        WHERE c.id_cita = p_id_cita
    ) THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM cita_tratamiento ct
        WHERE ct.id_cita = p_id_cita
    ) THEN
        RAISE EXCEPTION
            'La cita % debe tener al menos un tratamiento asociado en cita_tratamiento.',
            p_id_cita;
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION trg_validar_cita_con_tratamientos()
RETURNS TRIGGER AS $$
DECLARE
    v_id_cita INT;
BEGIN
    v_id_cita := COALESCE(NEW.id_cita, OLD.id_cita);
    PERFORM validar_cita_con_tratamientos(v_id_cita);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ctrg_cita_debe_tener_tratamiento ON cita;
CREATE CONSTRAINT TRIGGER ctrg_cita_debe_tener_tratamiento
AFTER INSERT OR UPDATE
ON cita
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_cita_con_tratamientos();

DROP TRIGGER IF EXISTS ctrg_cita_tratamiento_presencia ON cita_tratamiento;
CREATE CONSTRAINT TRIGGER ctrg_cita_tratamiento_presencia
AFTER INSERT OR UPDATE OR DELETE
ON cita_tratamiento
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION trg_validar_cita_con_tratamientos();

-- =====================================================================
-- Source: lectura.txt
-- =====================================================================

-- El backend debe hacer:
-- SET LOCAL app.id_cuenta = '123';
-- antes de ejecutar UPDATE notificacion ...

CREATE OR REPLACE FUNCTION trg_notificacion_validar_propietario_lectura()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id INT;
BEGIN
    -- Solo aplica cuando cambia el flag leida
    IF NEW.leida IS DISTINCT FROM OLD.leida THEN
        v_actor_id := NULLIF(current_setting('app.id_cuenta', true), '')::INT;

        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION
                'No se pudo validar el propietario de la notificacion: falta app.id_cuenta en la sesion.';
        END IF;

        IF v_actor_id <> OLD.id_cuenta_destino THEN
            RAISE EXCEPTION
                'Solo el propietario de la notificacion puede modificar su estado de lectura.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificacion_validar_propietario_lectura ON notificacion;

CREATE TRIGGER trg_notificacion_validar_propietario_lectura
BEFORE UPDATE OF leida
ON notificacion
FOR EACH ROW
EXECUTE FUNCTION trg_notificacion_validar_propietario_lectura();

