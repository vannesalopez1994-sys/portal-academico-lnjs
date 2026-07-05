/*
  # Update News Table for Photo Attachments

  1. Changes to `news` table
    - Add `id_foto` column as UUID for unique photo identification
    - Add `id_noticia` as alternative ID (already have `id` as primary)
    - Add `ruta_imagen` for storing image path/URL (already have image_url)
    - Ensure all photo-related fields are properly indexed

  2. Updates
    - The table already has `image_url` which serves the same purpose as `ruta_imagen`
    - Add indexes for better query performance
    - Maintain existing structure while adding UML-specified fields

  3. Important Notes
    - This migration adds fields from the UML diagram
    - Existing `image_url` field is kept for backward compatibility
    - Both `image_url` and `ruta_imagen` can be used
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'id_foto'
  ) THEN
    ALTER TABLE news ADD COLUMN id_foto uuid DEFAULT gen_random_uuid();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'ruta_imagen'
  ) THEN
    ALTER TABLE news ADD COLUMN ruta_imagen text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_news_foto ON news(id_foto);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published);
CREATE INDEX IF NOT EXISTS idx_news_author ON news(author_id);
