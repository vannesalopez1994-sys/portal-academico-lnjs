/*
  # Create Backups Table

  1. New Tables
    - `backups`
      - `id` (uuid, primary key) - Unique identifier for each backup
      - `id_admin` (uuid) - Admin user who created the backup
      - `datetime_fecha_proceso` (timestamptz) - When the backup was created
      - `nombre_archivo_sql` (text) - Name of the backup SQL file
      - `estado_operacion` (text) - Operation status (import/export/completed/failed)
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `backups` table
    - Only admin users can view, create, and manage backups
    - No updates allowed (immutable audit trail)
    - Admin can delete old backups

  3. Indexes
    - Index on id_admin for filtering by admin
    - Index on datetime_fecha_proceso for chronological queries
    - Index on estado_operacion for filtering by status

  4. Important Notes
    - Backups are critical system operations
    - Only admin role has full access
    - Operation status tracks the backup lifecycle
*/

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_admin uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  datetime_fecha_proceso timestamptz DEFAULT now(),
  nombre_archivo_sql text NOT NULL,
  estado_operacion text NOT NULL DEFAULT 'completed' CHECK (estado_operacion IN ('import', 'export', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view backups"
  ON backups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admin can create backups"
  ON backups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admin can delete backups"
  ON backups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_backups_admin ON backups(id_admin);
CREATE INDEX IF NOT EXISTS idx_backups_fecha_proceso ON backups(datetime_fecha_proceso DESC);
CREATE INDEX IF NOT EXISTS idx_backups_estado ON backups(estado_operacion);
