/*
  # Plataforma de Gestión Académica - Schema Inicial

  1. Nuevas Tablas
    - `profiles`
      - `id` (uuid, FK a auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - 'admin', 'secretary', 'parent'
      - `phone` (text, opcional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `absences`
      - `id` (uuid, PK)
      - `parent_id` (uuid, FK a profiles)
      - `student_name` (text)
      - `reason` (text)
      - `date_from` (date)
      - `date_to` (date)
      - `document_url` (text, URL del PDF)
      - `status` ('pending', 'approved', 'rejected')
      - `reviewed_by` (uuid, FK a profiles, nullable)
      - `reviewed_at` (timestamp, nullable)
      - `comments` (text, nullable)
      - `created_at` (timestamp)
    
    - `news`
      - `id` (uuid, PK)
      - `title` (text)
      - `content` (text)
      - `author_id` (uuid, FK a profiles)
      - `published` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `system_settings`
      - `id` (uuid, PK)
      - `key` (text, unique)
      - `value` (jsonb)
      - `updated_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas específicas por rol para cada tabla
    - Los padres solo ven sus propios datos
    - Secretarias pueden ver y gestionar inasistencias
    - Admins tienen acceso completo
*/

-- Crear tabla de perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'secretary', 'parent')),
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los admins pueden insertar perfiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Los admins pueden actualizar todos los perfiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Los admins pueden eliminar perfiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Crear tabla de inasistencias
CREATE TABLE IF NOT EXISTS absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  reason text NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  document_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Políticas para absences
CREATE POLICY "Los padres pueden ver sus propias inasistencias"
  ON absences FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
  );

CREATE POLICY "Secretarias y admins pueden ver todas las inasistencias"
  ON absences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Los padres pueden crear inasistencias"
  ON absences FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'parent'
    )
  );

CREATE POLICY "Secretarias y admins pueden actualizar inasistencias"
  ON absences FOR UPDATE
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

CREATE POLICY "Los admins pueden eliminar inasistencias"
  ON absences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Crear tabla de noticias
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Políticas para news (públicas si están publicadas)
CREATE POLICY "Todos pueden ver noticias publicadas"
  ON news FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Admins y secretarias pueden ver todas las noticias"
  ON news FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admins y secretarias pueden crear noticias"
  ON news FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admins y secretarias pueden actualizar noticias"
  ON news FOR UPDATE
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

CREATE POLICY "Admins pueden eliminar noticias"
  ON news FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para system_settings
CREATE POLICY "Todos pueden ver configuraciones"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden modificar configuraciones"
  ON system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar configuraciones iniciales
INSERT INTO system_settings (key, value) VALUES
  ('school_name', '"Institución Educativa"'::jsonb),
  ('school_logo', '""'::jsonb),
  ('school_regulations', '"Reglamentos institucionales..."'::jsonb)
ON CONFLICT (key) DO NOTHING;