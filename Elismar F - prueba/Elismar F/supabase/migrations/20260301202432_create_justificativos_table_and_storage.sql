/*
  # Create Justificativos Table and Configure Storage

  ## Overview
  Creates the justificativos table to store absence justification documents
  and configures Supabase Storage for PDF file uploads.

  ## New Tables
  1. `justificativos`
    - `id` (uuid, primary key) - Unique identifier for the justificativo
    - `absence_id` (uuid, foreign key) - Reference to the absence being justified
    - `file_name` (text) - Original name of the uploaded file
    - `file_url` (text) - Public URL of the stored PDF file
    - `file_size` (integer) - Size of the file in bytes
    - `uploaded_by` (uuid, foreign key) - User who uploaded the file
    - `status` (text) - Status: 'pending', 'approved', 'rejected'
    - `reviewed_by` (uuid, foreign key, nullable) - User who reviewed the justificativo
    - `reviewed_at` (timestamptz, nullable) - When it was reviewed
    - `review_notes` (text, nullable) - Notes from the reviewer
    - `created_at` (timestamptz) - When the record was created
    - `updated_at` (timestamptz) - When the record was last updated

  ## Storage Configuration
  1. Creates 'justificativos' storage bucket for PDF files
  2. Sets up storage policies for authenticated users

  ## Security (RLS)
  1. Enable RLS on justificativos table
  2. Representatives can insert their own justificativos
  3. Representatives can view their own justificativos
  4. Secretaries and Directors can view all justificativos
  5. Secretaries and Directors can update justificativos (review)
*/

-- Create justificativos table
CREATE TABLE IF NOT EXISTS justificativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  absence_id uuid REFERENCES absences(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE justificativos ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for justificativos
INSERT INTO storage.buckets (id, name, public)
VALUES ('justificativos', 'justificativos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for justificativos bucket
-- Representatives can upload their own files
CREATE POLICY "Representatives can upload justificativos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'justificativos' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'representante'
    )
  );

-- Authenticated users can read justificativos they have access to
CREATE POLICY "Users can view justificativos they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'justificativos' AND (
      -- Representatives can view their own uploads
      auth.uid() IN (
        SELECT uploaded_by FROM justificativos
        WHERE file_url LIKE '%' || name || '%'
      ) OR
      -- Secretaries and Directors can view all
      auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('secretaria', 'directivo')
      )
    )
  );

-- Representatives can delete their own pending justificativos
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

-- RLS Policies for justificativos table

-- Representatives can insert their own justificativos
CREATE POLICY "Representatives can create justificativos"
  ON justificativos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'representante'
    )
  );

-- Representatives can view their own justificativos
CREATE POLICY "Representatives can view own justificativos"
  ON justificativos FOR SELECT
  TO authenticated
  USING (
    auth.uid() = uploaded_by AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'representante'
    )
  );

-- Secretaries and Directors can view all justificativos
CREATE POLICY "Secretaries and Directors can view all justificativos"
  ON justificativos FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('secretaria', 'directivo')
    )
  );

-- Secretaries and Directors can update justificativos for review
CREATE POLICY "Secretaries and Directors can review justificativos"
  ON justificativos FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('secretaria', 'directivo')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('secretaria', 'directivo')
    )
  );

-- Representatives can delete their own pending justificativos
CREATE POLICY "Representatives can delete own pending justificativos"
  ON justificativos FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by AND
    status = 'pending' AND
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'representante'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_justificativos_absence_id ON justificativos(absence_id);
CREATE INDEX IF NOT EXISTS idx_justificativos_uploaded_by ON justificativos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_justificativos_status ON justificativos(status);