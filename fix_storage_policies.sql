-- Add missing INSERT policy for documentos_pdf
CREATE POLICY "Permitir Subida Documentos PDF"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos_pdf');

-- Add UPDATE policy just in case
CREATE POLICY "Permitir Actualizacion Documentos PDF"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos_pdf');

-- Add SELECT policy if not exists
DO \c:\Users\User\Desktop\Elismar F - prueba 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir Lectura Documentos PDF Autenticados') THEN
        CREATE POLICY "Permitir Lectura Documentos PDF Autenticados"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'documentos_pdf');
    END IF;
END \c:\Users\User\Desktop\Elismar F - prueba;
