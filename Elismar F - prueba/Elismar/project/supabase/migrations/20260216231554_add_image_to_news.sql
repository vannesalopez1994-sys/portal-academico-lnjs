/*
  # Agregar imágenes a noticias

  1. Cambios
    - Agregar columna `image_url` a la tabla `news`
    - Permite URLs de imágenes opcionales para noticias
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE news ADD COLUMN image_url text;
  END IF;
END $$;