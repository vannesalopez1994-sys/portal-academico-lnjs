/*
  # Create Institutional Documents Table

  1. New Tables
    - `institutional_documents`
      - `id` (uuid, primary key) - Unique identifier for each document
      - `title` (text) - Title of the document (e.g., "Organigrama 2026", "Reglamento Interno")
      - `description` (text, nullable) - Optional description of the document
      - `category` (text) - Category of document: 'organigrama', 'reglamento', or 'norma'
      - `file_url` (text) - URL of the PDF file in storage
      - `file_name` (text) - Original file name for download
      - `file_size` (bigint, nullable) - File size in bytes
      - `published` (boolean) - Whether the document is visible to users
      - `created_by` (uuid) - Reference to user who uploaded the document
      - `created_at` (timestamptz) - When the document was created
      - `updated_at` (timestamptz) - When the document was last updated

  2. Security
    - Enable RLS on `institutional_documents` table
    - Add policy for authenticated users to view published documents
    - Add policy for admin users to manage all documents
    
  3. Indexes
    - Index on category for faster filtering
    - Index on published status
*/

CREATE TABLE IF NOT EXISTS institutional_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('organigrama', 'reglamento', 'norma')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  published boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE institutional_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published documents"
  ON institutional_documents
  FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Admin users can view all documents"
  ON institutional_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert documents"
  ON institutional_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update documents"
  ON institutional_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete documents"
  ON institutional_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_institutional_documents_category ON institutional_documents(category);
CREATE INDEX IF NOT EXISTS idx_institutional_documents_published ON institutional_documents(published);
CREATE INDEX IF NOT EXISTS idx_institutional_documents_created_at ON institutional_documents(created_at DESC);
