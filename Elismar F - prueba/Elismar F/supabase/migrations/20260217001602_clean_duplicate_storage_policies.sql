/*
  # Limpiar políticas de almacenamiento duplicadas

  1. Cambios
    - Eliminar políticas antiguas restrictivas que solo permitían a admin/secretary
    - Mantener políticas que permiten a todos los usuarios autenticados subir archivos
    - Esto permite que los administradores puedan subir imágenes y PDFs sin problemas
*/

-- Eliminar políticas antiguas restrictivas
DROP POLICY IF EXISTS "images_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "images_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "images_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_select_policy" ON storage.objects;