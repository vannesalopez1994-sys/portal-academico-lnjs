import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
import nodemailer from 'nodemailer';
import dns from 'dns';

const { Pool } = pg;

// Forzar a Node.js a priorizar IPv4 sobre IPv6 (Evita ENETUNREACH en Render)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const PORT = process.env.PORT || 3001;

// Cargar variables de entorno desde el archivo .env manualmente en local
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

// Supabase Storage credentials (permanente, no se pierden al reiniciar)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseStorageHeaders = {
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'apikey': SUPABASE_SERVICE_KEY,
};

// Resolver hostname a IPv4 explícito ANTES de crear el Pool
// Esto evita el error ENETUNREACH cuando Render intenta conectarse via IPv6 a Supabase
const dbHostname = process.env.DATABASE_HOST || 'localhost';
let resolvedDbHost = dbHostname;

if (dbHostname !== 'localhost' && dbHostname !== '127.0.0.1') {
  try {
    const lookupResult = await dns.promises.lookup(dbHostname, { family: 4 });
    if (lookupResult && lookupResult.address) {
      resolvedDbHost = lookupResult.address;
      console.log(`DNS resuelto (IPv4): ${dbHostname} → ${resolvedDbHost}`);
    }
  } catch (dnsErr) {
    console.warn(`No se pudo resolver IPv4 para ${dbHostname}: ${dnsErr.message}. Usando hostname original.`);
  }
}

const isCloud = dbHostname !== 'localhost' && dbHostname !== '127.0.0.1';
const pool = new Pool({
  host: resolvedDbHost,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_DB || process.env.DATABASE_NAME || 'postgres',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '1234',
  ssl: isCloud ? { rejectUnauthorized: false } : false
});

console.log(`Conexión configurada con éxito para la Base de Datos (host: ${resolvedDbHost}).`);

// Función para enviar correos usando la API REST de Resend (evita bloqueos SMTP)
async function sendEmail({ to, subject, html }) {
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Portal Académico <onboarding@resend.dev>';
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject: subject,
          html: html
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Error en la API de Resend');
      }
      console.log(`Correo enviado con éxito a: ${to} (ID: ${resData.id})`);
      return { success: true, id: resData.id };
    } catch (err) {
      console.error(`Error enviando correo via Resend REST: ${err.message}`);
      return { success: false, error: err.message };
    }
  } else {
    console.log("--- SIMULACIÓN LOCAL: Correo de recuperación ---");
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log("-----------------------------------------------");
    return { success: true, simulated: true };
  }
}

// Mapa en memoria para el rate limiting de inicio de sesión
const loginAttempts = new Map();

// Asegurar base de datos inicializada
async function initDb(retries = 5, delay = 2000) {
  try {
    console.log('Verificando inicialización de base de datos...');
    
    // Nota: El esquema 'auth' es gestionado por Supabase. Solo creamos public.auth_users.
    // Crear tabla public.auth_users si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.auth_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        encrypted_password VARCHAR(255) NOT NULL,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Crear tabla public.historial_accesos si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.historial_accesos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id UUID,
        correo VARCHAR(255) NOT NULL,
        fecha_acceso TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    console.log('Esquema auth, tabla public.auth_users y public.historial_accesos verificados.');

    // Migraciones de columnas: agregar campos nuevos si no existen
    const migrations = [
      'ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS ano_escolar VARCHAR(20)',
      'ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS seccion VARCHAR(20)',
      'ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS comentario_institucion TEXT',
      'ALTER TABLE IF EXISTS public.auth_users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)',
      'ALTER TABLE IF EXISTS public.auth_users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ',
      'ALTER TABLE IF EXISTS public.usuarios ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT \'activo\'',
      'ALTER TABLE IF EXISTS public.horarios ADD COLUMN IF NOT EXISTS anio_escolar TEXT',
      'ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS telefono_representante VARCHAR(30)',
      'ALTER TABLE IF EXISTS public.historial_accesos ADD COLUMN IF NOT EXISTS accion VARCHAR(100)',
      'ALTER TABLE IF EXISTS public.historial_accesos ADD COLUMN IF NOT EXISTS modulo VARCHAR(60)'
    ];

    for (const migration of migrations) {
      try {
        await pool.query(migration);
      } catch (migErr) {
        console.warn(`Advertencia en migración: ${migErr.message}`);
      }
    }
    console.log('Migraciones de columnas verificadas.');

    // Sembrar Administrador Máster si no existe
    try {
      const masterEmail = 'adminmaster2026l.n.joaquinas@gmail.com';
      const checkAdmin = await pool.query('SELECT id FROM public.auth_users WHERE email = $1', [masterEmail]);
      
      let userId;
      if (checkAdmin.rows.length === 0) {
        console.log('Sembrando Administrador Máster...');
        const initialPassword = process.env.MASTER_ADMIN_PASSWORD || 'LNJS2026master!';
        const hash = crypto.createHash('sha256').update(initialPassword).digest('hex');
        
        const insertUser = await pool.query(
          `INSERT INTO public.auth_users (email, encrypted_password, raw_user_meta_data) 
           VALUES ($1, $2, $3) RETURNING id`,
          [masterEmail, hash, JSON.stringify({ full_name: 'Administrador Máster', role: 'admin' })]
        );
        userId = insertUser.rows[0].id;
        console.log('Administrador Máster creado en public.auth_users.');
      } else {
        userId = checkAdmin.rows[0].id;
      }

      // Asegurar que esté en la tabla public.usuarios con el rol de Administrador
      const checkProfile = await pool.query('SELECT id FROM public.usuarios WHERE id = $1', [userId]);
      if (checkProfile.rows.length === 0) {
        const roleRes = await pool.query("SELECT id_rol FROM public.roles WHERE nombre_rol = 'Administrador'");
        if (roleRes.rows.length > 0) {
          const roleId = roleRes.rows[0].id_rol;
          await pool.query(
            `INSERT INTO public.usuarios (id, id_rol, nombre_completo, correo, estado) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, roleId, 'Administrador Máster', masterEmail, 'activo']
          );
          console.log('Perfil de Administrador Máster creado en public.usuarios.');
        } else {
          console.warn('Rol Administrador no encontrado al sembrar Master Admin.');
        }
      }
    } catch (seedErr) {
      console.error('Error al sembrar el Administrador Máster:', seedErr.message);
    }
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err.message);
    if (retries > 0) {
      console.log(`Reintentando inicialización de base de datos en ${delay / 1000}s... (intentos restantes: ${retries})`);
      setTimeout(() => initDb(retries - 1, delay), delay);
    }
  }
}

initDb();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Utilidad para leer el cuerpo de la petición como JSON
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Utilidad para hashear contraseñas
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Utilidad para registrar actividad en el historial
async function logActivity(usuarioId, correo, accion, modulo) {
  try {
    await pool.query(
      'INSERT INTO public.historial_accesos (usuario_id, correo, accion, modulo) VALUES ($1, $2, $3, $4)',
      [usuarioId || null, correo || '', accion, modulo]
    );
  } catch (logErr) {
    console.error('Error al registrar actividad:', logErr.message);
  }
}

// Servidor principal
const server = http.createServer(async (req, res) => {
  // Manejo de CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  console.log(`[${req.method}] ${pathname}`);

  try {
    // ----------------------------------------------------
    // PROXY: Supabase Storage (archivos persistentes en la nube)
    // Las URLs /storage/v1/object/public/... se redirigen a Supabase.
    // Las URLs /storage/<bucket>/<path> también son soportadas.
    // ----------------------------------------------------
    if (pathname.startsWith('/storage/')) {
      const storagePath = decodeURIComponent(pathname.substring(9)); // quita '/storage/'
      const supabaseFileUrl = `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
      try {
        const upstreamRes = await fetch(supabaseFileUrl);
        if (!upstreamRes.ok) {
          res.writeHead(upstreamRes.status, { 'Content-Type': 'text/plain', ...corsHeaders });
          res.end(`Archivo no encontrado en Supabase Storage: ${storagePath}`);
          return;
        }
        const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await upstreamRes.arrayBuffer());
        res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': buffer.length, ...corsHeaders });
        res.end(buffer);
      } catch (proxyErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain', ...corsHeaders });
        res.end('Error al obtener archivo de Supabase Storage');
      }
      return;
    }

    // ---------------------------------
    // API: REPORTE ACUMULADO INASISTENCIAS
    // ---------------------------------
    if (pathname === '/api/ausencias/reporte-acumulado' && req.method === 'GET') {
      try {
        const sql = `
          SELECT 
            nombre_alumno_descripcion, 
            ano_escolar, 
            seccion, 
            telefono_representante, 
            COUNT(*)::integer as total_inasistencias
          FROM public.ausencias
          GROUP BY nombre_alumno_descripcion, ano_escolar, seccion, telefono_representante
          ORDER BY total_inasistencias DESC, nombre_alumno_descripcion ASC
        `;
        const dbRes = await pool.query(sql);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: dbRes.rows, error: null }));
      } catch (err) {
        console.error('Error al generar reporte acumulado de inasistencias:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // -------------------------
    // API: CONSULTAS GENÉRICAS
    // -------------------------
    if (pathname === '/api/query' && req.method === 'POST') {
      const queryObj = await readJsonBody(req);
      const { table, action, fields, filters, order, limit, data, onConflict, count, head } = queryObj;

      let sql = '';
      const params = [];
      let paramIndex = 1;

      // 1. Compilar WHERE a partir de filters
      let whereClause = '';
      if (filters && filters.length > 0) {
        const filterStrings = filters.map(f => {
          if (f.type === 'eq') {
            if (f.value === null) {
              return `t."${f.field}" IS NULL`;
            } else {
              params.push(f.value);
              return `t."${f.field}" = $${paramIndex++}`;
            }
          }
          return '1=1';
        });
        whereClause = ` WHERE ${filterStrings.join(' AND ')}`;
      }

      // 2. Compilar ORDER BY
      let orderClause = '';
      if (order) {
        orderClause = ` ORDER BY t."${order.field}" ${order.ascending ? 'ASC' : 'DESC'}`;
      }

      // 3. Compilar LIMIT
      let limitClause = '';
      if (limit !== undefined) {
        limitClause = ` LIMIT ${limit}`;
      }

      if (action === 'select') {
        let selectFields = '*';
        let joinClause = '';
        const isJoin = fields && fields.includes('roles(nombre_rol)');

        if (isJoin) {
          selectFields = 't.*, r.nombre_rol as roles_nombre_rol';
          joinClause = ' LEFT JOIN public.roles r ON t.id_rol = r.id_rol';
        } else if (fields && fields !== '*') {
          selectFields = fields.split(',').map(f => `t."${f.trim()}"`).join(', ');
        } else {
          selectFields = 't.*';
        }

        sql = `SELECT ${selectFields} FROM public."${table}" t${joinClause}${whereClause}${orderClause}${limitClause}`;
      } 
      else if (action === 'insert') {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: [], error: null }));
          return;
        }

        const isArray = Array.isArray(data);
        const rows = isArray ? data : [data];
        const keys = Object.keys(rows[0]);

        const valueRows = rows.map(row => {
          return '(' + keys.map(k => {
            params.push(row[k]);
            return `$${paramIndex++}`;
          }).join(', ') + ')';
        }).join(', ');

        sql = `INSERT INTO public."${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES ${valueRows} RETURNING *`;
      } 
      else if (action === 'update') {
        if (table === 'usuarios') {
          const idFilter = filters.find(f => f.field === 'id');
          if (idFilter) {
            const masterCheck = await pool.query('SELECT correo FROM public.usuarios WHERE id = $1', [idFilter.value]);
            if (masterCheck.rows.length > 0 && masterCheck.rows[0].correo === 'adminmaster2026l.n.joaquinas@gmail.com') {
              if (data.nombre_completo && data.nombre_completo !== 'Administrador Máster') {
                res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
                res.end(JSON.stringify({ data: null, error: { message: 'No está permitido cambiar el nombre del Administrador Máster.' } }));
                return;
              }
              if (data.estado === 'inactivo') {
                res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
                res.end(JSON.stringify({ data: null, error: { message: 'No está permitido desactivar al Administrador Máster.' } }));
                return;
              }
              if ('id_rol' in data) {
                const adminRoleRes = await pool.query("SELECT id_rol FROM public.roles WHERE nombre_rol = 'Administrador'");
                if (adminRoleRes.rows.length > 0 && data.id_rol !== adminRoleRes.rows[0].id_rol) {
                  res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
                  res.end(JSON.stringify({ data: null, error: { message: 'No se permite cambiar el rol del Administrador Máster.' } }));
                  return;
                }
              }
            }
          }
        }

        const keys = Object.keys(data);
        const setClause = keys.map(k => {
          params.push(data[k]);
          return `"${k}" = $${paramIndex++}`;
        }).join(', ');

        const simpleWhere = whereClause.replace(/t\./g, '');
        sql = `UPDATE public."${table}" SET ${setClause}${simpleWhere} RETURNING *`;
      } 
      else if (action === 'delete') {
        if (table === 'usuarios') {
          const idFilter = filters.find(f => f.field === 'id');
          if (idFilter) {
            const masterCheck = await pool.query('SELECT correo FROM public.usuarios WHERE id = $1', [idFilter.value]);
            if (masterCheck.rows.length > 0 && masterCheck.rows[0].correo === 'adminmaster2026l.n.joaquinas@gmail.com') {
              res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
              res.end(JSON.stringify({ data: null, error: { message: 'No está permitido eliminar la cuenta del Administrador Máster del sistema.' } }));
              return;
            }
          }
        }
        const simpleWhere = whereClause.replace(/t\./g, '');
        sql = `DELETE FROM public."${table}"${simpleWhere} RETURNING *`;
      } 
      else if (action === 'upsert') {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: [], error: null }));
          return;
        }

        const isArray = Array.isArray(data);
        const rows = isArray ? data : [data];
        const keys = Object.keys(rows[0]);

        const valueRows = rows.map(row => {
          return '(' + keys.map(k => {
            params.push(row[k]);
            return `$${paramIndex++}`;
          }).join(', ') + ')';
        }).join(', ');

        const conflictKey = onConflict || 'id';
        const updateSet = keys.filter(k => k !== conflictKey).map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

        sql = `INSERT INTO public."${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES ${valueRows} 
               ON CONFLICT ("${conflictKey}") DO UPDATE SET ${updateSet} RETURNING *`;
      }

      console.log(`Ejecutando SQL: ${sql} | Params: ${JSON.stringify(params)}`);

      let totalCount = null;
      if (count === 'exact') {
        const countSql = `SELECT COUNT(*) as count FROM public."${table}" t${whereClause}`;
        const countRes = await pool.query(countSql, params.slice(0, (whereClause.match(/\$\d+/g) || []).length));
        totalCount = parseInt(countRes.rows[0].count, 10);
      }

      if (head && count === 'exact') {
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: [], count: totalCount, error: null }));
        return;
      }

      try {
        const dbRes = await pool.query(sql, params);
        let returnedData = dbRes.rows;

        if (action === 'select' && fields && fields.includes('roles(nombre_rol)')) {
          returnedData = returnedData.map(row => {
            const newRow = { ...row };
            if ('roles_nombre_rol' in newRow) {
              newRow.roles = newRow.roles_nombre_rol ? { nombre_rol: newRow.roles_nombre_rol } : null;
              delete newRow.roles_nombre_rol;
            }
            return newRow;
          });
        }

        if (queryObj.single && returnedData.length > 0) {
          returnedData = returnedData[0];
        } else if (queryObj.single && returnedData.length === 0) {
          res.writeHead(406, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: 'JSON object requested, multiple or no rows returned' } }));
          return;
        }

        if (queryObj.maybeSingle) {
          returnedData = returnedData.length > 0 ? returnedData[0] : null;
        }

        // Registrar actividad automáticamente para acciones relevantes (no selects)
        if (action !== 'select' && dbRes.rows.length > 0) {
          const actorEmail = req.headers['x-user-email'] || '';
          const actorId = req.headers['x-user-id'] || null;
          const accionMap = {
            insert: { ausencias: 'Reportó inasistencia', noticias: 'Publicó noticia', horarios: 'Subió horario', planes_evaluacion: 'Subió plan de evaluación', documentos: 'Subió documento' },
            update: { ausencias: 'Actualizó inasistencia', noticias: 'Editó noticia', horarios: 'Actualizó horario', usuarios: 'Actualizó usuario' },
            delete: { ausencias: 'Eliminó inasistencia', noticias: 'Eliminó noticia', horarios: 'Eliminó horario', documentos: 'Eliminó documento', usuarios: 'Eliminó usuario' }
          };
          const moduloMap = {
            ausencias: 'Inasistencias', noticias: 'Noticias', horarios: 'Horarios',
            planes_evaluacion: 'Planes de Evaluación', documentos: 'Documentos', usuarios: 'Usuarios'
          };
          const accionLabel = accionMap[action]?.[table];
          const moduloLabel = moduloMap[table];
          if (accionLabel && moduloLabel && actorEmail) {
            logActivity(actorId, actorEmail, accionLabel, moduloLabel);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ 
          data: returnedData, 
          count: totalCount, 
          error: null 
        }));
      } catch (sqlErr) {
        console.error(`Error ejecutando SQL en tabla "${table}" (${action}):`, sqlErr.message);
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ 
          data: null, 
          error: { message: sqlErr.message, code: sqlErr.code, detail: sqlErr.detail || null } 
        }));
      }
      return;
    }

    // ---------------------------------
    // API: RPC (STORED PROCEDURES)
    // ---------------------------------
    if (pathname === '/api/rpc' && req.method === 'POST') {
      const { name, args } = await readJsonBody(req);
      const params = [];
      let paramIndex = 1;

      const keys = Object.keys(args || {});
      const placeholders = keys.map(k => {
        params.push(args[k]);
        return `$${paramIndex++}`;
      }).join(', ');

      const sql = `SELECT * FROM public."${name}"(${placeholders})`;
      console.log(`Ejecutando RPC SQL: ${sql} | Params: ${JSON.stringify(params)}`);

      try {
        const dbRes = await pool.query(sql, params);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: dbRes.rows, error: null }));
      } catch (err) {
        console.error('Error en RPC:', err.message);
        try {
          await pool.query(`SELECT public."${name}"(${placeholders})`, params);
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: null }));
        } catch (innerErr) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: innerErr.message } }));
        }
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (SIGN UP)
    // ---------------------------------
    if (pathname === '/api/auth/signup' && req.method === 'POST') {
      const { email, password, options } = await readJsonBody(req);
      const hash = hashPassword(password);

      try {
        const checkRes = await pool.query('SELECT id FROM public.auth_users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: null }, error: { message: 'El usuario ya existe' } }));
          return;
        }

        const userMetadata = options?.data || {};

        const insertRes = await pool.query(
          `INSERT INTO public.auth_users (email, encrypted_password, raw_user_meta_data) 
           VALUES ($1, $2, $3) RETURNING id, email, raw_user_meta_data, created_at`,
          [email, hash, JSON.stringify(userMetadata)]
        );

        const newUser = {
          id: insertRes.rows[0].id,
          email: insertRes.rows[0].email,
          user_metadata: userMetadata,
          created_at: insertRes.rows[0].created_at
        };

        const session = {
          access_token: 'local-jwt-' + newUser.id,
          token_type: 'bearer',
          expires_in: 36000,
          refresh_token: 'local-refresh-' + newUser.id,
          user: newUser
        };

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { user: newUser, session }, error: null }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { user: null }, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (SIGN IN)
    // ---------------------------------
    if (pathname === '/api/auth/signin' && req.method === 'POST') {
      const { email, password } = await readJsonBody(req);

      try {
        const now = Date.now();
        const attempt = loginAttempts.get(email) || { attempts: 0, lockUntil: 0 };

        if (attempt.lockUntil > now) {
          res.writeHead(429, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ 
            data: { user: null, session: null }, 
            error: { message: 'Acceso denegado. Tu cuenta está bloqueada. Comunícate con coordinación.' } 
          }));
          return;
        }

        const hash = hashPassword(password);

        const statusRes = await pool.query(
          'SELECT estado FROM public.usuarios WHERE correo = $1',
          [email]
        );
        if (statusRes.rows.length > 0 && statusRes.rows[0].estado === 'inactivo') {
          res.writeHead(403, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({
            data: { user: null, session: null },
            error: { message: 'Acceso denegado. Tu cuenta está bloqueada. Comunícate con coordinación.' }
          }));
          await logActivity(null, email, 'Intento de acceso denegado', 'Sistema');
          return;
        }

        const dbRes = await pool.query(
          'SELECT id, email, encrypted_password, raw_user_meta_data, created_at FROM public.auth_users WHERE email = $1',
          [email]
        );

        if (dbRes.rows.length === 0 || dbRes.rows[0].encrypted_password !== hash) {
          attempt.attempts += 1;
          const remainingAttempts = 3 - attempt.attempts;

          if (attempt.attempts >= 3) {
            // Desactivar el usuario en la base de datos (excepto el Administrador Máster por seguridad)
            if (email !== 'adminmaster2026l.n.joaquinas@gmail.com') {
              await pool.query(
                'UPDATE public.usuarios SET estado = $1 WHERE correo = $2',
                ['inactivo', email]
              );
            }
            attempt.lockUntil = now + 15 * 60 * 1000;
            loginAttempts.set(email, attempt);
            res.writeHead(429, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ 
              data: { user: null, session: null }, 
              error: { message: 'Tu cuenta ha sido bloqueada y desactivada por seguridad al superar los 3 intentos fallidos de inicio de sesión. Comunícate con coordinación.' } 
            }));
          } else {
            loginAttempts.set(email, attempt);
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ 
              data: { user: null, session: null }, 
              error: { message: `Credenciales inválidas. Te quedan ${remainingAttempts} intentos antes de desactivar la cuenta.` } 
            }));
          }
          return;
        }

        loginAttempts.delete(email);

        const userRow = dbRes.rows[0];

        // Obtener nombre_completo para el log
        let nombreRol = 'Usuario';
        try {
          const rolRes = await pool.query(
            `SELECT u.nombre_completo, r.nombre_rol FROM public.usuarios u
             LEFT JOIN public.roles r ON u.id_rol = r.id_rol
             WHERE u.id = $1`,
            [userRow.id]
          );
          if (rolRes.rows.length > 0) nombreRol = rolRes.rows[0].nombre_rol || 'Usuario';
        } catch (_) {}

        await logActivity(userRow.id, userRow.email, 'Inició sesión', nombreRol);

        const user = {
          id: userRow.id,
          email: userRow.email,
          user_metadata: userRow.raw_user_meta_data || {},
          created_at: userRow.created_at
        };

        const session = {
          access_token: 'local-jwt-' + user.id,
          token_type: 'bearer',
          expires_in: 36000,
          refresh_token: 'local-refresh-' + user.id,
          user: user
        };

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { user, session }, error: null }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (VALIDATE SESSION)
    // ---------------------------------
    if (pathname === '/api/auth/validate-session' && req.method === 'POST') {
      try {
        const { userId } = await readJsonBody(req);
        if (!userId) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ valid: false }));
          return;
        }
        const dbRes = await pool.query(
          'SELECT id FROM public.auth_users WHERE id = $1',
          [userId]
        );
        const valid = dbRes.rows.length > 0;
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ valid }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ valid: true, error: err.message }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (UPDATE USER)
    // ---------------------------------
    if (pathname === '/api/auth/update-user' && req.method === 'POST') {
      const { password, userId, token } = await readJsonBody(req);
      const hash = hashPassword(password);

      try {
        if (token) {
          const userCheck = await pool.query(
            'SELECT id FROM public.auth_users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
          );
          if (userCheck.rows.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ data: null, error: { message: 'El enlace de restablecimiento es inválido o ha expirado' } }));
            return;
          }
          const targetUserId = userCheck.rows[0].id;
          await pool.query(
            'UPDATE public.auth_users SET encrypted_password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
            [hash, targetUserId]
          );
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: { id: targetUserId } }, error: null }));
        } else if (userId) {
          await pool.query('UPDATE public.auth_users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: { id: userId } }, error: null }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: 'Datos insuficientes para actualizar contraseña' } }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (RESET PASSWORD REQUEST)
    // ---------------------------------
    if (pathname === '/api/auth/reset-password-request' && req.method === 'POST') {
      const { email, redirectTo } = await readJsonBody(req);

      try {
        const checkRes = await pool.query('SELECT id, email, raw_user_meta_data FROM public.auth_users WHERE email = $1', [email]);
        if (checkRes.rows.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: 'El correo ingresado no coincide con ningún usuario' } }));
          return;
        }

        const userRow = checkRes.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 3600000);

        await pool.query(
          'UPDATE public.auth_users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
          [token, tokenExpires, userRow.id]
        );

        const resetLink = `${redirectTo || 'http://localhost:5173/reset-password'}?token=${token}`;

        const mailOptions = {
          from: `"Liceo Joaquina Sánchez" <${process.env.SMTP_USER || 'no-reply@liceojoaquinasanchez.edu.ve'}>`,
          to: email,
          subject: 'Recuperar Acceso al Sistema - L.N. Joaquina Sánchez',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #1e3a8a; font-size: 24px; margin-bottom: 5px; text-transform: uppercase;">Liceo Nacional Joaquina Sánchez</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 0;">Portal Académico Oficial</p>
              </div>
              <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: bold;">Hola,</h2>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Hemos recibido una solicitud para restablecer la contraseña de acceso a tu portal académico. Para completar el proceso, por favor haz clic en el siguiente botón:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background-color: #1d4ed8; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                    Restablecer Contraseña
                  </a>
                </div>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  Este enlace de seguridad tiene una validez de <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura y tu contraseña actual permanecerá sin modificaciones.
                </p>
              </div>
              <div style="text-align: center; margin-top: 25px; color: #94a3b8; font-size: 11px;">
                <p>© 2026 Aplicación Académica - Todos los derechos reservados.</p>
                <p>Urb. Nueva Chirica, Calle 07, Parroquia Chirica, Ciudad Guayana, Bolívar</p>
              </div>
            </div>
          `
        };

        const emailResult = await sendEmail({
          to: email,
          subject: mailOptions.subject,
          html: mailOptions.html
        });

        if (!emailResult.success) {
          res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: `Error enviando correo: ${emailResult.error}` } }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { message: 'Enlace enviado' }, error: null }));
      } catch (err) {
        console.error('Error al procesar recuperación de contraseña:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (ADMIN CREATE USER)
    // ---------------------------------
    if (pathname === '/api/auth/admin/create-user' && req.method === 'POST') {
      const { email, password, user_metadata } = await readJsonBody(req);
      const hash = hashPassword(password);

      try {
        const checkRes = await pool.query('SELECT id FROM public.auth_users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: null }, error: { message: 'El usuario ya existe' } }));
          return;
        }

        const insertRes = await pool.query(
          `INSERT INTO public.auth_users (email, encrypted_password, raw_user_meta_data) 
           VALUES ($1, $2, $3) RETURNING id, email, raw_user_meta_data, created_at`,
          [email, hash, JSON.stringify(user_metadata || {})]
        );

        const newUser = {
          id: insertRes.rows[0].id,
          email: insertRes.rows[0].email,
          user_metadata: user_metadata || {},
          created_at: insertRes.rows[0].created_at
        };

        await logActivity(newUser.id, newUser.email, 'Usuario creado por administrador', 'Usuarios');

        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { user: newUser }, error: null }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (ADMIN UPDATE USER)
    // ---------------------------------
    if (pathname === '/api/auth/admin/update-user' && req.method === 'POST') {
      const { id, password, user_metadata } = await readJsonBody(req);
      try {
        const userCheck = await pool.query('SELECT email FROM public.auth_users WHERE id = $1', [id]);
        const isMaster = userCheck.rows.length > 0 && userCheck.rows[0].email === 'adminmaster2026l.n.joaquinas@gmail.com';
        
        if (isMaster && user_metadata) {
          if (user_metadata.role && user_metadata.role !== 'admin') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ data: null, error: { message: 'No se permite cambiar el rol del Administrador Máster.' } }));
            return;
          }
          if (user_metadata.full_name && user_metadata.full_name !== 'Administrador Máster') {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ data: null, error: { message: 'No se permite cambiar el nombre del Administrador Máster.' } }));
            return;
          }
        }

        if (password) {
          const hash = hashPassword(password);
          await pool.query('UPDATE public.auth_users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hash, id]);
        }
        if (user_metadata) {
          await pool.query('UPDATE public.auth_users SET raw_user_meta_data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(user_metadata), id]);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { user: { id } }, error: null }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: AUTHENTICATION (ADMIN DELETE USER)
    // ---------------------------------
    if (pathname === '/api/auth/admin/delete-user' && req.method === 'POST') {
      const { id } = await readJsonBody(req);
      try {
        const userCheck = await pool.query('SELECT email FROM public.auth_users WHERE id = $1', [id]);
        if (userCheck.rows.length > 0 && userCheck.rows[0].email === 'adminmaster2026l.n.joaquinas@gmail.com') {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: 'No está permitido eliminar la cuenta del Administrador Máster del sistema.' } }));
          return;
        }
        await pool.query('DELETE FROM public.auth_users WHERE id = $1', [id]);
        await logActivity(null, userCheck.rows[0]?.email || '', 'Usuario eliminado', 'Usuarios');
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { user: { id } }, error: null }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: STORAGE (UPLOAD FILE)
    // ---------------------------------
    if (pathname === '/api/storage/upload' && req.method === 'POST') {
      const bucket = urlObj.searchParams.get('bucket');
      const filePath = urlObj.searchParams.get('path');
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const upsert = urlObj.searchParams.get('upsert') || 'false';

      if (!bucket || !filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: 'Bucket o ruta faltantes' } }));
        return;
      }

      // Leer el cuerpo de la solicitud
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const fileBuffer = Buffer.concat(chunks);

      // Subir a Supabase Storage (almacenamiento permanente)
      const supabaseUploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
      try {
        const upstreamRes = await fetch(supabaseUploadUrl, {
          method: 'POST',
          headers: {
            ...supabaseStorageHeaders,
            'Content-Type': contentType,
            'x-upsert': upsert,
          },
          body: fileBuffer,
        });
        const json = await upstreamRes.json();
        if (upstreamRes.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
          // Determinar módulo por bucket
          const moduloMap = {
            'horarios': 'Horarios',
            'planes-evaluacion': 'Planes de Evaluación',
            'documentos': 'Documentos',
            'noticias': 'Noticias'
          };
          const moduloNombre = moduloMap[bucket] || 'Archivo';
          const uploaderEmail = req.headers['x-user-email'] || '';
          const uploaderId = req.headers['x-user-id'] || null;
          await logActivity(uploaderId, uploaderEmail, `Subió archivo: ${filePath.split('/').pop()}`, moduloNombre);
          console.log(`✅ Archivo subido a Supabase Storage: ${publicUrl}`);
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { path: filePath, publicUrl }, error: null }));
        } else {
          console.error('Error al subir a Supabase Storage:', json);
          res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: json.message || 'Error al subir archivo' } }));
        }
      } catch (uploadErr) {
        console.error('Error de red al subir a Supabase Storage:', uploadErr.message);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: uploadErr.message } }));
      }
      return;
    }

    // ---------------------------------
    // API: STORAGE (REMOVE FILES)
    // ---------------------------------
    if (pathname === '/api/storage/remove' && req.method === 'POST') {
      const { bucket, filePaths } = await readJsonBody(req);

      if (!bucket || !filePaths || !Array.isArray(filePaths)) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: 'Parámetros inválidos' } }));
        return;
      }

      // Eliminar de Supabase Storage (almacenamiento permanente)
      try {
        const supabaseDeleteUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}`;
        const delRes = await fetch(supabaseDeleteUrl, {
          method: 'DELETE',
          headers: { ...supabaseStorageHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: filePaths }),
        });
        const delJson = await delRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: delJson, error: null }));
      } catch (delErr) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: delErr.message } }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: { message: `Ruta ${pathname} no encontrada` } }));

  } catch (err) {
    console.error('Error procesando petición:', err);
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ data: null, error: { message: err.message } }));
  }
});

// Escuchar en 0.0.0.0 para que Render enrute correctamente la conexión externa
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor activo y escuchando en puerto ${PORT}`);
});
