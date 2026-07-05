/*
  # Create Evaluation Plans Table

  1. New Tables
    - `evaluation_plans`
      - `id` (uuid, primary key) - Unique identifier for each plan
      - `materia` (text) - Subject name
      - `descripcion` (text) - Plan description
      - `ruta_pdf` (text) - URL to the PDF file
      - `id_subido_por` (uuid) - User who uploaded the plan (admin/secretary)
      - `created_at` (timestamptz) - When the plan was created
      - `updated_at` (timestamptz) - When the plan was last updated

  2. Security
    - Enable RLS on `evaluation_plans` table
    - All authenticated users can view evaluation plans
    - Only admin and secretary can create/update/delete evaluation plans

  3. Indexes
    - Index on materia for filtering by subject
    - Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS evaluation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materia text NOT NULL,
  descripcion text,
  ruta_pdf text NOT NULL,
  id_subido_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE evaluation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view evaluation plans"
  ON evaluation_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and secretary can insert evaluation plans"
  ON evaluation_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE POLICY "Admin and secretary can update evaluation plans"
  ON evaluation_plans
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

CREATE POLICY "Admin and secretary can delete evaluation plans"
  ON evaluation_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'secretary')
    )
  );

CREATE INDEX IF NOT EXISTS idx_evaluation_plans_materia ON evaluation_plans(materia);
CREATE INDEX IF NOT EXISTS idx_evaluation_plans_created_at ON evaluation_plans(created_at DESC);
