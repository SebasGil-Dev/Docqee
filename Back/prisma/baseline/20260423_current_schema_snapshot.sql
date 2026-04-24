BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE tipo_cuenta_enum AS ENUM (
    'PACIENTE',
    'ESTUDIANTE',
    'ADMIN_UNIVERSIDAD',
    'ADMIN_PLATAFORMA'
);

CREATE TYPE estado_simple_enum AS ENUM (
    'ACTIVO',
    'INACTIVO'
);

CREATE TYPE sexo_enum AS ENUM (
    'FEMENINO',
    'MASCULINO',
    'OTRO'
);

CREATE TYPE tipo_bloqueo_enum AS ENUM (
    'ESPECIFICO',
    'RECURRENTE'
);

CREATE TYPE tipo_enlace_enum AS ENUM (
    'RED_PROFESIONAL',
    'PORTAFOLIO',
    'HOJA_DE_VIDA',
    'OTRO'
);

CREATE TYPE solicitud_estado_enum AS ENUM (
    'PENDIENTE',
    'ACEPTADA',
    'RECHAZADA',
    'CERRADA',
    'CANCELADA'
);

CREATE TYPE conversacion_estado_enum AS ENUM (
    'ACTIVA',
    'SOLO_LECTURA',
    'CERRADA'
);

CREATE TYPE cita_estado_enum AS ENUM (
    'PROPUESTA',
    'ACEPTADA',
    'RECHAZADA',
    'CANCELADA',
    'FINALIZADA'
);

CREATE TYPE reprogramacion_estado_enum AS ENUM (
    'PENDIENTE',
    'ACEPTADA',
    'RECHAZADA'
);

CREATE TYPE notificacion_tipo_enum AS ENUM (
    'SOLICITUD',
    'RESPUESTA_SOLICITUD',
    'PROPUESTA_CITA',
    'RESPUESTA_CITA',
    'REPROGRAMACION',
    'CANCELACION_CITA',
    'RECORDATORIO'
);

CREATE TYPE tipo_envio_credencial_enum AS ENUM (
    'ENVIO',
    'REENVIO'
);

CREATE TABLE ciudad (
    id_ciudad INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    CONSTRAINT uq_ciudad_nombre
        UNIQUE (nombre)
);

CREATE TABLE localidad (
    id_localidad INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ciudad INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    CONSTRAINT fk_localidad_ciudad
        FOREIGN KEY (id_ciudad) REFERENCES ciudad(id_ciudad),
    CONSTRAINT uq_localidad_ciudad_nombre
        UNIQUE (id_ciudad, nombre)
);

CREATE TABLE tipo_tratamiento (
    id_tipo_tratamiento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    CONSTRAINT uq_tipo_tratamiento_nombre
        UNIQUE (nombre)
);

CREATE TABLE tipo_cita (
    id_tipo_cita INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    CONSTRAINT uq_tipo_cita_nombre
        UNIQUE (nombre)
);

CREATE TABLE tipo_documento (
    id_tipo_documento SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    CONSTRAINT uq_tipo_documento_codigo
        UNIQUE (codigo),
    CONSTRAINT uq_tipo_documento_nombre
        UNIQUE (nombre)
);

CREATE TABLE universidad (
    id_universidad INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_localidad_principal INT NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    logo_url TEXT,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_universidad_localidad
        FOREIGN KEY (id_localidad_principal) REFERENCES localidad(id_localidad),
    CONSTRAINT uq_universidad_nombre
        UNIQUE (nombre)
);

CREATE TABLE sede (
    id_sede INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_universidad INT NOT NULL,
    id_localidad INT NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    direccion TEXT NOT NULL,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_sede_universidad
        FOREIGN KEY (id_universidad) REFERENCES universidad(id_universidad),
    CONSTRAINT fk_sede_localidad
        FOREIGN KEY (id_localidad) REFERENCES localidad(id_localidad),
    CONSTRAINT uq_sede_universidad_nombre
        UNIQUE (id_universidad, nombre)
);

CREATE TABLE docente (
    id_docente INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo_documento SMALLINT NOT NULL,
    numero_documento VARCHAR(30) NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_docente_tipo_documento
        FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_docente_documento
        UNIQUE (id_tipo_documento, numero_documento)
);

CREATE TABLE docente_universidad (
    id_docente_universidad INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_docente INT NOT NULL,
    id_universidad INT NOT NULL,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_docente_universidad_docente
        FOREIGN KEY (id_docente) REFERENCES docente(id_docente),
    CONSTRAINT fk_docente_universidad_universidad
        FOREIGN KEY (id_universidad) REFERENCES universidad(id_universidad),
    CONSTRAINT uq_docente_universidad
        UNIQUE (id_docente, id_universidad)
);

CREATE TABLE persona (
    id_persona INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo_documento SMALLINT NOT NULL,
    numero_documento VARCHAR(30) NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_persona_tipo_documento
        FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_persona_documento
        UNIQUE (id_tipo_documento, numero_documento)
);

CREATE TABLE tutor_responsable (
    id_tutor_responsable INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo_documento SMALLINT NOT NULL,
    numero_documento VARCHAR(30) NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo CITEXT NOT NULL,
    celular VARCHAR(30) NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tutor_tipo_documento
        FOREIGN KEY (id_tipo_documento) REFERENCES tipo_documento(id_tipo_documento),
    CONSTRAINT uq_tutor_documento
        UNIQUE (id_tipo_documento, numero_documento)
);

CREATE TABLE cuenta_acceso (
    id_cuenta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_cuenta tipo_cuenta_enum NOT NULL,
    correo CITEXT NOT NULL,
    password_hash TEXT NOT NULL,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    correo_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    correo_verificado_at TIMESTAMPTZ,
    primer_ingreso_pendiente BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login_at TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cuenta_acceso_correo
        UNIQUE (correo)
);

CREATE TABLE cuenta_paciente (
    id_cuenta INT PRIMARY KEY,
    id_persona INT NOT NULL,
    id_localidad INT NOT NULL,
    id_tutor_responsable INT,
    sexo sexo_enum NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    celular VARCHAR(30) NOT NULL,
    foto_url TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cuenta_paciente_cuenta
        FOREIGN KEY (id_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT fk_cuenta_paciente_persona
        FOREIGN KEY (id_persona) REFERENCES persona(id_persona),
    CONSTRAINT fk_cuenta_paciente_localidad
        FOREIGN KEY (id_localidad) REFERENCES localidad(id_localidad),
    CONSTRAINT fk_cuenta_paciente_tutor
        FOREIGN KEY (id_tutor_responsable) REFERENCES tutor_responsable(id_tutor_responsable),
    CONSTRAINT uq_cuenta_paciente_persona
        UNIQUE (id_persona)
);

CREATE TABLE cuenta_estudiante (
    id_cuenta INT PRIMARY KEY,
    id_persona INT NOT NULL,
    id_universidad INT NOT NULL,
    celular VARCHAR(30) NOT NULL,
    semestre SMALLINT NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cuenta_estudiante_cuenta
        FOREIGN KEY (id_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT fk_cuenta_estudiante_persona
        FOREIGN KEY (id_persona) REFERENCES persona(id_persona),
    CONSTRAINT fk_cuenta_estudiante_universidad
        FOREIGN KEY (id_universidad) REFERENCES universidad(id_universidad),
    CONSTRAINT uq_cuenta_estudiante_persona
        UNIQUE (id_persona),
    CONSTRAINT ck_cuenta_estudiante_semestre
        CHECK (semestre > 0)
);

CREATE TABLE cuenta_admin_universidad (
    id_cuenta INT PRIMARY KEY,
    id_universidad INT NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    celular VARCHAR(30),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_admin_universidad_cuenta
        FOREIGN KEY (id_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT fk_admin_universidad_universidad
        FOREIGN KEY (id_universidad) REFERENCES universidad(id_universidad),
    CONSTRAINT uq_admin_universidad_universidad
        UNIQUE (id_universidad)
);

CREATE TABLE cuenta_admin_plataforma (
    id_cuenta INT PRIMARY KEY,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_admin_plataforma_cuenta
        FOREIGN KEY (id_cuenta) REFERENCES cuenta_acceso(id_cuenta)
);

CREATE TABLE perfil_estudiante (
    id_perfil_estudiante INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_estudiante INT NOT NULL,
    foto_url TEXT,
    descripcion TEXT,
    disponibilidad_general TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_perfil_estudiante_cuenta
        FOREIGN KEY (id_cuenta_estudiante) REFERENCES cuenta_estudiante(id_cuenta),
    CONSTRAINT uq_perfil_estudiante_cuenta
        UNIQUE (id_cuenta_estudiante)
);

CREATE TABLE enlace_profesional (
    id_enlace_profesional INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_estudiante INT NOT NULL,
    tipo_enlace tipo_enlace_enum NOT NULL,
    url TEXT NOT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_enlace_profesional_cuenta
        FOREIGN KEY (id_cuenta_estudiante) REFERENCES cuenta_estudiante(id_cuenta)
);

CREATE TABLE estudiante_tratamiento (
    id_estudiante_tratamiento INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_estudiante INT NOT NULL,
    id_tipo_tratamiento INT NOT NULL,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_estudiante_tratamiento_cuenta
        FOREIGN KEY (id_cuenta_estudiante) REFERENCES cuenta_estudiante(id_cuenta),
    CONSTRAINT fk_estudiante_tratamiento_tipo
        FOREIGN KEY (id_tipo_tratamiento) REFERENCES tipo_tratamiento(id_tipo_tratamiento),
    CONSTRAINT uq_estudiante_tratamiento
        UNIQUE (id_cuenta_estudiante, id_tipo_tratamiento)
);

CREATE TABLE estudiante_sede_practica (
    id_estudiante_sede_practica INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_estudiante INT NOT NULL,
    id_sede INT NOT NULL,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_estudiante_sede_cuenta
        FOREIGN KEY (id_cuenta_estudiante) REFERENCES cuenta_estudiante(id_cuenta),
    CONSTRAINT fk_estudiante_sede_sede
        FOREIGN KEY (id_sede) REFERENCES sede(id_sede),
    CONSTRAINT uq_estudiante_sede
        UNIQUE (id_cuenta_estudiante, id_sede)
);

CREATE TABLE horario_bloqueado (
    id_horario_bloqueado INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_estudiante INT NOT NULL,
    tipo_bloqueo tipo_bloqueo_enum NOT NULL,
    fecha_especifica DATE,
    dia_semana SMALLINT,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    fecha_inicio_recurrencia DATE,
    fecha_fin_recurrencia DATE,
    motivo TEXT,
    estado estado_simple_enum NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_horario_bloqueado_cuenta
        FOREIGN KEY (id_cuenta_estudiante) REFERENCES cuenta_estudiante(id_cuenta),
    CONSTRAINT ck_horario_bloqueado_horas
        CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_horario_bloqueado_dia_semana
        CHECK (dia_semana IS NULL OR dia_semana BETWEEN 1 AND 7),
    CONSTRAINT ck_horario_bloqueado_tipo
        CHECK (
            (tipo_bloqueo = 'ESPECIFICO' AND fecha_especifica IS NOT NULL AND dia_semana IS NULL)
            OR
            (
                tipo_bloqueo = 'RECURRENTE'
                AND fecha_especifica IS NULL
                AND dia_semana IS NOT NULL
                AND fecha_inicio_recurrencia IS NOT NULL
            )
        ),
    CONSTRAINT ck_horario_bloqueado_fechas_recurrencia
        CHECK (
            fecha_fin_recurrencia IS NULL
            OR fecha_inicio_recurrencia IS NULL
            OR fecha_fin_recurrencia >= fecha_inicio_recurrencia
        )
);

CREATE TABLE solicitud (
    id_solicitud INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_paciente INT NOT NULL,
    id_cuenta_estudiante INT NOT NULL,
    cerrada_por_cuenta INT,
    motivo_consulta TEXT,
    estado solicitud_estado_enum NOT NULL DEFAULT 'PENDIENTE',
    fecha_envio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_respuesta TIMESTAMPTZ,
    fecha_cierre TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_solicitud_paciente
        FOREIGN KEY (id_cuenta_paciente) REFERENCES cuenta_paciente(id_cuenta),
    CONSTRAINT fk_solicitud_estudiante
        FOREIGN KEY (id_cuenta_estudiante) REFERENCES cuenta_estudiante(id_cuenta),
    CONSTRAINT fk_solicitud_cerrada_por
        FOREIGN KEY (cerrada_por_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT ck_solicitud_cuentas_distintas
        CHECK (id_cuenta_paciente <> id_cuenta_estudiante)
);

CREATE TABLE conversacion (
    id_conversacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud INT NOT NULL,
    estado conversacion_estado_enum NOT NULL DEFAULT 'ACTIVA',
    habilitada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    solo_lectura_at TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_conversacion_solicitud
        FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud),
    CONSTRAINT uq_conversacion_solicitud
        UNIQUE (id_solicitud)
);

CREATE TABLE mensaje (
    id_mensaje INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_conversacion INT NOT NULL,
    id_cuenta_remitente INT NOT NULL,
    contenido TEXT NOT NULL,
    enviado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_mensaje_conversacion
        FOREIGN KEY (id_conversacion) REFERENCES conversacion(id_conversacion),
    CONSTRAINT fk_mensaje_remitente
        FOREIGN KEY (id_cuenta_remitente) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT ck_mensaje_contenido
        CHECK (LENGTH(BTRIM(contenido)) > 0)
);

CREATE TABLE cita (
    id_cita INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud INT NOT NULL,
    id_docente_universidad INT NOT NULL,
    id_sede INT NOT NULL,
    id_tipo_cita INT NOT NULL,
    cancelada_por_cuenta INT,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    informacion_adicional TEXT,
    estado cita_estado_enum NOT NULL DEFAULT 'PROPUESTA',
    respondida_at TIMESTAMPTZ,
    motivo_cancelacion TEXT,
    finalizada_at TIMESTAMPTZ,
    recordatorio_24h_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cita_solicitud
        FOREIGN KEY (id_solicitud) REFERENCES solicitud(id_solicitud),
    CONSTRAINT fk_cita_docente_universidad
        FOREIGN KEY (id_docente_universidad) REFERENCES docente_universidad(id_docente_universidad),
    CONSTRAINT fk_cita_sede
        FOREIGN KEY (id_sede) REFERENCES sede(id_sede),
    CONSTRAINT fk_cita_tipo_cita
        FOREIGN KEY (id_tipo_cita) REFERENCES tipo_cita(id_tipo_cita),
    CONSTRAINT fk_cita_cancelada_por
        FOREIGN KEY (cancelada_por_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT ck_cita_horario
        CHECK (fecha_hora_fin > fecha_hora_inicio)
);

CREATE TABLE cita_tratamiento (
    id_cita INT NOT NULL,
    id_tipo_tratamiento INT NOT NULL,
    CONSTRAINT pk_cita_tratamiento
        PRIMARY KEY (id_cita, id_tipo_tratamiento),
    CONSTRAINT fk_cita_tratamiento_cita
        FOREIGN KEY (id_cita) REFERENCES cita(id_cita),
    CONSTRAINT fk_cita_tratamiento_tipo
        FOREIGN KEY (id_tipo_tratamiento) REFERENCES tipo_tratamiento(id_tipo_tratamiento)
);

CREATE TABLE reprogramacion_cita (
    id_reprogramacion_cita INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita INT NOT NULL,
    propuesta_por_cuenta INT NOT NULL,
    respuesta_por_cuenta INT,
    nueva_id_sede INT,
    nuevo_id_docente_universidad INT,
    nueva_fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    nueva_fecha_hora_fin TIMESTAMPTZ NOT NULL,
    motivo TEXT,
    estado reprogramacion_estado_enum NOT NULL DEFAULT 'PENDIENTE',
    fecha_respuesta TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reprogramacion_cita
        FOREIGN KEY (id_cita) REFERENCES cita(id_cita),
    CONSTRAINT fk_reprogramacion_propuesta
        FOREIGN KEY (propuesta_por_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT fk_reprogramacion_respuesta
        FOREIGN KEY (respuesta_por_cuenta) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT fk_reprogramacion_nueva_sede
        FOREIGN KEY (nueva_id_sede) REFERENCES sede(id_sede),
    CONSTRAINT fk_reprogramacion_nuevo_docente
        FOREIGN KEY (nuevo_id_docente_universidad) REFERENCES docente_universidad(id_docente_universidad),
    CONSTRAINT ck_reprogramacion_horario
        CHECK (nueva_fecha_hora_fin > nueva_fecha_hora_inicio)
);


CREATE UNIQUE INDEX uq_reprogramacion_pendiente_por_cita
ON reprogramacion_cita (id_cita)
WHERE estado = 'PENDIENTE';

CREATE TABLE notificacion (
    id_notificacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_destino INT NOT NULL,
    tipo notificacion_tipo_enum NOT NULL,
    contenido TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notificacion_cuenta
        FOREIGN KEY (id_cuenta_destino) REFERENCES cuenta_acceso(id_cuenta)
);

CREATE TABLE valoracion (
    id_valoracion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cita INT NOT NULL,
    id_cuenta_emisor INT NOT NULL,
    id_cuenta_receptor INT NOT NULL,
    calificacion SMALLINT NOT NULL,
    comentario TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_valoracion_cita
        FOREIGN KEY (id_cita) REFERENCES cita(id_cita),
    CONSTRAINT fk_valoracion_emisor
        FOREIGN KEY (id_cuenta_emisor) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT fk_valoracion_receptor
        FOREIGN KEY (id_cuenta_receptor) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT uq_valoracion_cita_emisor
        UNIQUE (id_cita, id_cuenta_emisor),
    CONSTRAINT ck_valoracion_emisor_receptor_distintos
        CHECK (id_cuenta_emisor <> id_cuenta_receptor)
);

CREATE TABLE verificacion_correo (
    id_verificacion_correo INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_acceso INT NOT NULL,
    codigo_hash TEXT NOT NULL,
    expira_at TIMESTAMPTZ NOT NULL,
    usado_at TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_verificacion_correo_cuenta
        FOREIGN KEY (id_cuenta_acceso) REFERENCES cuenta_acceso(id_cuenta)
);

CREATE TABLE recuperacion_cuenta (
    id_recuperacion_cuenta INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_acceso INT NOT NULL,
    codigo_hash TEXT NOT NULL,
    expira_at TIMESTAMPTZ NOT NULL,
    usado_at TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_recuperacion_cuenta
        FOREIGN KEY (id_cuenta_acceso) REFERENCES cuenta_acceso(id_cuenta)
);

CREATE TABLE credencial_inicial (
    id_credencial_inicial INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cuenta_acceso INT NOT NULL,
    anulada_at TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_credencial_inicial_cuenta
        FOREIGN KEY (id_cuenta_acceso) REFERENCES cuenta_acceso(id_cuenta),
    CONSTRAINT uq_credencial_inicial_cuenta
        UNIQUE (id_cuenta_acceso)
);

CREATE TABLE envio_credencial (
    id_envio_credencial INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_credencial_inicial INT NOT NULL,
    tipo_envio tipo_envio_credencial_enum NOT NULL,
    enviado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_envio_credencial
        FOREIGN KEY (id_credencial_inicial) REFERENCES credencial_inicial(id_credencial_inicial)
);

COMMIT;



