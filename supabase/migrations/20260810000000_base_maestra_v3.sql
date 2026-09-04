-- Migración Supabase: Base Maestra TPL V3
-- Fecha: 2026-08-10

BEGIN;

-- 1. Tabla Core (La Identidad)
CREATE TABLE IF NOT EXISTS public.tpl_propiedad_core (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('parcela', 'parcela_casa', 'casa_urbana')),
    estado VARCHAR(50) NOT NULL DEFAULT 'activa',
    titulo VARCHAR(255),
    descripcion TEXT,
    region VARCHAR(100),
    comuna VARCHAR(100),
    sector VARCHAR(150),
    lat DECIMAL(10, 8),
    lng DECIMAL(10, 8),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla Comercial (El Valor)
CREATE TABLE IF NOT EXISTS public.tpl_propiedad_comercial (
    propiedad_id UUID PRIMARY KEY REFERENCES public.tpl_propiedad_core(id) ON DELETE CASCADE,
    moneda VARCHAR(10) DEFAULT 'CLP',
    precio_publicado BIGINT,
    precio_sugerido_tpl BIGINT,
    precio_cierre BIGINT,
    dias_en_mercado INTEGER,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    oportunidad_tpl VARCHAR(50)
);

-- 3. Tabla Terreno (Físico Rural)
CREATE TABLE IF NOT EXISTS public.tpl_expediente_terreno (
    propiedad_id UUID PRIMARY KEY REFERENCES public.tpl_propiedad_core(id) ON DELETE CASCADE,
    superficie_m2 DECIMAL(15, 2) NOT NULL,
    topografia VARCHAR(100),
    suelo VARCHAR(100),
    exposicion VARCHAR(50),
    vista_principal VARCHAR(150),
    vegetacion VARCHAR(150),
    bosque_nativo BOOLEAN DEFAULT FALSE,
    rol_situacion VARCHAR(100),
    electricidad VARCHAR(150),
    agua VARCHAR(150),
    litros_seg_agua DECIMAL(8, 2),
    acceso VARCHAR(150),
    cierre_perimetral VARCHAR(100),
    porton VARCHAR(100),
    condominio BOOLEAN DEFAULT FALSE
);

-- 4. Tabla Construccion (Casas y Mejoras)
CREATE TABLE IF NOT EXISTS public.tpl_expediente_construccion (
    propiedad_id UUID PRIMARY KEY REFERENCES public.tpl_propiedad_core(id) ON DELETE CASCADE,
    m2_construidos DECIMAL(10, 2),
    m2_terrazas DECIMAL(10, 2),
    ano_construccion INTEGER,
    ano_remodelacion INTEGER,
    material_estructural VARCHAR(100),
    recepcion_final VARCHAR(50) DEFAULT 'Sin recepcion',
    habitaciones INTEGER,
    banos INTEGER,
    estacionamientos INTEGER,
    calefaccion VARCHAR(100),
    piscina BOOLEAN DEFAULT FALSE
);

-- 5. Tabla Entorno y CONIT
CREATE TABLE IF NOT EXISTS public.tpl_propiedad_entorno (
    propiedad_id UUID PRIMARY KEY REFERENCES public.tpl_propiedad_core(id) ON DELETE CASCADE,
    conit_indice INTEGER CHECK (conit_indice >= 0 AND conit_indice <= 100),
    ciudad_principal VARCHAR(100),
    distancia_ciudad_km DECIMAL(8, 2),
    riesgo_incendio VARCHAR(50),
    riesgo_inundacion VARCHAR(50),
    zonificacion_prc VARCHAR(100),
    uso_suelo VARCHAR(100)
);

-- 6. Tabla Referencias Históricas (Machine Learning Base)
CREATE TABLE IF NOT EXISTS public.tpl_mercado_referencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comuna VARCHAR(100) NOT NULL,
    mes_ano DATE NOT NULL,
    tipo_propiedad VARCHAR(50) NOT NULL,
    mediana_precio BIGINT,
    promedio_precio BIGINT,
    muestra_cantidad INTEGER,
    fuente VARCHAR(100) DEFAULT 'TPL V2.4 Algoritmo',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comuna, mes_ano, tipo_propiedad)
);

-- Trigger Function para actualizado_en
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_core
BEFORE UPDATE ON public.tpl_propiedad_core
FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

COMMIT;
