/*
  # Add Admin Delete Policies

  ## Overview
  Adds RLS policies to allow administrators to delete absences and justificativos.

  ## Changes
  1. Add delete policy for absences table allowing admins to delete any absence
  2. Add delete policy for justificativos table allowing admins to delete any justificativo
  3. Update storage policies to allow admins to delete any file in justificativos bucket

  ## Security
  - Only users with 'admin' role can delete absences and justificativos
  - All deletions are restricted to authenticated users with admin privileges
*/

-- Allow admins to delete any absence
CREATE POLICY "Admins can delete any absence"
  ON absences FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Allow admins to delete any justificativo
CREATE POLICY "Admins can delete any justificativo"
  ON justificativos FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Update storage policy to allow admins to delete files
DROP POLICY IF EXISTS "Representatives can delete their own pending justificativos" ON storage.objects;

CREATE POLICY "Representatives can delete their own pending justificativos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'justificativos' AND
    auth.uid() IN (
      SELECT uploaded_by FROM justificativos
      WHERE file_url LIKE '%' || name || '%' AND status = 'pending'
    )
  );

CREATE POLICY "Admins can delete any justificativo file"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'justificativos' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );