-- Esquema Integral de 11 Tablas (Español) con IDs UUID

-- 1. Configuracion Sistema
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_institucion text NOT NULL,
  ruta_logo_foto text,
  anio_escolar_actual text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Materias
CREATE TABLE IF NOT EXISTS public.materias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_materia text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id_rol uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_rol text NOT NULL UNIQUE
);

-- Insertar roles básicos
INSERT INTO public.roles (nombre_rol) VALUES
  ('Administrador'),
  ('Secretaría'),
  ('Representante')
ON CONFLICT (nombre_rol) DO NOTHING;

-- 4. Usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_rol uuid REFERENCES public.roles(id_rol) ON DELETE SET NULL,
  nombre_completo text NOT NULL,
  correo text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Noticias
CREATE TABLE IF NOT EXISTS public.noticias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  contenido text NOT NULL,
  fecha timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 6. Foto Noticia
CREATE TABLE IF NOT EXISTS public.foto_noticia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_noticia uuid REFERENCES public.noticias(id) ON DELETE CASCADE,
  ruta_foto text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 7. Horarios
CREATE TABLE IF NOT EXISTS public.horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seccion text NOT NULL,
  ruta_pdf text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 8. Planes Evaluacion
CREATE TABLE IF NOT EXISTS public.planes_evaluacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materia uuid REFERENCES public.materias(id) ON DELETE CASCADE,
  ruta_pdf text NOT NULL,
  anio_escolar text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 9. Ausencias
CREATE TABLE IF NOT EXISTS public.ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_representante uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre_alumno_descripcion text NOT NULL,
  motivo text NOT NULL,
  ruta_pdf_justificativo text,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  created_at timestamptz DEFAULT now()
);

-- 10. Documentos Institucionales
CREATE TABLE IF NOT EXISTS public.documentos_institucionales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  ruta_pdf text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 11. Log Sistema
CREATE TABLE IF NOT EXISTS public.log_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accion text NOT NULL,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha timestamptz DEFAULT now()
);

-- Configuración de Storage para almacenar los PDF / Fotos locales
-- En el entorno de Supabase local necesitamos insertar la definición del bucket, usamos PL/pgSQL
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('documentos_pdf', 'documentos_pdf', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.buckets (id, name, public) VALUES ('imagenes_sistema', 'imagenes_sistema', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Policies para Storage (Dejar públicos acceso de lectura y subida global para pruebas fáciles)
CREATE POLICY "Acceso Publico a Documentos PDF" ON storage.objects FOR SELECT USING (bucket_id = 'documentos_pdf');
CREATE POLICY "Insertar Documentos PDF" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos_pdf');
CREATE POLICY "Update Documentos PDF" ON storage.objects FOR UPDATE USING (bucket_id = 'documentos_pdf');
CREATE POLICY "Delete Documentos PDF" ON storage.objects FOR DELETE USING (bucket_id = 'documentos_pdf');

CREATE POLICY "Acceso Publico a Imagenes" ON storage.objects FOR SELECT USING (bucket_id = 'imagenes_sistema');
CREATE POLICY "Insertar Imagenes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'imagenes_sistema');
CREATE POLICY "Update Imagenes" ON storage.objects FOR UPDATE USING (bucket_id = 'imagenes_sistema');
CREATE POLICY "Delete Imagenes" ON storage.objects FOR DELETE USING (bucket_id = 'imagenes_sistema');

-- Configuración básica de Seguridad (RLS disabled o Policies abiertas para facilitar el Local Development)
-- Habilitamos RLS en usuarios pero la hacemos pública temporalmente para que pueda crearse sin problemas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios totales_acceso" ON public.usuarios FOR ALL USING (true);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles totales_acceso" ON public.roles FOR ALL USING (true);

ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ausencias totales_acceso" ON public.ausencias FOR ALL USING (true);

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Noticias totales_acceso" ON public.noticias FOR ALL USING (true);

ALTER TABLE public.foto_noticia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Foto_Noticia totales_acceso" ON public.foto_noticia FOR ALL USING (true);

ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Horarios totales_acceso" ON public.horarios FOR ALL USING (true);

ALTER TABLE public.planes_evaluacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planes totales_acceso" ON public.planes_evaluacion FOR ALL USING (true);

ALTER TABLE public.documentos_institucionales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs_Institucionales totales_acceso" ON public.documentos_institucionales FOR ALL USING (true);

ALTER TABLE public.log_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs totales_acceso" ON public.log_sistema FOR ALL USING (true);

ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materias totales_acceso" ON public.materias FOR ALL USING (true);

ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configuracion totales_acceso" ON public.configuracion_sistema FOR ALL USING (true);
