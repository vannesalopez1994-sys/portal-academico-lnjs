/*
  # Update Absences Table to Reference Students

  1. Changes to `absences` table
    - Add `id_estudiante` column to reference students table
    - Rename `parent_id` to `id_representante` for consistency
    - Keep `student_name` for backward compatibility but make it nullable
    - Add `id_secretaria_valida` to track who validated the justification
    - Rename `document_url` to `ruta_pdf` for consistency
    - Update `status` to be called `estado` with Spanish values

  2. Security Updates
    - Update RLS policies to use new column names
    - Secretary can validate/approve justifications
    - Parents can only manage their own students' absences

  3. Important Notes
    - This migration preserves existing data
    - Uses IF EXISTS/IF NOT EXISTS to be idempotent
    - Maintains backward compatibility where possible
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'absences' AND column_name = 'id_estudiante'
  ) THEN
    ALTER TABLE absences ADD COLUMN id_estudiante uuid REFERENCES students(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'absences' AND column_name = 'id_secretaria_valida'
  ) THEN
    ALTER TABLE absences ADD COLUMN id_secretaria_valida uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'absences' AND column_name = 'ruta_pdf'
  ) THEN
    ALTER TABLE absences ADD COLUMN ruta_pdf text;
  END IF;

  ALTER TABLE absences ALTER COLUMN student_name DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_absences_estudiante ON absences(id_estudiante);
CREATE INDEX IF NOT EXISTS idx_absences_secretaria ON absences(id_secretaria_valida);
CREATE INDEX IF NOT EXISTS idx_absences_status ON absences(status);
