/*
  # Create Students Table

  1. New Tables
    - `students`
      - `id` (uuid, primary key) - Unique identifier for each student
      - `id_representante` (uuid) - Foreign key to parent/representative profile
      - `nombre` (text) - Student's first name
      - `apellido` (text) - Student's last name
      - `ano_escolar` (text) - School year/grade level
      - `created_at` (timestamptz) - When the student was registered
      - `updated_at` (timestamptz) - When the student info was last updated

  2. Security
    - Enable RLS on `students` table
    - Parents can view and manage their own students
    - Admin and secretary can view all students
    - Admin and secretary can manage all students

  3. Indexes
    - Index on id_representante for faster parent lookups
    - Index on ano_escolar for grade filtering
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_representante uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  ano_escolar text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their own students"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    id_representante = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Parents can insert their own students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id_representante = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Parents can update their own students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (
    id_representante = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  )
  WITH CHECK (
    id_representante = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can delete students"
  ON students
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE INDEX IF NOT EXISTS idx_students_representante ON students(id_representante);
CREATE INDEX IF NOT EXISTS idx_students_ano_escolar ON students(ano_escolar);
