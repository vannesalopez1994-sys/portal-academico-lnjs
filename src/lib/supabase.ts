const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Listeners de cambios en estado de autenticación
const authListeners = new Set<(event: string, session: any) => void>();

// Obtener sesión local inicial desde localStorage
let currentSession: any = null;
try {
  const stored = localStorage.getItem('local_session');
  if (stored) {
    currentSession = JSON.parse(stored);
  }
} catch (e) {
  console.error('Error al cargar sesión de localStorage:', e);
}

class QueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null = null;
  private fields: string = '*';
  private filters: Array<{ type: 'eq'; field: string; value: any }> = [];
  private orderObj: { field: string; ascending: boolean } | null = null;
  private limitVal: number | undefined = undefined;
  private dataVal: any = null;
  private onConflictVal: string | undefined = undefined;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private countType: string | undefined = undefined;
  private headVal: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string, options?: { count?: string; head?: boolean }) {
    if (this.action === null) {
      this.action = 'select';
    }
    if (fields) this.fields = fields;
    if (options?.count) this.countType = options.count;
    if (options?.head) this.headVal = options.head;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.dataVal = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.dataVal = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data: any, options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.dataVal = data;
    if (options?.onConflict) this.onConflictVal = options.onConflict;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderObj = { field, ascending: options?.ascending !== false };
    return this;
  }

  limit(val: number) {
    this.limitVal = val;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitVal = 1;
    return this;
  }

  // Permite await del objeto QueryBuilder directamente
  async then(onfulfilled?: (value: any) => any, _onrejected?: (reason: any) => any) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          table: this.table,
          action: this.action || 'select',
          fields: this.fields,
          filters: this.filters,
          order: this.orderObj,
          limit: this.limitVal,
          data: this.dataVal,
          onConflict: this.onConflictVal,
          single: this.isSingle,
          maybeSingle: this.isMaybeSingle,
          count: this.countType,
          head: this.headVal
        })
      });

      const json = await res.json().catch(() => null);
      if (!json) {
        const errorResult = { data: null, count: null, error: { message: `HTTP error ${res.status}` } };
        if (onfulfilled) return onfulfilled(errorResult);
        return errorResult;
      }

      if (onfulfilled) {
        return onfulfilled(json);
      }
      return json;
    } catch (err: any) {
      const errorResult = { data: null, count: null, error: { message: err.message || 'Error de red' } };
      if (onfulfilled) {
        return onfulfilled(errorResult);
      }
      return errorResult;
    }
  }
}

// Métodos de autenticación simulados localmente
let isSigningIn = false;

const auth = {
  async getSession() {
    // If no session stored, nothing to validate
    if (!currentSession) {
      return { data: { session: null }, error: null };
    }
    // Validate the stored session by checking if the user exists in the backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/validate-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentSession.user?.id })
      });
      if (res.ok) {
        const json = await res.json();
        if (!json.valid) {
          // Session is stale/invalid — clear it automatically
          console.warn('[Auth] Stale session detected. Clearing localStorage.');
          currentSession = null;
          localStorage.removeItem('local_session');
          return { data: { session: null }, error: null };
        }
      }
    } catch (_err) {
      // If the backend is unreachable, assume session is valid to avoid
      // locking out users during temporary network issues
    }
    return { data: { session: currentSession }, error: null };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authListeners.add(callback);
    // Disparar de forma asíncrona para imitar el comportamiento de Supabase
    setTimeout(() => {
      callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe() {
            authListeners.delete(callback);
          }
        }
      }
    };
  },

  async signInWithPassword({ email, password }: any) {
    if (isSigningIn) {
      console.warn('Sign in already in progress, ignoring duplicate call');
      return { data: { user: null, session: null }, error: { message: 'Inicio de sesión en progreso' } };
    }
    isSigningIn = true;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.error) return { data: { user: null, session: null }, error: json.error };

      currentSession = json.data.session;
      localStorage.setItem('local_session', JSON.stringify(currentSession));
      
      authListeners.forEach(cb => cb('SIGNED_IN', currentSession));

      return { data: json.data, error: null };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: { message: err.message } };
    } finally {
      isSigningIn = false;
    }
  },

  async signUp({ email, password, options }: any) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, options })
      });
      const json = await res.json();
      if (json.error) return { data: { user: null, session: null }, error: json.error };

      currentSession = json.data.session;
      localStorage.setItem('local_session', JSON.stringify(currentSession));

      authListeners.forEach(cb => cb('SIGNED_IN', currentSession));

      return { data: json.data, error: null };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: { message: err.message } };
    }
  },

  async signOut() {
    try {
      currentSession = null;
      localStorage.removeItem('local_session');
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message } };
    }
  },

  async resetPasswordForEmail(email: string, options?: any) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: options?.redirectTo })
      });
      const json = await res.json();
      if (json.error) return { data: null, error: json.error };
      return { data: json.data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  },

  async updateUser({ password, token }: any) {
    try {
      const body: any = { password };
      if (token) {
        body.token = token;
      } else {
        if (!currentSession?.user?.id) {
          throw new Error('No hay sesión activa');
        }
        body.userId = currentSession.user.id;
      }
      const res = await fetch(`${BACKEND_URL}/api/auth/update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.error) return { data: { user: null }, error: json.error };

      return { data: json.data, error: null };
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } };
    }
  },

  admin: {
    async createUser({ email, password, user_metadata }: any) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/admin/create-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, user_metadata })
        });
        const json = await res.json();
        if (json.error) return { data: { user: null }, error: json.error };
        return { data: json.data, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },
    async updateUserById(id: string, attributes: any) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/admin/update-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, password: attributes.password, user_metadata: attributes.user_metadata })
        });
        const json = await res.json();
        if (json.error) return { data: { user: null }, error: json.error };
        return { data: json.data, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },
    async deleteUser(id: string) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/admin/delete-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        const json = await res.json();
        if (json.error) return { data: null, error: json.error };
        return { data: json.data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    }
  }
};

// RPC genérico
async function rpc(name: string, args: any) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, args })
    });
    const json = await res.json();
    return { data: json.data, error: json.error };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

// Almacenamiento local simulado
const storage = {
  from(bucket: string) {
    return {
      async upload(filePath: string, file: File | Blob, _options?: any) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/storage/upload?bucket=${bucket}&path=${filePath}`, {
            method: 'POST',
            body: file
          });
          const json = await res.json();
          return { data: json.data, error: json.error };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      },

      getPublicUrl(filePath: string) {
        return {
          data: {
            publicUrl: `${BACKEND_URL}/storage/${bucket}/${filePath}`
          }
        };
      },

      async remove(filePaths: string[]) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/storage/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucket, filePaths })
          });
          const json = await res.json();
          return { data: json.data, error: json.error };
        } catch (err: any) {
          return { data: null, error: { message: err.message } };
        }
      }
    };
  }
};

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  rpc,
  auth,
  storage
};

export const supabaseAdmin = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  rpc,
  auth,
  storage
};

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
  estado?: string;
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
  anio_escolar: string;
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
  ano_escolar?: string;
  seccion?: string;
  motivo: string;
  fecha_desde: string;
  fecha_hasta: string;
  telefono_representante?: string;
  ruta_pdf_justificativo?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  comentario_institucion?: string;
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
