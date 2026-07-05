/*
  # Crear tablas para Noticias, Horarios y Clases

  1. Nuevas Tablas
    - `news` - Noticias e información del plantel
      - `id` (uuid, primary key)
      - `title` (text) - Título de la noticia
      - `content` (text) - Contenido completo
      - `author_id` (uuid) - Usuario que publicó
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `published` (boolean) - Si está publicada o es borrador
    
    - `schedules` - Horarios en formato PDF
      - `id` (uuid, primary key)
      - `title` (text) - Nombre del horario (ej: "Horario Primaria")
      - `file_url` (text) - URL del archivo PDF
      - `uploaded_by` (uuid) - Usuario que subió
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `classes` - Clases/Asignaturas del plantel
      - `id` (uuid, primary key)
      - `name` (text) - Nombre de la clase
      - `grade_level` (text) - Nivel/Grado
      - `description` (text) - Descripción opcional
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para que admin y secretaria puedan gestionar
    - Políticas para que otros roles puedan leer
*/

-- Tabla de Noticias
CREATE TABLE IF NOT EXISTS news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  published boolean DEFAULT true NOT NULL
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Políticas para news
CREATE POLICY "news_select_policy"
  ON news FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "news_insert_policy"
  ON news FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "news_update_policy"
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

CREATE POLICY "news_delete_policy"
  ON news FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

-- Tabla de Horarios
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para schedules
CREATE POLICY "schedules_select_policy"
  ON schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "schedules_insert_policy"
  ON schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "schedules_update_policy"
  ON schedules FOR UPDATE
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

CREATE POLICY "schedules_delete_policy"
  ON schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

-- Tabla de Clases
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade_level text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Políticas para classes
CREATE POLICY "classes_select_policy"
  ON classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "classes_insert_policy"
  ON classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "classes_update_policy"
  ON classes FOR UPDATE
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

CREATE POLICY "classes_delete_policy"
  ON classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS news_created_at_idx ON news(created_at DESC);
CREATE INDEX IF NOT EXISTS schedules_created_at_idx ON schedules(created_at DESC);
CREATE INDEX IF NOT EXISTS classes_grade_level_idx ON classes(grade_level);