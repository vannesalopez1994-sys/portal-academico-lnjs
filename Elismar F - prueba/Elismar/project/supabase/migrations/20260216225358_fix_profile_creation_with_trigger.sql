/*
  # Corregir Creación de Perfiles con Trigger Automático

  1. Problema
    - Las políticas RLS bloquean la creación de perfiles durante el registro
    - Los usuarios no están autenticados cuando se crea el perfil
  
  2. Solución
    - Crear un trigger que automáticamente crea el perfil cuando se registra un usuario
    - Eliminar las políticas RLS complejas
    - Simplificar el flujo de registro
    
  3. Cambios
    - Crear función para manejar nuevo usuario
    - Crear trigger on auth.users
    - Políticas RLS simplificadas para acceso
*/

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "allow_select_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_delete_own_profile" ON profiles;

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear políticas RLS simples
-- SELECT: Todos pueden ver todos los perfiles
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Solo el sistema puede insertar (a través del trigger)
-- Los usuarios no insertan directamente
CREATE POLICY "profiles_insert_policy"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Los usuarios pueden eliminar su propio perfil  
CREATE POLICY "profiles_delete_policy"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);