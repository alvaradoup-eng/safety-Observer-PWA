-- ============================================================
-- ELIMINAR Y RECREAR TABLAS CON UUID
-- ============================================================

-- 1. Eliminar todas las tablas existentes (con sus dependencias)
DROP TABLE IF EXISTS observaciones CASCADE;
DROP TABLE IF EXISTS buenas_practicas CASCADE;
DROP TABLE IF EXISTS supervisores CASCADE;

-- 2. Crear tabla de supervisores con UUID como ID
CREATE TABLE supervisores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT NOT NULL,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla de observaciones con UUID para los supervisores
CREATE TABLE observaciones (
    id BIGSERIAL PRIMARY KEY,
    supervisor_registra_id UUID REFERENCES supervisores(id) ON DELETE SET NULL,
    supervisor_evaluado_id UUID REFERENCES supervisores(id) ON DELETE SET NULL,
    area TEXT NOT NULL,
    modulo TEXT,
    tipo TEXT NOT NULL,
    nivel_riesgo TEXT NOT NULL,
    persona_observada TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    accion_inmediata TEXT,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    latitud FLOAT,
    longitud FLOAT,
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crear tabla de buenas prácticas con UUID
CREATE TABLE buenas_practicas (
    id BIGSERIAL PRIMARY KEY,
    supervisor_id UUID REFERENCES supervisores(id) ON DELETE SET NULL,
    area TEXT NOT NULL,
    modulo TEXT,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Crear índices para mejorar rendimiento
CREATE INDEX idx_observaciones_fecha ON observaciones(fecha);
CREATE INDEX idx_observaciones_area ON observaciones(area);
CREATE INDEX idx_observaciones_tipo ON observaciones(tipo);
CREATE INDEX idx_observaciones_registra ON observaciones(supervisor_registra_id);
CREATE INDEX idx_observaciones_evaluado ON observaciones(supervisor_evaluado_id);
CREATE INDEX idx_buenas_practicas_fecha ON buenas_practicas(fecha);
CREATE INDEX idx_buenas_practicas_supervisor ON buenas_practicas(supervisor_id);

-- 6. Habilitar RLS (seguridad)
ALTER TABLE supervisores ENABLE ROW LEVEL SECURITY;
ALTER TABLE observaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE buenas_practicas ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de seguridad para supervisores
CREATE POLICY "Todos pueden ver los supervisores" ON supervisores
    FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar supervisores" ON supervisores
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar su perfil" ON supervisores
    FOR UPDATE USING (auth.uid() = id);

-- 8. Políticas de seguridad para observaciones
CREATE POLICY "Todos pueden ver observaciones" ON observaciones
    FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar observaciones" ON observaciones
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar sus observaciones" ON observaciones
    FOR UPDATE USING (auth.uid() = supervisor_registra_id);

CREATE POLICY "Usuarios pueden eliminar sus observaciones" ON observaciones
    FOR DELETE USING (auth.uid() = supervisor_registra_id);

-- 9. Políticas de seguridad para buenas prácticas
CREATE POLICY "Todos pueden ver buenas prácticas" ON buenas_practicas
    FOR SELECT USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar buenas prácticas" ON buenas_practicas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar sus buenas prácticas" ON buenas_practicas
    FOR UPDATE USING (auth.uid() = supervisor_id);

CREATE POLICY "Usuarios pueden eliminar sus buenas prácticas" ON buenas_practicas
    FOR DELETE USING (auth.uid() = supervisor_id);

-- 10. Verificar que todo está correcto
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('supervisores', 'observaciones', 'buenas_practicas')
ORDER BY table_name, ordinal_position;
