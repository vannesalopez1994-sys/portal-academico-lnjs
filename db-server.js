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
const isCloud = process.env.DATABASE_HOST && process.env.DATABASE_HOST !== 'localhost';
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_DB || process.env.DATABASE_NAME || 'liceo_db',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '1234',
  ssl: isCloud ? { rejectUnauthorized: false } : false
});

// Configuración de Nodemailer Transporter
// En producción usa Resend (via SMTP); en local simula el envío si no hay API key
let mailTransporter = null;
if (process.env.RESEND_API_KEY) {
  mailTransporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY
    }
  });
  console.log('Transporter de correo configurado con Resend (producción).');
} else {
  console.log('RESEND_API_KEY no encontrada. Los correos serán simulados en consola (modo local).');
}


// Mapa en memoria para el rate limiting de inicio de sesión (Clave: email, Valor: { attempts: número, lockUntil: timestamp })
const loginAttempts = new Map();

// Asegurar base de datos inicializada (Esquema auth y tabla auth.users si no existen)
async function initDb(retries = 5, delay = 2000) {
  try {
    console.log('Verificando inicialización de base de datos...');
    
    // Crear esquema auth
    await pool.query('CREATE SCHEMA IF NOT EXISTS auth;');
    
    // Crear tabla auth.users si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        encrypted_password VARCHAR(255) NOT NULL,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
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
    
    console.log('Esquema auth, tabla auth.users y public.historial_accesos verificados.');

    // Migraciones de columnas: agregar campos nuevos si no existen
    const migrations = [
      `ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS ano_escolar VARCHAR(20)`,
      `ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS seccion VARCHAR(20)`,
      `ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS comentario_institucion TEXT`,
      `ALTER TABLE IF EXISTS auth.users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`,
      `ALTER TABLE IF EXISTS auth.users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ`,
      `ALTER TABLE IF EXISTS public.usuarios ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'activo'`,
      `ALTER TABLE IF EXISTS public.horarios ADD COLUMN IF NOT EXISTS anio_escolar TEXT`,
      `ALTER TABLE IF EXISTS public.ausencias ADD COLUMN IF NOT EXISTS telefono_representante VARCHAR(30)`,
    ];
    for (const migration of migrations) {
      try {
        await pool.query(migration);
        console.log(`Migración ejecutada: ${migration}`);
      } catch (migErr) {
        console.warn(`Advertencia en migración: ${migErr.message}`);
      }
    }
    console.log('Migraciones de columnas verificadas.');

    // Sembrar Administrador Máster si no existe
    try {
      const masterEmail = 'adminmaster2026l.n.joaquinas@gmail.com';
      const checkAdmin = await pool.query('SELECT id FROM auth.users WHERE email = $1', [masterEmail]);
      
      let userId;
      if (checkAdmin.rows.length === 0) {
        console.log('Sembrando Administrador Máster...');
        const initialPassword = process.env.MASTER_ADMIN_PASSWORD || 'LNJS2026master!';
        const hash = crypto.createHash('sha256').update(initialPassword).digest('hex');
        
        const insertUser = await pool.query(
          `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) 
           VALUES ($1, $2, $3) RETURNING id`,
          [masterEmail, hash, JSON.stringify({ full_name: 'Administrador Máster', role: 'admin' })]
        );
        userId = insertUser.rows[0].id;
        console.log('Administrador Máster creado en auth.users.');
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
    console.error('Error inicializando base de datos local:', err.message);
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
    // SERVIR ARCHIVOS ESTÁTICOS (Mock de Supabase Storage)
    // ----------------------------------------------------
    if (pathname.startsWith('/storage/')) {
      // Remover prefijo /storage/
      const relativePath = pathname.substring(9); // e.g. "documentos_pdf/archivo.pdf"
      const filePath = path.join(process.cwd(), 'storage', relativePath);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain', ...corsHeaders });
          res.end('Archivo no encontrado');
        } else {
          let contentType = 'application/octet-stream';
          if (filePath.endsWith('.pdf')) contentType = 'application/pdf';
          else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
          else if (filePath.endsWith('.png')) contentType = 'image/png';
          
          res.writeHead(200, { 'Content-Type': contentType, ...corsHeaders });
          res.end(data);
        }
      });
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

        // En updates no usamos alias t en SET, pero en WHERE sí para coherencia, o removemos alias t
        // Para simplificar, hacemos update sin alias en la tabla principal
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

      // Ejecutar conteo exacto si se pide y no es head-only sin datos
      let totalCount = null;
      if (count === 'exact') {
        const countSql = `SELECT COUNT(*) as count FROM public."${table}" t${whereClause}`;
        // Para count usamos los mismos parámetros que el filter
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

        // Transformar join de roles si aplica
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

        // Supabase devuelve un solo objeto si se resolvió con single()
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
        // En algunas funciones que retornan void, select * podría fallar o retornar sin filas
        console.error('Error en RPC:', err.message);
        // Intentar ejecutar como void CALL o SELECT void
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
        // Verificar si existe
        const checkRes = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: null }, error: { message: 'El usuario ya existe' } }));
          return;
        }

        const userMetadata = options?.data || {};

        const insertRes = await pool.query(
          `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) 
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
        // Verificar si la cuenta está bloqueada temporalmente
        const now = Date.now();
        const attempt = loginAttempts.get(email) || { attempts: 0, lockUntil: 0 };

        if (attempt.lockUntil > now) {
          const remainingMin = Math.ceil((attempt.lockUntil - now) / (60 * 1000));
          res.writeHead(429, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ 
            data: { user: null, session: null }, 
            error: { message: `Demasiados intentos fallidos. Tu cuenta está bloqueada. Inténtalo de nuevo en ${remainingMin} minuto(s).` } 
          }));
          return;
        }

        const hash = hashPassword(password);

        // Verificar si la cuenta está activa
        const statusRes = await pool.query(
          'SELECT estado FROM public.usuarios WHERE correo = $1',
          [email]
        );
        if (statusRes.rows.length > 0 && statusRes.rows[0].estado === 'inactivo') {
          res.writeHead(403, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({
            data: { user: null, session: null },
            error: { message: 'Tu cuenta ha sido desactivada por la institución. Comunícate con coordinación.' }
          }));
          return;
        }

        const dbRes = await pool.query(
          'SELECT id, email, encrypted_password, raw_user_meta_data, created_at FROM auth.users WHERE email = $1',
          [email]
        );

        if (dbRes.rows.length === 0 || dbRes.rows[0].encrypted_password !== hash) {
          // Credenciales incorrectas: incrementar intentos fallidos
          attempt.attempts += 1;
          const remainingAttempts = 5 - attempt.attempts;

          if (attempt.attempts >= 5) {
            attempt.lockUntil = now + 15 * 60 * 1000; // Bloqueo de 15 minutos
            loginAttempts.set(email, attempt);
            res.writeHead(429, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ 
              data: { user: null, session: null }, 
              error: { message: 'Tu cuenta ha sido bloqueada temporalmente por 15 minutos debido a 5 intentos fallidos de inicio de sesión.' } 
            }));
          } else {
            loginAttempts.set(email, attempt);
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ 
              data: { user: null, session: null }, 
              error: { message: `Credenciales inválidas. Te quedan ${remainingAttempts} intentos antes de bloquear la cuenta.` } 
            }));
          }
          return;
        }

        // Éxito: Limpiar intentos fallidos
        loginAttempts.delete(email);

        const userRow = dbRes.rows[0];

        // Registrar el acceso exitoso en public.historial_accesos
        try {
          await pool.query(
            'INSERT INTO public.historial_accesos (usuario_id, correo) VALUES ($1, $2)',
            [userRow.id, userRow.email]
          );
        } catch (logErr) {
          console.error('Error al registrar historial de acceso:', logErr.message);
        }

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
          'SELECT id FROM auth.users WHERE id = $1',
          [userId]
        );
        const valid = dbRes.rows.length > 0;
        if (!valid) {
          console.log(`[Auth] validate-session: userId ${userId} not found in auth.users — session is stale.`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ valid }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ valid: true, error: err.message })); // Fail open
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
          // Restablecimiento con token de recuperación
          const userCheck = await pool.query(
            'SELECT id FROM auth.users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
          );
          if (userCheck.rows.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
            res.end(JSON.stringify({ data: null, error: { message: 'El enlace de restablecimiento es inválido o ha expirado' } }));
            return;
          }
          const targetUserId = userCheck.rows[0].id;
          await pool.query(
            'UPDATE auth.users SET encrypted_password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
            [hash, targetUserId]
          );
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: { id: targetUserId } }, error: null }));
        } else if (userId) {
          // Cambio de contraseña normal estando logueado
          await pool.query('UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);
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
        // 1. Validar que el usuario exista en auth.users
        const checkRes = await pool.query('SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = $1', [email]);
        if (checkRes.rows.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: 'El correo ingresado no coincide con ningún usuario' } }));
          return;
        }

        const userRow = checkRes.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 3600000); // 1 hora de validez

        // 2. Guardar token en db
        await pool.query(
          'UPDATE auth.users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
          [token, tokenExpires, userRow.id]
        );

        // 3. Generar enlace de recuperación
        const resetLink = `${redirectTo || 'http://localhost:5173/reset-password'}?token=${token}`;

        // 4. Enviar correo usando nodemailer
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

        // 4. Enviar correo usando nodemailer (Resend en producción, simulación en local)
        if (mailTransporter) {
          try {
            const fromAddress = process.env.RESEND_FROM_EMAIL || 'Portal Académico <no-reply@resend.dev>';
            await mailTransporter.sendMail({
              from: fromAddress,
              to: email,
              subject: mailOptions.subject,
              html: mailOptions.html
            });
            console.log(`Correo de recuperación enviado exitosamente a: ${email}`);
          } catch (mailErr) {
            console.error('Error enviando correo via Resend:', mailErr.message);
            // No bloqueamos el flujo si falla el correo; el token ya está guardado
          }
        } else {
          console.log("--- SIMULACIÓN LOCAL: Correo de recuperación ---");
          console.log(`Para: ${email}`);
          console.log(`Enlace: ${resetLink}`);
          console.log("-----------------------------------------------");
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
        const checkRes = await pool.query('SELECT id FROM auth.users WHERE email = $1', [email]);
        if (checkRes.rows.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: { user: null }, error: { message: 'El usuario ya existe' } }));
          return;
        }

        const insertRes = await pool.query(
          `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data) 
           VALUES ($1, $2, $3) RETURNING id, email, raw_user_meta_data, created_at`,
          [email, hash, JSON.stringify(user_metadata || {})]
        );

        const newUser = {
          id: insertRes.rows[0].id,
          email: insertRes.rows[0].email,
          user_metadata: user_metadata || {},
          created_at: insertRes.rows[0].created_at
        };

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
        const userCheck = await pool.query('SELECT email FROM auth.users WHERE id = $1', [id]);
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
          await pool.query('UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2', [hash, id]);
        }
        if (user_metadata) {
          await pool.query('UPDATE auth.users SET raw_user_meta_data = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(user_metadata), id]);
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
        const userCheck = await pool.query('SELECT email FROM auth.users WHERE id = $1', [id]);
        if (userCheck.rows.length > 0 && userCheck.rows[0].email === 'adminmaster2026l.n.joaquinas@gmail.com') {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
          res.end(JSON.stringify({ data: null, error: { message: 'No está permitido eliminar la cuenta del Administrador Máster del sistema.' } }));
          return;
        }
        await pool.query('DELETE FROM auth.users WHERE id = $1', [id]);
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

      if (!bucket || !filePath) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: 'Bucket o ruta faltantes' } }));
        return;
      }

      const destDir = path.join(process.cwd(), 'storage', bucket, path.dirname(filePath));
      fs.mkdirSync(destDir, { recursive: true });

      const destPath = path.join(destDir, path.basename(filePath));
      const writeStream = fs.createWriteStream(destPath);

      req.pipe(writeStream);

      writeStream.on('finish', () => {
        console.log(`Archivo guardado exitosamente en: ${destPath}`);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: { path: filePath }, error: null }));
      });

      writeStream.on('error', (err) => {
        console.error('Error al guardar el archivo:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ data: null, error: { message: err.message } }));
      });
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

      const deleted = [];
      const errors = [];

      for (const filePath of filePaths) {
        const diskPath = path.join(process.cwd(), 'storage', bucket, filePath);
        try {
          if (fs.existsSync(diskPath)) {
            fs.unlinkSync(diskPath);
            deleted.push(filePath);
          }
        } catch (err) {
          errors.push({ path: filePath, error: err.message });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ data: deleted, error: errors.length > 0 ? errors : null }));
      return;
    }

    // Ruta 404 por defecto para API
    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: { message: `Ruta ${pathname} no encontrada` } }));

  } catch (err) {
    console.error('Error procesando petición:', err);
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ data: null, error: { message: err.message } }));
  }
});

server.listen(PORT, () => {
  console.log(`Servidor base de datos proxy local ejecutándose en http://localhost:${PORT}`);
});
