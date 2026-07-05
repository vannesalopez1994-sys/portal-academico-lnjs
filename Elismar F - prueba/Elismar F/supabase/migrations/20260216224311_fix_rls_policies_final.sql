/*
  # Simplificar Políticas RLS para Evitar Recursión (Final)

  1. Eliminar políticas y funciones problemáticas
  2. Crear políticas simples y funcionales
  
  ## Cambios
  - Políticas basadas solo en auth.uid()
  - Sin consultas recursivas a profiles
*/

-- Eliminar todas las políticas actuales de profiles
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver perfiles" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Los admins pueden gestionar perfiles" ON profiles;
DROP POLICY IF EXISTS "Permitir INSERT durante signup" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Usuarios pueden eliminar su propio perfil" ON profiles;

-- Eliminar función
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Crear políticas simples sin recursión

-- SELECT: Todos los usuarios autenticados pueden ver todos los perfiles
CREATE POLICY "allow_select_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Solo durante el registro, el usuario puede crear su propio perfil
CREATE POLICY "allow_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "allow_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Los usuarios pueden eliminar su propio perfil
CREATE POLICY "allow_delete_own_profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);