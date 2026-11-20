-- 1. Seguridad para la tabla usuarios (El problema del rol)
Crear función segura de verificación (evita el error de recursión)
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios u
    JOIN public.roles r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = auth.uid() 
    AND UPPER(r.codigo) = 'ADMIN_SISTEMA' 
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Borrar políticas anteriores
DROP POLICY IF EXISTS "Permitir lectura a todos los autenticados" ON public.usuarios;
DROP POLICY IF EXISTS "Permitir update a admins" ON public.usuarios;

-- 1. Todos pueden leer
CREATE POLICY "Permitir lectura a todos los autenticados"
ON public.usuarios FOR SELECT TO authenticated USING (true);

-- 2. Solo admin puede actualizar
CREATE POLICY "Permitir update a admins"
ON public.usuarios FOR UPDATE TO authenticated
USING ( public.es_admin() )
WITH CHECK ( public.es_admin() );


--2. Habilitar RLS en transacciones_precintos (La tabla que estaba desprotegida)
ALTER TABLE public.transacciones_precintos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura transacciones" ON public.transacciones_precintos;
DROP POLICY IF EXISTS "Escritura transacciones" ON public.transacciones_precintos;

CREATE POLICY "Lectura transacciones" ON public.transacciones_precintos
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura transacciones" ON public.transacciones_precintos
FOR ALL TO authenticated
USING ( 
  EXISTS (
    SELECT 1 FROM public.usuarios u JOIN public.roles r ON u.id_rol = r.id_rol 
    WHERE u.id_usuario = auth.uid() 
    AND UPPER(r.codigo) IN ('ADMIN_SISTEMA', 'ADMIN_PLANTA', 'JEFE_OPERACIONES', 'ANALISTA_OPERACIONES')
  )
)
WITH CHECK ( 
  EXISTS (
    SELECT 1 FROM public.usuarios u JOIN public.roles r ON u.id_rol = r.id_rol 
    WHERE u.id_usuario = auth.uid() 
    AND UPPER(r.codigo) IN ('ADMIN_SISTEMA', 'ADMIN_PLANTA', 'JEFE_OPERACIONES', 'ANALISTA_OPERACIONES')
  )
);



--3. Blindar la tabla precintos y la función de lotes
-- 1. Hacemos que la función respete las reglas de seguridad
ALTER FUNCTION public.fn_registrar_lote_precintos(uuid, integer, integer, numeric, text) SECURITY INVOKER;

-- 2. Blindar la tabla de precintos
ALTER TABLE public.precintos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura precintos" ON public.precintos;
DROP POLICY IF EXISTS "Escritura precintos" ON public.precintos;

CREATE POLICY "Lectura precintos" ON public.precintos
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escritura precintos" ON public.precintos
FOR ALL TO authenticated
USING ( 
  EXISTS (
    SELECT 1 FROM public.usuarios u JOIN public.roles r ON u.id_rol = r.id_rol 
    WHERE u.id_usuario = auth.uid() 
    AND UPPER(r.codigo) IN ('ADMIN_SISTEMA', 'ANALISTA_OPERACIONES', 'JEFE_OPERACIONES', 'JEFE_PROYECTO')
  )
)
WITH CHECK ( 
  EXISTS (
    SELECT 1 FROM public.usuarios u JOIN public.roles r ON u.id_rol = r.id_rol 
    WHERE u.id_usuario = auth.uid() 
    AND UPPER(r.codigo) IN ('ADMIN_SISTEMA', 'ANALISTA_OPERACIONES', 'JEFE_OPERACIONES', 'JEFE_PROYECTO')
  )
);