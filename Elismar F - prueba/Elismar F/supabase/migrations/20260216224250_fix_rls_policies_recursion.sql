/*
  # Corregir Recursión Infinita en Políticas RLS

  1. Eliminar políticas problemáticas
  2. Crear nuevas políticas sin recursión
  
  ## Cambios
  - Simplificar políticas de SELECT para evitar recursión
  - Los usuarios autenticados pueden ver perfiles (necesario para UI)
  - Solo admins pueden modificar perfiles
*/

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Los admins pueden ver todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Los admins pueden insertar perfiles" ON profiles;
DROP POLICY IF EXISTS "Los admins pueden actualizar todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Los admins pueden eliminar perfiles" ON profiles;

-- Nuevas políticas sin recursión

-- Todos los usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "Los usuarios autenticados pueden ver perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Los usuarios pueden actualizar solo su propio perfil (excepto el rol)
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Solo para INSERT: necesitamos permitir la creación inicial
CREATE POLICY "Permitir INSERT durante signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Para operaciones de admin, usaremos una función especial
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para que admins puedan hacer todo
CREATE POLICY "Los admins pueden gestionar perfiles"
  ON profiles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());