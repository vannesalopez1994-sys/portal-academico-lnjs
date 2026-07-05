/*
  # Agregar archivo PDF a clases

  1. Cambios
    - Agregar columna `file_url` a la tabla `classes`
    - Permite subir archivos PDF opcionales para las clases
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE classes ADD COLUMN file_url text;
  END IF;
END $$;