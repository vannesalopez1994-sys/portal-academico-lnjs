/*
  # Limpiar políticas RLS duplicadas

  1. Cambios
    - Eliminar políticas duplicadas de news y classes
    - Mantener solo un conjunto limpio de políticas para cada tabla
    - Simplificar las consultas de verificación de roles

  2. Políticas finales
    - News: SELECT, INSERT, UPDATE, DELETE para admin y secretary
    - Classes: SELECT, INSERT, UPDATE, DELETE para admin y secretary
*/

-- Limpiar todas las políticas de news
DROP POLICY IF EXISTS "Admins pueden eliminar noticias" ON news;
DROP POLICY IF EXISTS "Admins y secretarias pueden actualizar noticias" ON news;
DROP POLICY IF EXISTS "Admins y secretarias pueden crear noticias" ON news;
DROP POLICY IF EXISTS "Admins y secretarias pueden ver todas las noticias" ON news;
DROP POLICY IF EXISTS "Todos pueden ver noticias publicadas" ON news;
DROP POLICY IF EXISTS "news_delete_policy" ON news;
DROP POLICY IF EXISTS "news_insert_policy" ON news;
DROP POLICY IF EXISTS "news_select_policy" ON news;
DROP POLICY IF EXISTS "news_update_policy" ON news;

-- Limpiar todas las políticas de classes
DROP POLICY IF EXISTS "classes_delete_policy" ON classes;
DROP POLICY IF EXISTS "classes_insert_policy" ON classes;
DROP POLICY IF EXISTS "classes_select_policy" ON classes;
DROP POLICY IF EXISTS "classes_update_policy" ON classes;

-- Crear políticas limpias para news
CREATE POLICY "news_select_all"
ON news
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "news_insert_admin_secretary"
ON news
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
);

CREATE POLICY "news_update_admin_secretary"
ON news
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
);

CREATE POLICY "news_delete_admin_secretary"
ON news
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
);

-- Crear políticas limpias para classes
CREATE POLICY "classes_select_all"
ON classes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "classes_insert_admin_secretary"
ON classes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
);

CREATE POLICY "classes_update_admin_secretary"
ON classes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
);

CREATE POLICY "classes_delete_admin_secretary"
ON classes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'secretary')
  )
);