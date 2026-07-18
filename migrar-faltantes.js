import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const { Pool } = pg;

// Cargar .env
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
  }
} catch (err) {
  console.warn('Advertencia al cargar .env:', err.message);
}

// Conexiones
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'liceo_db',
  user: 'postgres',
  password: '1234',
  ssl: false,
  connectionTimeoutMillis: 5000
});

const supabasePool = new Pool({
  host: 'aws-1-us-west-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.vwbyktkzvowphcgegiyd',
  password: 'Elismar2403',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

async function migrarDatosFaltantes() {
  console.log('\n============================================================');
  console.log('  MIGRACIÓN COMPLEMENTARIA: Roles + Usuarios + Ausencias');
  console.log('============================================================\n');

  let localClient, supabaseClient;

  try {
    localClient = await localPool.connect();
    console.log('✓ Conectado a liceo_db (local)\n');

    supabaseClient = await supabasePool.connect();
    console.log('✓ Conectado a Supabase Cloud\n');

    // ─── 1. Crear tablas necesarias en Supabase si no existen ──────
    console.log('[1/5] Asegurando que las tablas existen en Supabase...');
    
    // Crear auth.users personalizado (schema público, no el de Supabase)
    // Usamos public.auth_users en vez de auth.users
    await supabaseClient.query(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id_rol uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre_rol text NOT NULL UNIQUE
      );
    `);

    await supabaseClient.query(`
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
    console.log('  ✓ Tablas verificadas\n');

    // ─── 2. Migrar Roles ────────────────────────────────────────────
    console.log('[2/5] Migrando roles...');
    const rolesResult = await localClient.query('SELECT * FROM public.roles');
    let rolesCount = 0;
    for (const rol of rolesResult.rows) {
      await supabaseClient.query(`
        INSERT INTO public.roles (id_rol, nombre_rol)
        VALUES ($1, $2)
        ON CONFLICT (nombre_rol) DO UPDATE SET nombre_rol = EXCLUDED.nombre_rol
      `, [rol.id_rol, rol.nombre_rol]);
      rolesCount++;
    }
    console.log(`  ✓ ${rolesCount} roles migrados\n`);

    // ─── 3. Insertar/verificar datos de auth.users locales en public.auth_users ──
    console.log('[3/5] Migrando tabla auth.users a public.auth_users...');
    const authUsersResult = await localClient.query('SELECT * FROM auth.users');
    let authUsersCount = 0;
    for (const user of authUsersResult.rows) {
      await supabaseClient.query(`
        INSERT INTO public.auth_users (id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, reset_token, reset_token_expires, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE SET
          encrypted_password = EXCLUDED.encrypted_password,
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          updated_at = NOW()
      `, [
        user.id, user.email, user.encrypted_password,
        user.raw_user_meta_data || {}, user.raw_app_meta_data || {},
        user.reset_token || null, user.reset_token_expires || null,
        user.created_at, user.updated_at
      ]);
      authUsersCount++;
    }
    console.log(`  ✓ ${authUsersCount} usuarios auth migrados\n`);

    // ─── 4. Migrar tabla usuarios ────────────────────────────────────
    console.log('[4/5] Migrando tabla usuarios...');
    
    // Asegurar que la tabla usuarios referencia a public.auth_users (no auth.users)
    await supabaseClient.query(`
      CREATE TABLE IF NOT EXISTS public.usuarios (
        id uuid PRIMARY KEY REFERENCES public.auth_users(id) ON DELETE CASCADE,
        id_rol uuid REFERENCES public.roles(id_rol) ON DELETE SET NULL,
        nombre_completo text NOT NULL,
        correo text NOT NULL,
        estado text DEFAULT 'activo',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    const usuariosResult = await localClient.query('SELECT * FROM public.usuarios');
    let usuariosCount = 0;
    for (const row of usuariosResult.rows) {
      try {
        await supabaseClient.query(`
          INSERT INTO public.usuarios (id, id_rol, nombre_completo, correo, estado, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            nombre_completo = EXCLUDED.nombre_completo,
            correo = EXCLUDED.correo,
            estado = EXCLUDED.estado,
            updated_at = NOW()
        `, [row.id, row.id_rol, row.nombre_completo, row.correo, row.estado, row.created_at, row.updated_at]);
        usuariosCount++;
      } catch (e) {
        console.log(`  ⚠ Usuario ${row.correo}: ${e.message}`);
      }
    }
    console.log(`  ✓ ${usuariosCount} usuarios migrados\n`);

    // ─── 5. Migrar ausencias ─────────────────────────────────────────
    console.log('[5/5] Migrando ausencias...');
    const ausenciasResult = await localClient.query('SELECT * FROM public.ausencias');
    let ausenciasCount = 0;
    for (const row of ausenciasResult.rows) {
      try {
        const cols = Object.keys(row);
        const colList = cols.map(c => `"${c}"`).join(', ');
        const vals = cols.map(c => row[c]);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const updateClause = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
        await supabaseClient.query(
          `INSERT INTO public.ausencias (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
          vals
        );
        ausenciasCount++;
      } catch (e) {
        console.log(`  ⚠ Ausencia: ${e.message}`);
      }
    }
    console.log(`  ✓ ${ausenciasCount} ausencias migradas\n`);

    console.log('============================================================');
    console.log('  ✅ MIGRACIÓN COMPLEMENTARIA COMPLETADA');
    console.log('============================================================');

  } catch (err) {
    console.error('\n❌ Error crítico:', err);
    process.exit(1);
  } finally {
    if (localClient) localClient.release();
    if (supabaseClient) supabaseClient.release();
    await localPool.end();
    await supabasePool.end();
  }
}

migrarDatosFaltantes();
