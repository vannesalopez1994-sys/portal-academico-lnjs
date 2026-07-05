import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;

// Cargar variables de entorno desde el archivo .env manualmente
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = value;
        }
      }
    });
    console.log('Variables de entorno cargadas desde .env con éxito.');
  }
} catch (err) {
  console.warn('Advertencia al cargar archivo .env:', err.message);
}

// Configuración de conexión de Postgres
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_DB || process.env.DATABASE_NAME || 'liceo_db',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '1234'
});

const migrationSql = `
-- 0. Esquema auth y tabla auth.users (necesaria para la llave foránea de usuarios)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255) NOT NULL,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 8. Planes Evaluacion (Ajustada a campos del React frontend)
CREATE TABLE IF NOT EXISTS public.planes_evaluacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  materia text NOT NULL,
  seccion text NOT NULL,
  ruta_pdf text NOT NULL,
  anio_escolar text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 9. Ausencias (Ajustada con fecha_desde y fecha_hasta)
CREATE TABLE IF NOT EXISTS public.ausencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_representante uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nombre_alumno_descripcion text NOT NULL,
  motivo text NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
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

-- 11.5. Historial Accesos
CREATE TABLE IF NOT EXISTS public.historial_accesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  correo text NOT NULL,
  fecha_acceso timestamptz DEFAULT now()
);

-- 12. RPC delete_user
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
`;

async function runMigration() {
  console.log('Iniciando migración de base de datos...');
  try {
    // Probar conexión
    await pool.query('SELECT NOW()');
    console.log('Conexión con PostgreSQL establecida con éxito.');
    
    // Ejecutar sentencias SQL
    await pool.query(migrationSql);
    console.log('¡Migración completada exitosamente! Todas las tablas y funciones se crearon correctamente.');
  } catch (err) {
    console.error('Error durante la migración de base de datos:', err);
  } finally {
    await pool.end();
    console.log('Conexión cerrada.');
  }
}

runMigration();
