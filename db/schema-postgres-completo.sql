--
-- PostgreSQL database dump
--

\restrict 84U1wG7aLJeV0HhOmI9XkfoVvzzTsiojERTPPjTMslBCSV7JDsBwQ4vKH11rXLz

-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Esquema actualizado con soporte para sábanas de servicios';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: actualizar_progreso_checklist(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_progreso_checklist() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE checklists
    SET progreso_porcentaje = calcular_progreso_checklist(NEW.checklist_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.checklist_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: actualizar_progreso_sabana(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_progreso_sabana() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    total INTEGER;
    completados INTEGER;
    progreso DECIMAL(5,2);
BEGIN
    -- Contar total y completados
    SELECT COUNT(*), COUNT(*) FILTER (WHERE realizado = TRUE)
    INTO total, completados
    FROM sabanas_items
    WHERE sabana_id = COALESCE(NEW.sabana_id, OLD.sabana_id);
    
    -- Calcular porcentaje
    IF total > 0 THEN
        progreso := (completados::DECIMAL / total::DECIMAL) * 100;
    ELSE
        progreso := 0.00;
    END IF;
    
    -- Actualizar la sábana
    UPDATE sabanas
    SET 
        total_items = total,
        items_completados = completados,
        progreso_porcentaje = progreso,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.sabana_id, OLD.sabana_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: actualizar_ultimo_acceso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_ultimo_acceso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE usuarios 
    SET ultimo_acceso = NEW.fecha_login,
        intentos_fallidos = 0
    WHERE id = NEW.usuario_id;
    RETURN NEW;
END;
$$;


--
-- Name: actualizar_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.actualizar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: calcular_duracion_sesion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_duracion_sesion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (NEW.fecha_logout IS NOT NULL AND OLD.fecha_logout IS NULL) THEN
        NEW.duracion_minutos := EXTRACT(EPOCH FROM (NEW.fecha_logout - NEW.fecha_login))/60;
        NEW.activa := FALSE;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: calcular_progreso_checklist(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_progreso_checklist(checklist_id_param integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_items INTEGER;
    items_completados INTEGER;
    progreso DECIMAL(5,2);
BEGIN
    SELECT COUNT(*) INTO total_items
    FROM checklist_items
    WHERE checklist_id = checklist_id_param;
    
    IF total_items = 0 THEN
        RETURN 0.00;
    END IF;
    
    SELECT COUNT(*) INTO items_completados
    FROM checklist_items
    WHERE checklist_id = checklist_id_param AND completado = TRUE;
    
    progreso := (items_completados::DECIMAL / total_items::DECIMAL) * 100;
    
    RETURN ROUND(progreso, 2);
END;
$$;


--
-- Name: dar_baja_usuario(integer, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dar_baja_usuario(p_usuario_id integer, p_motivo text, p_admin_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Actualizar usuario
    UPDATE usuarios 
    SET 
        activo = FALSE,
        fecha_baja = CURRENT_TIMESTAMP,
        motivo_baja = p_motivo,
        usuario_baja_id = p_admin_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_usuario_id;
    
    -- Cerrar todas las sesiones activas
    UPDATE sesiones_usuarios
    SET 
        activa = FALSE,
        fecha_logout = CURRENT_TIMESTAMP,
        cerrada_por = 'admin',
        notas = 'Sesión cerrada por baja de usuario'
    WHERE usuario_id = p_usuario_id AND activa = TRUE;
    
    RETURN TRUE;
END;
$$;


--
-- Name: hashear_password(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hashear_password(password_texto text) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN crypt(password_texto, gen_salt('bf', 10));
END;
$$;


--
-- Name: FUNCTION hashear_password(password_texto text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.hashear_password(password_texto text) IS 'Hashea una contraseña usando bcrypt con factor de trabajo 10';


--
-- Name: obtener_estadisticas_cuartos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_estadisticas_cuartos() RETURNS TABLE(estado character varying, cantidad bigint, porcentaje numeric, color character varying, label character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.estado,
        COUNT(*) as cantidad,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje,
        ce.color,
        ce.label
    FROM cuartos c
    LEFT JOIN configuracion_estados ce ON c.estado = ce.valor
    WHERE c.activo = TRUE
    GROUP BY c.estado, ce.color, ce.label
    ORDER BY cantidad DESC;
END;
$$;


--
-- Name: obtener_estadisticas_espacios_comunes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_estadisticas_espacios_comunes() RETURNS TABLE(estado character varying, cantidad bigint, porcentaje numeric, color character varying, label character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.estado,
        COUNT(*) as cantidad,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje,
        ce.color,
        ce.label
    FROM espacios_comunes ec
    LEFT JOIN configuracion_estados ce ON ec.estado = ce.valor
    WHERE ec.activo = TRUE
    GROUP BY ec.estado, ce.color, ce.label
    ORDER BY cantidad DESC;
END;
$$;


--
-- Name: obtener_estadisticas_usuarios(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obtener_estadisticas_usuarios() RETURNS TABLE(total_usuarios bigint, usuarios_activos bigint, usuarios_inactivos bigint, usuarios_bloqueados bigint, sesiones_activas bigint, total_sesiones_hoy bigint, promedio_sesiones_por_usuario numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE AND fecha_baja IS NULL) as usuarios_activos,
        (SELECT COUNT(*) FROM usuarios WHERE activo = FALSE OR fecha_baja IS NOT NULL) as usuarios_inactivos,
        (SELECT COUNT(*) FROM usuarios WHERE bloqueado_hasta > CURRENT_TIMESTAMP) as usuarios_bloqueados,
        (SELECT COUNT(*) FROM sesiones_usuarios WHERE activa = TRUE) as sesiones_activas,
        (SELECT COUNT(*) FROM sesiones_usuarios WHERE DATE(fecha_login) = CURRENT_DATE) as total_sesiones_hoy,
        (SELECT ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM usuarios WHERE activo = TRUE), 0), 2) 
         FROM sesiones_usuarios) as promedio_sesiones_por_usuario;
END;
$$;


--
-- Name: reactivar_usuario(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reactivar_usuario(p_usuario_id integer, p_admin_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE usuarios 
    SET 
        activo = TRUE,
        fecha_baja = NULL,
        motivo_baja = NULL,
        usuario_baja_id = NULL,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_usuario_id;
    
    RETURN TRUE;
END;
$$;


--
-- Name: registrar_auditoria_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_auditoria_usuario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_nuevos)
        VALUES (NEW.id, 'registro', 'Usuario registrado en el sistema', 
                row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Detectar tipo de cambio
        IF (OLD.activo = TRUE AND NEW.activo = FALSE) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'baja', 'Usuario dado de baja', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.activo = FALSE AND NEW.activo = TRUE) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'reactivacion', 'Usuario reactivado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.password_hash != NEW.password_hash) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'cambio_password', 'Contraseña cambiada', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.rol_id != NEW.rol_id) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'cambio_rol', 'Rol modificado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.bloqueado_hasta IS NULL AND NEW.bloqueado_hasta IS NOT NULL) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'bloqueo', 'Usuario bloqueado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.bloqueado_hasta IS NOT NULL AND NEW.bloqueado_hasta IS NULL) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'desbloqueo', 'Usuario desbloqueado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSE
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'actualizacion', 'Información del usuario actualizada', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: verificar_password(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verificar_password(password_texto text, password_hash text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN password_hash = crypt(password_texto, password_hash);
END;
$$;


--
-- Name: FUNCTION verificar_password(password_texto text, password_hash text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.verificar_password(password_texto text, password_hash text) IS 'Verifica si una contraseña coincide con su hash';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria_usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria_usuarios (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    accion character varying(50) NOT NULL,
    descripcion text,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    usuario_ejecutor_id integer,
    ip_address character varying(45),
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auditoria_usuarios_accion_check CHECK (((accion)::text = ANY (ARRAY[('registro'::character varying)::text, ('actualizacion'::character varying)::text, ('baja'::character varying)::text, ('reactivacion'::character varying)::text, ('cambio_password'::character varying)::text, ('cambio_rol'::character varying)::text, ('cambio_permisos'::character varying)::text, ('bloqueo'::character varying)::text, ('desbloqueo'::character varying)::text, ('intento_login_fallido'::character varying)::text])))
);


--
-- Name: TABLE auditoria_usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.auditoria_usuarios IS 'Registro de auditoría de todas las acciones realizadas sobre usuarios';


--
-- Name: COLUMN auditoria_usuarios.accion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_usuarios.accion IS 'Tipo de acción realizada sobre el usuario';


--
-- Name: COLUMN auditoria_usuarios.datos_anteriores; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_usuarios.datos_anteriores IS 'Datos antes de la modificación (formato JSON)';


--
-- Name: COLUMN auditoria_usuarios.datos_nuevos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_usuarios.datos_nuevos IS 'Datos después de la modificación (formato JSON)';


--
-- Name: COLUMN auditoria_usuarios.usuario_ejecutor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.auditoria_usuarios.usuario_ejecutor_id IS 'Usuario que ejecutó la acción (típicamente un admin)';


--
-- Name: auditoria_usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auditoria_usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auditoria_usuarios_id_seq OWNED BY public.auditoria_usuarios.id;


--
-- Name: checklist_catalog_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_catalog_items (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    categoria_id integer,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: checklist_catalog_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklist_catalog_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklist_catalog_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklist_catalog_items_id_seq OWNED BY public.checklist_catalog_items.id;


--
-- Name: checklist_categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    slug character varying(50) NOT NULL,
    icono character varying(50) DEFAULT 'fa-layer-group'::character varying,
    activo boolean DEFAULT true,
    orden integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: checklist_categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklist_categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklist_categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklist_categorias_id_seq OWNED BY public.checklist_categorias.id;


--
-- Name: checklist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_items (
    id integer NOT NULL,
    checklist_id integer NOT NULL,
    descripcion text NOT NULL,
    obligatorio boolean DEFAULT false,
    completado boolean DEFAULT false,
    orden integer DEFAULT 0,
    fecha_completado timestamp without time zone,
    usuario_completo_id integer,
    observaciones text
);


--
-- Name: TABLE checklist_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.checklist_items IS 'Items individuales de las listas de verificación';


--
-- Name: checklist_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklist_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklist_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklist_items_id_seq OWNED BY public.checklist_items.id;


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklists (
    id integer NOT NULL,
    inspeccion_id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    descripcion text,
    completado boolean DEFAULT false,
    progreso_porcentaje numeric(5,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE checklists; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.checklists IS 'Listas de verificación para inspecciones';


--
-- Name: checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklists_id_seq OWNED BY public.checklists.id;


--
-- Name: configuracion_estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_estados (
    id integer NOT NULL,
    valor character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    descripcion text,
    color character varying(7) NOT NULL,
    color_secundario character varying(7),
    icono character varying(10),
    prioridad integer DEFAULT 1,
    disponible_para_reserva boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE configuracion_estados; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.configuracion_estados IS 'Configuración de estados con colores para cuartos y espacios comunes';


--
-- Name: configuracion_estados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_estados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_estados_id_seq OWNED BY public.configuracion_estados.id;


--
-- Name: cuartos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuartos (
    id integer NOT NULL,
    numero character varying(100) NOT NULL,
    edificio_id integer NOT NULL,
    descripcion text,
    estado character varying(50) DEFAULT 'disponible'::character varying,
    piso integer,
    capacidad integer DEFAULT 2,
    tipo_habitacion character varying(50),
    precio_noche numeric(10,2),
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE cuartos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cuartos IS 'Habitaciones y suites del hotel';


--
-- Name: cuartos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cuartos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuartos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cuartos_id_seq OWNED BY public.cuartos.id;


--
-- Name: edificios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edificios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    direccion text,
    total_pisos integer,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE edificios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.edificios IS 'Edificios del hotel';


--
-- Name: edificios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edificios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edificios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edificios_id_seq OWNED BY public.edificios.id;


--
-- Name: espacios_comunes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.espacios_comunes (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    edificio_id integer NOT NULL,
    tipo character varying(50) NOT NULL,
    descripcion text,
    estado character varying(50) DEFAULT 'disponible'::character varying,
    capacidad integer,
    horario_apertura time without time zone,
    horario_cierre time without time zone,
    activo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE espacios_comunes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.espacios_comunes IS 'Espacios comunes del hotel (gimnasio, piscina, restaurante, etc.)';


--
-- Name: espacios_comunes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.espacios_comunes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: espacios_comunes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.espacios_comunes_id_seq OWNED BY public.espacios_comunes.id;


--
-- Name: evidencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evidencias (
    id integer NOT NULL,
    inspeccion_id integer NOT NULL,
    tipo character varying(20),
    url text NOT NULL,
    nombre_archivo character varying(255),
    tamano_bytes bigint,
    mime_type character varying(100),
    descripcion text,
    fecha_subida timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuario_subida_id integer,
    CONSTRAINT evidencias_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('foto'::character varying)::text, ('video'::character varying)::text, ('archivo'::character varying)::text, ('audio'::character varying)::text])))
);


--
-- Name: TABLE evidencias; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.evidencias IS 'Evidencias fotográficas y documentales de inspecciones';


--
-- Name: evidencias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evidencias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evidencias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evidencias_id_seq OWNED BY public.evidencias.id;


--
-- Name: firmas_digitales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firmas_digitales (
    id integer NOT NULL,
    inspeccion_id integer NOT NULL,
    firma_url text NOT NULL,
    nombre_tecnico character varying(100) NOT NULL,
    cargo character varying(100),
    fecha_firma timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address character varying(45),
    dispositivo character varying(200)
);


--
-- Name: TABLE firmas_digitales; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.firmas_digitales IS 'Firmas digitales de técnicos en inspecciones';


--
-- Name: firmas_digitales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.firmas_digitales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: firmas_digitales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.firmas_digitales_id_seq OWNED BY public.firmas_digitales.id;


--
-- Name: historial_passwords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_passwords (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    password_hash character varying(255) NOT NULL,
    fecha_cambio timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cambiado_por_admin boolean DEFAULT false,
    admin_id integer,
    motivo text
);


--
-- Name: TABLE historial_passwords; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.historial_passwords IS 'Historial de cambios de contraseña para prevenir reutilización';


--
-- Name: COLUMN historial_passwords.cambiado_por_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.historial_passwords.cambiado_por_admin IS 'Indica si el cambio fue forzado por un administrador';


--
-- Name: historial_passwords_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_passwords_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_passwords_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_passwords_id_seq OWNED BY public.historial_passwords.id;


--
-- Name: inspecciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inspecciones (
    id integer NOT NULL,
    mantenimiento_id integer NOT NULL,
    tecnico_id integer NOT NULL,
    fecha_inspeccion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resultado character varying(50),
    observaciones text,
    firma_capturada boolean DEFAULT false,
    duracion_minutos integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inspecciones_resultado_check CHECK (((resultado)::text = ANY (ARRAY[('aprobado'::character varying)::text, ('rechazado'::character varying)::text, ('requiere_seguimiento'::character varying)::text])))
);


--
-- Name: TABLE inspecciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.inspecciones IS 'Inspecciones realizadas a los mantenimientos';


--
-- Name: inspecciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inspecciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inspecciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inspecciones_id_seq OWNED BY public.inspecciones.id;


--
-- Name: mantenimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mantenimientos (
    id integer NOT NULL,
    cuarto_id integer,
    espacio_comun_id integer,
    descripcion text NOT NULL,
    tipo character varying(50) DEFAULT 'normal'::character varying,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    prioridad character varying(20) DEFAULT 'media'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_programada date,
    fecha_inicio timestamp without time zone,
    fecha_finalizacion timestamp without time zone,
    hora time without time zone,
    alerta_emitida boolean DEFAULT false,
    usuario_creador_id integer,
    usuario_asignado_id integer,
    costo_estimado numeric(10,2),
    costo_real numeric(10,2),
    notas text,
    dia_alerta date,
    tarea_id integer,
    CONSTRAINT mantenimientos_check CHECK ((((cuarto_id IS NOT NULL) AND (espacio_comun_id IS NULL)) OR ((cuarto_id IS NULL) AND (espacio_comun_id IS NOT NULL)))),
    CONSTRAINT mantenimientos_estado_check CHECK (((estado)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('en_proceso'::character varying)::text, ('completado'::character varying)::text, ('cancelado'::character varying)::text]))),
    CONSTRAINT mantenimientos_prioridad_check CHECK (((prioridad)::text = ANY (ARRAY[('baja'::character varying)::text, ('media'::character varying)::text, ('alta'::character varying)::text, ('urgente'::character varying)::text]))),
    CONSTRAINT mantenimientos_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('normal'::character varying)::text, ('rutina'::character varying)::text, ('preventivo'::character varying)::text, ('correctivo'::character varying)::text, ('emergencia'::character varying)::text])))
);


--
-- Name: TABLE mantenimientos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mantenimientos IS 'Registros de mantenimiento programado y ejecutado';


--
-- Name: COLUMN mantenimientos.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mantenimientos.tipo IS 'Tipo de mantenimiento: normal, rutina, preventivo, correctivo, emergencia';


--
-- Name: COLUMN mantenimientos.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mantenimientos.estado IS 'Estado del mantenimiento: pendiente, en_proceso, completado, cancelado';


--
-- Name: COLUMN mantenimientos.prioridad; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mantenimientos.prioridad IS 'Prioridad del mantenimiento: baja, media, alta, urgente';


--
-- Name: COLUMN mantenimientos.alerta_emitida; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mantenimientos.alerta_emitida IS 'Indica si la alerta del mes actual ya fue emitida';


--
-- Name: mantenimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mantenimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mantenimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mantenimientos_id_seq OWNED BY public.mantenimientos.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    permisos jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roles IS 'Roles de usuario del sistema (ADMIN, SUPERVISOR, TECNICO)';


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: room_checklist_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_checklist_results (
    id integer NOT NULL,
    cuarto_id integer,
    catalog_item_id integer,
    nombre_snapshot character varying(100),
    categoria_id integer,
    estado character varying(20) DEFAULT 'bueno'::character varying NOT NULL,
    observacion text,
    foto_url text,
    ultimo_editor_id integer,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT room_checklist_results_estado_check CHECK (((estado)::text = ANY ((ARRAY['bueno'::character varying, 'regular'::character varying, 'malo'::character varying])::text[])))
);


--
-- Name: room_checklist_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.room_checklist_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: room_checklist_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.room_checklist_results_id_seq OWNED BY public.room_checklist_results.id;


--
-- Name: room_checklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.room_checklists (
    id integer NOT NULL,
    cuarto_id integer,
    usuario_id integer,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    observaciones_generales text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT room_checklists_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_progreso'::character varying, 'completado'::character varying, 'cancelado'::character varying])::text[])))
);


--
-- Name: room_checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.room_checklists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: room_checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.room_checklists_id_seq OWNED BY public.room_checklists.id;


--
-- Name: sabanas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sabanas (
    id integer NOT NULL,
    nombre character varying(200) NOT NULL,
    servicio_id character varying(100) NOT NULL,
    servicio_nombre character varying(200) NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_archivado timestamp without time zone,
    archivada boolean DEFAULT false,
    total_items integer DEFAULT 0,
    items_completados integer DEFAULT 0,
    progreso_porcentaje numeric(5,2) DEFAULT 0.00,
    usuario_creador_id integer,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE sabanas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sabanas IS 'Tabla principal de sábanas de servicios';


--
-- Name: COLUMN sabanas.archivada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sabanas.archivada IS 'Indica si la sábana está archivada (solo lectura)';


--
-- Name: COLUMN sabanas.progreso_porcentaje; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sabanas.progreso_porcentaje IS 'Porcentaje de items completados (0-100)';


--
-- Name: sabanas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sabanas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sabanas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sabanas_id_seq OWNED BY public.sabanas.id;


--
-- Name: sabanas_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sabanas_items (
    id integer NOT NULL,
    sabana_id integer NOT NULL,
    cuarto_id integer NOT NULL,
    habitacion character varying(100) NOT NULL,
    edificio character varying(100) NOT NULL,
    edificio_id integer,
    fecha_programada date NOT NULL,
    fecha_realizado timestamp without time zone,
    responsable character varying(200) DEFAULT NULL::character varying,
    usuario_responsable_id integer,
    observaciones text,
    realizado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tarea_id integer
);


--
-- Name: TABLE sabanas_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sabanas_items IS 'Items individuales (habitaciones) de cada sábana';


--
-- Name: COLUMN sabanas_items.usuario_responsable_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sabanas_items.usuario_responsable_id IS 'Usuario que marcó el item como realizado';


--
-- Name: COLUMN sabanas_items.realizado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sabanas_items.realizado IS 'Indica si el servicio se realizó en esta habitación';


--
-- Name: sabanas_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sabanas_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sabanas_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sabanas_items_id_seq OWNED BY public.sabanas_items.id;


--
-- Name: sesiones_usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesiones_usuarios (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    token_sesion character varying(255) NOT NULL,
    jwt_token text,
    refresh_token text,
    jwt_expiracion timestamp without time zone,
    refresh_expiracion timestamp without time zone,
    fecha_login timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_logout timestamp without time zone,
    ip_address character varying(45),
    user_agent text,
    dispositivo character varying(200),
    sistema_operativo character varying(100),
    navegador character varying(100),
    ubicacion_geografica character varying(255),
    duracion_minutos integer,
    activa boolean DEFAULT true,
    cerrada_por character varying(20),
    notas text,
    CONSTRAINT sesiones_usuarios_cerrada_por_check CHECK (((cerrada_por)::text = ANY (ARRAY[('usuario'::character varying)::text, ('sistema'::character varying)::text, ('admin'::character varying)::text, ('timeout'::character varying)::text, ('expiracion'::character varying)::text])))
);


--
-- Name: TABLE sesiones_usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sesiones_usuarios IS 'Registro completo de todas las sesiones de usuarios (login/logout) con JWT';


--
-- Name: COLUMN sesiones_usuarios.jwt_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.jwt_token IS 'Token JWT para autenticación';


--
-- Name: COLUMN sesiones_usuarios.refresh_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.refresh_token IS 'Token de refresco para renovar JWT';


--
-- Name: COLUMN sesiones_usuarios.jwt_expiracion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.jwt_expiracion IS 'Fecha de expiración del JWT';


--
-- Name: COLUMN sesiones_usuarios.refresh_expiracion; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.refresh_expiracion IS 'Fecha de expiración del refresh token';


--
-- Name: COLUMN sesiones_usuarios.fecha_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.fecha_login IS 'Momento exacto en que el usuario inició sesión (login)';


--
-- Name: COLUMN sesiones_usuarios.fecha_logout; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.fecha_logout IS 'Momento exacto en que el usuario cerró sesión (logout)';


--
-- Name: COLUMN sesiones_usuarios.duracion_minutos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.duracion_minutos IS 'Duración total de la sesión en minutos';


--
-- Name: COLUMN sesiones_usuarios.activa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.activa IS 'Indica si la sesión sigue activa';


--
-- Name: COLUMN sesiones_usuarios.cerrada_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sesiones_usuarios.cerrada_por IS 'Indica cómo se cerró la sesión';


--
-- Name: sesiones_usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sesiones_usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sesiones_usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sesiones_usuarios_id_seq OWNED BY public.sesiones_usuarios.id;


--
-- Name: tareas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tareas (
    id integer NOT NULL,
    titulo character varying(255) NOT NULL,
    descripcion text,
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    prioridad character varying(50) DEFAULT 'media'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento date,
    creado_por integer,
    asignado_a integer,
    ubicacion character varying(255),
    tags text[],
    archivos text[]
);


--
-- Name: tareas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tareas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tareas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tareas_id_seq OWNED BY public.tareas.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(100),
    password_hash character varying(255),
    rol_id integer NOT NULL,
    activo boolean DEFAULT true,
    ultimo_acceso timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_baja timestamp without time zone,
    motivo_baja text,
    usuario_baja_id integer,
    telefono character varying(20),
    departamento character varying(100),
    numero_empleado character varying(50),
    foto_perfil_url text,
    ultimo_cambio_password timestamp without time zone,
    requiere_cambio_password boolean DEFAULT false,
    intentos_fallidos integer DEFAULT 0,
    bloqueado_hasta timestamp without time zone,
    notas_admin text
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema con sus roles y permisos';


--
-- Name: COLUMN usuarios.activo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.activo IS 'Indica si el usuario está activo en el sistema (no dado de baja)';


--
-- Name: COLUMN usuarios.ultimo_acceso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.ultimo_acceso IS 'Última vez que el usuario inició sesión (login) exitosamente';


--
-- Name: COLUMN usuarios.fecha_registro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.fecha_registro IS 'Fecha en que el usuario fue registrado (sign-in) en el sistema';


--
-- Name: COLUMN usuarios.fecha_baja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.fecha_baja IS 'Fecha en que el usuario fue dado de baja (sign-out) del sistema';


--
-- Name: COLUMN usuarios.motivo_baja; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.motivo_baja IS 'Razón por la cual el usuario fue dado de baja';


--
-- Name: COLUMN usuarios.usuario_baja_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.usuario_baja_id IS 'Usuario administrador que dio de baja a este usuario';


--
-- Name: COLUMN usuarios.intentos_fallidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.intentos_fallidos IS 'Contador de intentos fallidos de login consecutivos';


--
-- Name: COLUMN usuarios.bloqueado_hasta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.bloqueado_hasta IS 'Fecha hasta la cual el usuario está bloqueado por intentos fallidos';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vista_actividad_reciente; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_actividad_reciente AS
 SELECT a.id,
    a.usuario_id,
    u.nombre AS usuario_nombre,
    u.email AS usuario_email,
    a.accion,
    a.descripcion,
    a.fecha_hora,
    ue.nombre AS ejecutor_nombre,
    a.ip_address
   FROM ((public.auditoria_usuarios a
     LEFT JOIN public.usuarios u ON ((a.usuario_id = u.id)))
     LEFT JOIN public.usuarios ue ON ((a.usuario_ejecutor_id = ue.id)))
  ORDER BY a.fecha_hora DESC;


--
-- Name: vista_checklist_cuartos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_checklist_cuartos AS
 SELECT c.id AS cuarto_id,
    c.numero,
    c.estado AS estado_cuarto,
    e.id AS edificio_id,
    e.nombre AS edificio_nombre,
    ci.id AS item_id,
    ci.nombre AS item_nombre,
    ci.orden AS item_orden,
    cat.id AS categoria_id,
    cat.slug AS categoria_slug,
    cat.nombre AS categoria_nombre,
    cat.icono AS categoria_icono,
    cat.orden AS categoria_orden,
    COALESCE(rcr.estado, 'bueno'::character varying) AS item_estado,
    rcr.observacion,
    rcr.foto_url,
    rcr.updated_at AS fecha_ultima_edicion,
    u.nombre AS ultimo_editor
   FROM (((((public.cuartos c
     LEFT JOIN public.edificios e ON ((c.edificio_id = e.id)))
     CROSS JOIN public.checklist_catalog_items ci)
     LEFT JOIN public.checklist_categorias cat ON ((ci.categoria_id = cat.id)))
     LEFT JOIN public.room_checklist_results rcr ON (((rcr.cuarto_id = c.id) AND (rcr.catalog_item_id = ci.id))))
     LEFT JOIN public.usuarios u ON ((rcr.ultimo_editor_id = u.id)))
  WHERE ((ci.activo = true) AND ((cat.activo = true) OR (cat.activo IS NULL)))
  ORDER BY c.numero, cat.orden, ci.orden;


--
-- Name: vista_cuartos_completa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_cuartos_completa AS
 SELECT c.id,
    c.numero,
    c.descripcion,
    c.estado,
    c.piso,
    c.capacidad,
    c.tipo_habitacion,
    c.precio_noche,
    c.activo,
    e.id AS edificio_id,
    e.nombre AS edificio_nombre,
    ce.label AS estado_label,
    ce.color AS estado_color,
    ce.color_secundario AS estado_color_secundario,
    ce.icono AS estado_icono,
    c.created_at,
    c.updated_at
   FROM ((public.cuartos c
     LEFT JOIN public.edificios e ON ((c.edificio_id = e.id)))
     LEFT JOIN public.configuracion_estados ce ON (((c.estado)::text = (ce.valor)::text)));


--
-- Name: vista_espacios_comunes_completa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_espacios_comunes_completa AS
 SELECT ec.id,
    ec.nombre,
    ec.tipo,
    ec.descripcion,
    ec.estado,
    ec.capacidad,
    ec.horario_apertura,
    ec.horario_cierre,
    ec.activo,
    e.id AS edificio_id,
    e.nombre AS edificio_nombre,
    ce.label AS estado_label,
    ce.color AS estado_color,
    ce.color_secundario AS estado_color_secundario,
    ce.icono AS estado_icono,
    ec.created_at,
    ec.updated_at
   FROM ((public.espacios_comunes ec
     LEFT JOIN public.edificios e ON ((ec.edificio_id = e.id)))
     LEFT JOIN public.configuracion_estados ce ON (((ec.estado)::text = (ce.valor)::text)));


--
-- Name: vista_inspecciones_completa; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_inspecciones_completa AS
 SELECT i.id,
    i.mantenimiento_id,
    i.fecha_inspeccion,
    i.resultado,
    i.observaciones,
    i.firma_capturada,
    i.duracion_minutos,
    u.id AS tecnico_id,
    u.nombre AS tecnico_nombre,
    u.email AS tecnico_email,
    m.descripcion AS mantenimiento_descripcion,
    m.tipo AS mantenimiento_tipo,
    m.estado AS mantenimiento_estado,
    ( SELECT count(*) AS count
           FROM public.checklists
          WHERE (checklists.inspeccion_id = i.id)) AS total_checklists,
    ( SELECT count(*) AS count
           FROM public.evidencias
          WHERE (evidencias.inspeccion_id = i.id)) AS total_evidencias,
    ( SELECT count(*) AS count
           FROM public.firmas_digitales
          WHERE (firmas_digitales.inspeccion_id = i.id)) AS tiene_firma
   FROM ((public.inspecciones i
     LEFT JOIN public.usuarios u ON ((i.tecnico_id = u.id)))
     LEFT JOIN public.mantenimientos m ON ((i.mantenimiento_id = m.id)));


--
-- Name: vista_sesiones_activas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_sesiones_activas AS
 SELECT s.id,
    s.usuario_id,
    u.nombre AS usuario_nombre,
    u.email AS usuario_email,
    r.nombre AS usuario_rol,
    s.fecha_login,
    s.ip_address,
    s.dispositivo,
    s.navegador,
    s.sistema_operativo,
    (EXTRACT(epoch FROM (CURRENT_TIMESTAMP - (s.fecha_login)::timestamp with time zone)) / (60)::numeric) AS minutos_activa
   FROM ((public.sesiones_usuarios s
     LEFT JOIN public.usuarios u ON ((s.usuario_id = u.id)))
     LEFT JOIN public.roles r ON ((u.rol_id = r.id)))
  WHERE (s.activa = true)
  ORDER BY s.fecha_login DESC;


--
-- Name: vista_usuarios_activos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_usuarios_activos AS
 SELECT u.id,
    u.numero_empleado,
    u.nombre,
    u.email,
    u.telefono,
    u.departamento,
    r.nombre AS rol_nombre,
    u.activo,
    u.fecha_registro,
    u.ultimo_acceso,
    u.intentos_fallidos,
    u.bloqueado_hasta,
    ( SELECT count(*) AS count
           FROM public.sesiones_usuarios
          WHERE (sesiones_usuarios.usuario_id = u.id)) AS total_sesiones,
    ( SELECT sesiones_usuarios.fecha_login
           FROM public.sesiones_usuarios
          WHERE (sesiones_usuarios.usuario_id = u.id)
          ORDER BY sesiones_usuarios.fecha_login DESC
         LIMIT 1) AS ultima_sesion_login,
    ( SELECT sesiones_usuarios.fecha_logout
           FROM public.sesiones_usuarios
          WHERE (sesiones_usuarios.usuario_id = u.id)
          ORDER BY sesiones_usuarios.fecha_logout DESC
         LIMIT 1) AS ultima_sesion_logout,
    ( SELECT count(*) AS count
           FROM public.sesiones_usuarios
          WHERE ((sesiones_usuarios.usuario_id = u.id) AND (sesiones_usuarios.activa = true))) AS sesiones_activas
   FROM (public.usuarios u
     LEFT JOIN public.roles r ON ((u.rol_id = r.id)))
  WHERE ((u.activo = true) AND (u.fecha_baja IS NULL));


--
-- Name: vista_usuarios_inactivos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vista_usuarios_inactivos AS
 SELECT u.id,
    u.numero_empleado,
    u.nombre,
    u.email,
    u.departamento,
    r.nombre AS rol_nombre,
    u.fecha_registro,
    u.fecha_baja,
    u.motivo_baja,
    ub.nombre AS usuario_baja_nombre,
    ub.email AS usuario_baja_email
   FROM ((public.usuarios u
     LEFT JOIN public.roles r ON ((u.rol_id = r.id)))
     LEFT JOIN public.usuarios ub ON ((u.usuario_baja_id = ub.id)))
  WHERE ((u.activo = false) OR (u.fecha_baja IS NOT NULL));


--
-- Name: auditoria_usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios ALTER COLUMN id SET DEFAULT nextval('public.auditoria_usuarios_id_seq'::regclass);


--
-- Name: checklist_catalog_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_catalog_items ALTER COLUMN id SET DEFAULT nextval('public.checklist_catalog_items_id_seq'::regclass);


--
-- Name: checklist_categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_categorias ALTER COLUMN id SET DEFAULT nextval('public.checklist_categorias_id_seq'::regclass);


--
-- Name: checklist_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items ALTER COLUMN id SET DEFAULT nextval('public.checklist_items_id_seq'::regclass);


--
-- Name: checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists ALTER COLUMN id SET DEFAULT nextval('public.checklists_id_seq'::regclass);


--
-- Name: configuracion_estados id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_estados ALTER COLUMN id SET DEFAULT nextval('public.configuracion_estados_id_seq'::regclass);


--
-- Name: cuartos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuartos ALTER COLUMN id SET DEFAULT nextval('public.cuartos_id_seq'::regclass);


--
-- Name: edificios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios ALTER COLUMN id SET DEFAULT nextval('public.edificios_id_seq'::regclass);


--
-- Name: espacios_comunes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.espacios_comunes ALTER COLUMN id SET DEFAULT nextval('public.espacios_comunes_id_seq'::regclass);


--
-- Name: evidencias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidencias ALTER COLUMN id SET DEFAULT nextval('public.evidencias_id_seq'::regclass);


--
-- Name: firmas_digitales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firmas_digitales ALTER COLUMN id SET DEFAULT nextval('public.firmas_digitales_id_seq'::regclass);


--
-- Name: historial_passwords id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_passwords ALTER COLUMN id SET DEFAULT nextval('public.historial_passwords_id_seq'::regclass);


--
-- Name: inspecciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspecciones ALTER COLUMN id SET DEFAULT nextval('public.inspecciones_id_seq'::regclass);


--
-- Name: mantenimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos ALTER COLUMN id SET DEFAULT nextval('public.mantenimientos_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: room_checklist_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results ALTER COLUMN id SET DEFAULT nextval('public.room_checklist_results_id_seq'::regclass);


--
-- Name: room_checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklists ALTER COLUMN id SET DEFAULT nextval('public.room_checklists_id_seq'::regclass);


--
-- Name: sabanas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas ALTER COLUMN id SET DEFAULT nextval('public.sabanas_id_seq'::regclass);


--
-- Name: sabanas_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items ALTER COLUMN id SET DEFAULT nextval('public.sabanas_items_id_seq'::regclass);


--
-- Name: sesiones_usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_usuarios ALTER COLUMN id SET DEFAULT nextval('public.sesiones_usuarios_id_seq'::regclass);


--
-- Name: tareas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas ALTER COLUMN id SET DEFAULT nextval('public.tareas_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: auditoria_usuarios auditoria_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios
    ADD CONSTRAINT auditoria_usuarios_pkey PRIMARY KEY (id);


--
-- Name: checklist_catalog_items checklist_catalog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_catalog_items
    ADD CONSTRAINT checklist_catalog_items_pkey PRIMARY KEY (id);


--
-- Name: checklist_categorias checklist_categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_categorias
    ADD CONSTRAINT checklist_categorias_nombre_key UNIQUE (nombre);


--
-- Name: checklist_categorias checklist_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_categorias
    ADD CONSTRAINT checklist_categorias_pkey PRIMARY KEY (id);


--
-- Name: checklist_categorias checklist_categorias_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_categorias
    ADD CONSTRAINT checklist_categorias_slug_key UNIQUE (slug);


--
-- Name: checklist_items checklist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: configuracion_estados configuracion_estados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_estados
    ADD CONSTRAINT configuracion_estados_pkey PRIMARY KEY (id);


--
-- Name: configuracion_estados configuracion_estados_valor_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_estados
    ADD CONSTRAINT configuracion_estados_valor_key UNIQUE (valor);


--
-- Name: cuartos cuartos_numero_edificio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuartos
    ADD CONSTRAINT cuartos_numero_edificio_id_key UNIQUE (numero, edificio_id);


--
-- Name: cuartos cuartos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuartos
    ADD CONSTRAINT cuartos_pkey PRIMARY KEY (id);


--
-- Name: edificios edificios_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_nombre_key UNIQUE (nombre);


--
-- Name: edificios edificios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edificios
    ADD CONSTRAINT edificios_pkey PRIMARY KEY (id);


--
-- Name: espacios_comunes espacios_comunes_nombre_edificio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.espacios_comunes
    ADD CONSTRAINT espacios_comunes_nombre_edificio_id_key UNIQUE (nombre, edificio_id);


--
-- Name: espacios_comunes espacios_comunes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.espacios_comunes
    ADD CONSTRAINT espacios_comunes_pkey PRIMARY KEY (id);


--
-- Name: evidencias evidencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidencias
    ADD CONSTRAINT evidencias_pkey PRIMARY KEY (id);


--
-- Name: firmas_digitales firmas_digitales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firmas_digitales
    ADD CONSTRAINT firmas_digitales_pkey PRIMARY KEY (id);


--
-- Name: historial_passwords historial_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_passwords
    ADD CONSTRAINT historial_passwords_pkey PRIMARY KEY (id);


--
-- Name: inspecciones inspecciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_pkey PRIMARY KEY (id);


--
-- Name: mantenimientos mantenimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_pkey PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: room_checklist_results room_checklist_results_cuarto_id_catalog_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results
    ADD CONSTRAINT room_checklist_results_cuarto_id_catalog_item_id_key UNIQUE (cuarto_id, catalog_item_id);


--
-- Name: room_checklist_results room_checklist_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results
    ADD CONSTRAINT room_checklist_results_pkey PRIMARY KEY (id);


--
-- Name: room_checklists room_checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklists
    ADD CONSTRAINT room_checklists_pkey PRIMARY KEY (id);


--
-- Name: sabanas_items sabanas_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items
    ADD CONSTRAINT sabanas_items_pkey PRIMARY KEY (id);


--
-- Name: sabanas sabanas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas
    ADD CONSTRAINT sabanas_pkey PRIMARY KEY (id);


--
-- Name: sesiones_usuarios sesiones_usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_usuarios
    ADD CONSTRAINT sesiones_usuarios_pkey PRIMARY KEY (id);


--
-- Name: sesiones_usuarios sesiones_usuarios_token_sesion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_usuarios
    ADD CONSTRAINT sesiones_usuarios_token_sesion_key UNIQUE (token_sesion);


--
-- Name: tareas tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_numero_empleado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_numero_empleado_key UNIQUE (numero_empleado);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_auditoria_accion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_accion ON public.auditoria_usuarios USING btree (accion);


--
-- Name: idx_auditoria_ejecutor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_ejecutor ON public.auditoria_usuarios USING btree (usuario_ejecutor_id);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_fecha ON public.auditoria_usuarios USING btree (fecha_hora DESC);


--
-- Name: idx_auditoria_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auditoria_usuario ON public.auditoria_usuarios USING btree (usuario_id);


--
-- Name: idx_checklist_catalog_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_catalog_categoria ON public.checklist_catalog_items USING btree (categoria_id);


--
-- Name: idx_checklist_items_checklist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_items_checklist ON public.checklist_items USING btree (checklist_id);


--
-- Name: idx_checklist_items_completado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_items_completado ON public.checklist_items USING btree (completado);


--
-- Name: idx_checklist_items_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_items_orden ON public.checklist_items USING btree (orden);


--
-- Name: idx_checklist_results_cuarto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_results_cuarto ON public.room_checklist_results USING btree (cuarto_id);


--
-- Name: idx_checklist_results_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklist_results_estado ON public.room_checklist_results USING btree (estado);


--
-- Name: idx_checklists_completado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_completado ON public.checklists USING btree (completado);


--
-- Name: idx_checklists_inspeccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_inspeccion ON public.checklists USING btree (inspeccion_id);


--
-- Name: idx_config_estados_valor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_config_estados_valor ON public.configuracion_estados USING btree (valor);


--
-- Name: idx_cuartos_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuartos_activo ON public.cuartos USING btree (activo);


--
-- Name: idx_cuartos_edificio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuartos_edificio ON public.cuartos USING btree (edificio_id);


--
-- Name: idx_cuartos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuartos_estado ON public.cuartos USING btree (estado);


--
-- Name: idx_cuartos_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuartos_numero ON public.cuartos USING btree (numero);


--
-- Name: idx_cuartos_piso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cuartos_piso ON public.cuartos USING btree (piso);


--
-- Name: idx_edificios_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_edificios_activo ON public.edificios USING btree (activo);


--
-- Name: idx_edificios_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_edificios_nombre ON public.edificios USING btree (nombre);


--
-- Name: idx_espacios_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_espacios_activo ON public.espacios_comunes USING btree (activo);


--
-- Name: idx_espacios_edificio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_espacios_edificio ON public.espacios_comunes USING btree (edificio_id);


--
-- Name: idx_espacios_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_espacios_estado ON public.espacios_comunes USING btree (estado);


--
-- Name: idx_espacios_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_espacios_tipo ON public.espacios_comunes USING btree (tipo);


--
-- Name: idx_evidencias_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidencias_fecha ON public.evidencias USING btree (fecha_subida DESC);


--
-- Name: idx_evidencias_inspeccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidencias_inspeccion ON public.evidencias USING btree (inspeccion_id);


--
-- Name: idx_evidencias_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evidencias_tipo ON public.evidencias USING btree (tipo);


--
-- Name: idx_firmas_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firmas_fecha ON public.firmas_digitales USING btree (fecha_firma DESC);


--
-- Name: idx_firmas_inspeccion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firmas_inspeccion ON public.firmas_digitales USING btree (inspeccion_id);


--
-- Name: idx_historial_passwords_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_passwords_fecha ON public.historial_passwords USING btree (fecha_cambio DESC);


--
-- Name: idx_historial_passwords_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_passwords_usuario ON public.historial_passwords USING btree (usuario_id);


--
-- Name: idx_inspecciones_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspecciones_fecha ON public.inspecciones USING btree (fecha_inspeccion DESC);


--
-- Name: idx_inspecciones_mantenimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspecciones_mantenimiento ON public.inspecciones USING btree (mantenimiento_id);


--
-- Name: idx_inspecciones_resultado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspecciones_resultado ON public.inspecciones USING btree (resultado);


--
-- Name: idx_inspecciones_tecnico; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inspecciones_tecnico ON public.inspecciones USING btree (tecnico_id);


--
-- Name: idx_mantenimientos_cuarto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_cuarto ON public.mantenimientos USING btree (cuarto_id);


--
-- Name: idx_mantenimientos_espacio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_espacio ON public.mantenimientos USING btree (espacio_comun_id);


--
-- Name: idx_mantenimientos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_estado ON public.mantenimientos USING btree (estado);


--
-- Name: idx_mantenimientos_fecha_creacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_fecha_creacion ON public.mantenimientos USING btree (fecha_creacion DESC);


--
-- Name: idx_mantenimientos_fecha_programada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_fecha_programada ON public.mantenimientos USING btree (fecha_programada);


--
-- Name: idx_mantenimientos_prioridad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_prioridad ON public.mantenimientos USING btree (prioridad);


--
-- Name: idx_mantenimientos_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_tipo ON public.mantenimientos USING btree (tipo);


--
-- Name: idx_mantenimientos_usuario_asignado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mantenimientos_usuario_asignado ON public.mantenimientos USING btree (usuario_asignado_id);


--
-- Name: idx_sabanas_archivada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_archivada ON public.sabanas USING btree (archivada);


--
-- Name: idx_sabanas_fecha_creacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_fecha_creacion ON public.sabanas USING btree (fecha_creacion DESC);


--
-- Name: idx_sabanas_items_cuarto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_items_cuarto_id ON public.sabanas_items USING btree (cuarto_id);


--
-- Name: idx_sabanas_items_edificio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_items_edificio_id ON public.sabanas_items USING btree (edificio_id);


--
-- Name: idx_sabanas_items_fecha_realizado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_items_fecha_realizado ON public.sabanas_items USING btree (fecha_realizado);


--
-- Name: idx_sabanas_items_realizado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_items_realizado ON public.sabanas_items USING btree (realizado);


--
-- Name: idx_sabanas_items_sabana_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_items_sabana_id ON public.sabanas_items USING btree (sabana_id);


--
-- Name: idx_sabanas_servicio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_servicio_id ON public.sabanas USING btree (servicio_id);


--
-- Name: idx_sabanas_usuario_creador; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sabanas_usuario_creador ON public.sabanas USING btree (usuario_creador_id);


--
-- Name: idx_sesiones_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_activa ON public.sesiones_usuarios USING btree (activa) WHERE (activa = true);


--
-- Name: idx_sesiones_fecha_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_fecha_login ON public.sesiones_usuarios USING btree (fecha_login DESC);


--
-- Name: idx_sesiones_fecha_logout; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_fecha_logout ON public.sesiones_usuarios USING btree (fecha_logout DESC);


--
-- Name: idx_sesiones_jwt_expiracion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_jwt_expiracion ON public.sesiones_usuarios USING btree (jwt_expiracion) WHERE (activa = true);


--
-- Name: idx_sesiones_jwt_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_jwt_token ON public.sesiones_usuarios USING btree (jwt_token);


--
-- Name: idx_sesiones_refresh_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_refresh_token ON public.sesiones_usuarios USING btree (refresh_token);


--
-- Name: idx_sesiones_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_token ON public.sesiones_usuarios USING btree (token_sesion);


--
-- Name: idx_sesiones_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesiones_usuario ON public.sesiones_usuarios USING btree (usuario_id);


--
-- Name: idx_usuarios_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_activo ON public.usuarios USING btree (activo);


--
-- Name: idx_usuarios_bloqueado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_bloqueado ON public.usuarios USING btree (bloqueado_hasta) WHERE (bloqueado_hasta IS NOT NULL);


--
-- Name: idx_usuarios_departamento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_departamento ON public.usuarios USING btree (departamento);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: idx_usuarios_fecha_baja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_fecha_baja ON public.usuarios USING btree (fecha_baja);


--
-- Name: idx_usuarios_fecha_registro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_fecha_registro ON public.usuarios USING btree (fecha_registro DESC);


--
-- Name: idx_usuarios_numero_empleado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_numero_empleado ON public.usuarios USING btree (numero_empleado);


--
-- Name: idx_usuarios_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_rol ON public.usuarios USING btree (rol_id);


--
-- Name: checklists trigger_actualizar_checklists; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_checklists BEFORE UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: cuartos trigger_actualizar_cuartos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_cuartos BEFORE UPDATE ON public.cuartos FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: edificios trigger_actualizar_edificios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_edificios BEFORE UPDATE ON public.edificios FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: espacios_comunes trigger_actualizar_espacios_comunes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_espacios_comunes BEFORE UPDATE ON public.espacios_comunes FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: checklist_items trigger_actualizar_progreso; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_progreso AFTER INSERT OR UPDATE OF completado ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_progreso_checklist();


--
-- Name: sabanas_items trigger_actualizar_progreso_sabana_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_progreso_sabana_delete AFTER DELETE ON public.sabanas_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_progreso_sabana();


--
-- Name: sabanas_items trigger_actualizar_progreso_sabana_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_progreso_sabana_insert AFTER INSERT ON public.sabanas_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_progreso_sabana();


--
-- Name: sabanas_items trigger_actualizar_progreso_sabana_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_progreso_sabana_update AFTER UPDATE ON public.sabanas_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_progreso_sabana();


--
-- Name: sesiones_usuarios trigger_actualizar_ultimo_acceso; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_ultimo_acceso AFTER INSERT ON public.sesiones_usuarios FOR EACH ROW EXECUTE FUNCTION public.actualizar_ultimo_acceso();


--
-- Name: usuarios trigger_actualizar_usuarios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_actualizar_usuarios BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: usuarios trigger_auditoria_usuarios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auditoria_usuarios AFTER INSERT OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_usuario();


--
-- Name: sesiones_usuarios trigger_duracion_sesion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_duracion_sesion BEFORE UPDATE OF fecha_logout ON public.sesiones_usuarios FOR EACH ROW EXECUTE FUNCTION public.calcular_duracion_sesion();


--
-- Name: sabanas_items trigger_sabanas_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sabanas_items_updated_at BEFORE UPDATE ON public.sabanas_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: sabanas trigger_sabanas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sabanas_updated_at BEFORE UPDATE ON public.sabanas FOR EACH ROW EXECUTE FUNCTION public.actualizar_updated_at();


--
-- Name: auditoria_usuarios auditoria_usuarios_usuario_ejecutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios
    ADD CONSTRAINT auditoria_usuarios_usuario_ejecutor_id_fkey FOREIGN KEY (usuario_ejecutor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: auditoria_usuarios auditoria_usuarios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria_usuarios
    ADD CONSTRAINT auditoria_usuarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: checklist_catalog_items checklist_catalog_items_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_catalog_items
    ADD CONSTRAINT checklist_catalog_items_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.checklist_categorias(id) ON DELETE SET NULL;


--
-- Name: checklist_items checklist_items_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.checklists(id) ON DELETE CASCADE;


--
-- Name: checklist_items checklist_items_usuario_completo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_items
    ADD CONSTRAINT checklist_items_usuario_completo_id_fkey FOREIGN KEY (usuario_completo_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: checklists checklists_inspeccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_inspeccion_id_fkey FOREIGN KEY (inspeccion_id) REFERENCES public.inspecciones(id) ON DELETE CASCADE;


--
-- Name: cuartos cuartos_edificio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuartos
    ADD CONSTRAINT cuartos_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.edificios(id) ON DELETE CASCADE;


--
-- Name: cuartos cuartos_estado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuartos
    ADD CONSTRAINT cuartos_estado_fkey FOREIGN KEY (estado) REFERENCES public.configuracion_estados(valor) ON DELETE RESTRICT;


--
-- Name: espacios_comunes espacios_comunes_edificio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.espacios_comunes
    ADD CONSTRAINT espacios_comunes_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.edificios(id) ON DELETE CASCADE;


--
-- Name: espacios_comunes espacios_comunes_estado_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.espacios_comunes
    ADD CONSTRAINT espacios_comunes_estado_fkey FOREIGN KEY (estado) REFERENCES public.configuracion_estados(valor) ON DELETE RESTRICT;


--
-- Name: evidencias evidencias_inspeccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidencias
    ADD CONSTRAINT evidencias_inspeccion_id_fkey FOREIGN KEY (inspeccion_id) REFERENCES public.inspecciones(id) ON DELETE CASCADE;


--
-- Name: evidencias evidencias_usuario_subida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidencias
    ADD CONSTRAINT evidencias_usuario_subida_id_fkey FOREIGN KEY (usuario_subida_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: firmas_digitales firmas_digitales_inspeccion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firmas_digitales
    ADD CONSTRAINT firmas_digitales_inspeccion_id_fkey FOREIGN KEY (inspeccion_id) REFERENCES public.inspecciones(id) ON DELETE CASCADE;


--
-- Name: historial_passwords historial_passwords_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_passwords
    ADD CONSTRAINT historial_passwords_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: historial_passwords historial_passwords_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_passwords
    ADD CONSTRAINT historial_passwords_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: inspecciones inspecciones_mantenimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_mantenimiento_id_fkey FOREIGN KEY (mantenimiento_id) REFERENCES public.mantenimientos(id) ON DELETE CASCADE;


--
-- Name: inspecciones inspecciones_tecnico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inspecciones
    ADD CONSTRAINT inspecciones_tecnico_id_fkey FOREIGN KEY (tecnico_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: mantenimientos mantenimientos_cuarto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_cuarto_id_fkey FOREIGN KEY (cuarto_id) REFERENCES public.cuartos(id) ON DELETE CASCADE;


--
-- Name: mantenimientos mantenimientos_espacio_comun_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_espacio_comun_id_fkey FOREIGN KEY (espacio_comun_id) REFERENCES public.espacios_comunes(id) ON DELETE CASCADE;


--
-- Name: mantenimientos mantenimientos_tarea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_tarea_id_fkey FOREIGN KEY (tarea_id) REFERENCES public.tareas(id) ON DELETE SET NULL;


--
-- Name: mantenimientos mantenimientos_usuario_asignado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_usuario_asignado_id_fkey FOREIGN KEY (usuario_asignado_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: mantenimientos mantenimientos_usuario_creador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mantenimientos
    ADD CONSTRAINT mantenimientos_usuario_creador_id_fkey FOREIGN KEY (usuario_creador_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: room_checklist_results room_checklist_results_catalog_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results
    ADD CONSTRAINT room_checklist_results_catalog_item_id_fkey FOREIGN KEY (catalog_item_id) REFERENCES public.checklist_catalog_items(id) ON DELETE CASCADE;


--
-- Name: room_checklist_results room_checklist_results_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results
    ADD CONSTRAINT room_checklist_results_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.checklist_categorias(id) ON DELETE SET NULL;


--
-- Name: room_checklist_results room_checklist_results_cuarto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results
    ADD CONSTRAINT room_checklist_results_cuarto_id_fkey FOREIGN KEY (cuarto_id) REFERENCES public.cuartos(id) ON DELETE CASCADE;


--
-- Name: room_checklist_results room_checklist_results_ultimo_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklist_results
    ADD CONSTRAINT room_checklist_results_ultimo_editor_id_fkey FOREIGN KEY (ultimo_editor_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: room_checklists room_checklists_cuarto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklists
    ADD CONSTRAINT room_checklists_cuarto_id_fkey FOREIGN KEY (cuarto_id) REFERENCES public.cuartos(id) ON DELETE CASCADE;


--
-- Name: room_checklists room_checklists_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.room_checklists
    ADD CONSTRAINT room_checklists_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: sabanas_items sabanas_items_cuarto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items
    ADD CONSTRAINT sabanas_items_cuarto_id_fkey FOREIGN KEY (cuarto_id) REFERENCES public.cuartos(id) ON DELETE CASCADE;


--
-- Name: sabanas_items sabanas_items_edificio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items
    ADD CONSTRAINT sabanas_items_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.edificios(id);


--
-- Name: sabanas_items sabanas_items_sabana_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items
    ADD CONSTRAINT sabanas_items_sabana_id_fkey FOREIGN KEY (sabana_id) REFERENCES public.sabanas(id) ON DELETE CASCADE;


--
-- Name: sabanas_items sabanas_items_tarea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items
    ADD CONSTRAINT sabanas_items_tarea_id_fkey FOREIGN KEY (tarea_id) REFERENCES public.tareas(id) ON DELETE SET NULL;


--
-- Name: sabanas_items sabanas_items_usuario_responsable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas_items
    ADD CONSTRAINT sabanas_items_usuario_responsable_id_fkey FOREIGN KEY (usuario_responsable_id) REFERENCES public.usuarios(id);


--
-- Name: sabanas sabanas_usuario_creador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sabanas
    ADD CONSTRAINT sabanas_usuario_creador_id_fkey FOREIGN KEY (usuario_creador_id) REFERENCES public.usuarios(id);


--
-- Name: sesiones_usuarios sesiones_usuarios_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_usuarios
    ADD CONSTRAINT sesiones_usuarios_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: tareas tareas_asignado_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.usuarios(id);


--
-- Name: tareas tareas_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: usuarios usuarios_usuario_baja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_usuario_baja_id_fkey FOREIGN KEY (usuario_baja_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 84U1wG7aLJeV0HhOmI9XkfoVvzzTsiojERTPPjTMslBCSV7JDsBwQ4vKH11rXLz

