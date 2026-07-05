import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables de entorno de Supabase faltantes');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : null;

// -------------- TYPE DEFINITIONS (11 TABLAS EN ESPAÑOL) -------------- //

export interface Roles {
  id_rol: string;
  nombre_rol: string;
}

export interface Usuarios {
  id: string; // auth.users.id
  id_rol: string; // foreign key
  nombre_completo: string;
  correo: string;
  created_at: string;
  updated_at: string;
  roles?: Roles; // Joined data
}

export interface Noticias {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string;
  created_at: string;
}

export interface FotoNoticia {
  id: string;
  id_noticia: string;
  ruta_foto: string;
  created_at: string;
}

export interface Horarios {
  id: string;
  seccion: string;
  ruta_pdf: string;
  created_at: string;
}

export interface PlanesEvaluacion {
  id: string;
  materia: string; // Changed from UUID foreign key to text for flexibility
  seccion: string;
  ruta_pdf: string;
  anio_escolar: string;
  created_at: string;
}

export interface Ausencias {
  id: string;
  id_representante: string;
  nombre_alumno_descripcion: string;
  motivo: string;
  fecha_desde: string;
  fecha_hasta: string;
  ruta_pdf_justificativo?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  created_at: string;
}

export interface DocumentosInstitucionales {
  id: string;
  titulo: string;
  ruta_pdf: string;
  created_at: string;
}

export interface LogSistema {
  id: string;
  accion: string;
  usuario_id: string;
  fecha: string;
}

export interface Materias {
  id: string;
  nombre_materia: string;
  created_at: string;
}

export interface ConfiguracionSistema {
  id: string;
  nombre_institucion: string;
  ruta_logo_foto?: string;
  anio_escolar_actual: string;
  created_at: string;
}

// Helper to get public URL from relative path
export const getPublicUrl = (bucket: string, path: string | undefined): string => {
  if (!path) return '';
  // If it's already an absolute URL (e.g. from an old record that wasn't migrated or external)
  if (path.startsWith('http')) return path;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
