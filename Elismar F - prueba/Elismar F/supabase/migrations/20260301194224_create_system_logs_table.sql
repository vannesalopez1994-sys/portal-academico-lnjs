/*
  # Create System Logs Table

  1. New Tables
    - `system_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `id_usuario` (uuid) - User who performed the action
      - `accion` (text) - Description of the action performed
      - `modulo_afectado` (text) - Module or section affected
      - `fecha_hora` (timestamptz) - When the action occurred
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `system_logs` table
    - Only admin users can view system logs
    - System automatically creates logs (admin can manually create if needed)
    - Logs cannot be updated or deleted (audit trail)

  3. Indexes
    - Index on id_usuario for filtering by user
    - Index on fecha_hora for chronological queries
    - Index on modulo_afectado for filtering by module
*/

CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid REFERENCES profiles(id) ON DELETE SET NULL,
  accion text NOT NULL,
  modulo_afectado text NOT NULL,
  fecha_hora timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert system logs"
  ON system_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_system_logs_usuario ON system_logs(id_usuario);
CREATE INDEX IF NOT EXISTS idx_system_logs_fecha_hora ON system_logs(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_modulo ON system_logs(modulo_afectado);
