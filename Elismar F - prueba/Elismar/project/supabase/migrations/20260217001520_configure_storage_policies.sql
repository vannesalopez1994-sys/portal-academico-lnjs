/*
  # Configurar políticas de almacenamiento

  1. Políticas para el bucket 'images'
    - Permitir a usuarios autenticados subir imágenes
    - Permitir a todos leer imágenes (públicas)
    
  2. Políticas para el bucket 'documents'
    - Permitir a usuarios autenticados subir documentos
    - Permitir a todos leer documentos (públicos)

  Nota: Los buckets ya existen y son públicos, solo agregamos políticas para gestionar uploads
*/

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their documents" ON storage.objects;

-- Políticas para el bucket de imágenes
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Anyone can read images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can delete their images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- Políticas para el bucket de documentos
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can read documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete their documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');