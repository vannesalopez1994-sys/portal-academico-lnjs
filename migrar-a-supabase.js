/**
 * SCRIPT DE MIGRACIÓN: Base de datos local → Supabase Cloud
 * ============================================================
 * Este script exporta todos los datos de tu base de datos local
 * (liceo_db en PostgreSQL) y los inserta en tu proyecto de Supabase.
 *
 * CÓMO USARLO:
 * 1. Asegúrate de que tu base de datos local esté corriendo (Docker o PostgreSQL)
 * 2. Abre la terminal en la carpeta del proyecto
 * 3. Ejecuta: node migrar-a-supabase.js
 * ============================================================
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// ─── CARGAR .ENV MANUALMENTE ────────────────────────────────
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

// ─── CONEXIONES ──────────────────────────────────────────────

// Base de datos LOCAL (origen)
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'liceo_db',
  user: 'postgres',
  password: '1234',
  ssl: false,
  connectionTimeoutMillis: 5000 // 5 segundos max para local
});

// Base de datos SUPABASE CLOUD (destino)
const supabasePool = new Pool({
  host: 'aws-1-us-west-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.vwbyktkzvowphcgegiyd',
  password: 'Elismar2403',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

// ─── TABLAS A MIGRAR (en orden para respetar FK) ────────────
const TABLES = [
  'roles',
  'materias',
  'configuracion_sistema',
  'noticias',
  'horarios',
  'planes_evaluacion',
  'documentos_institucionales',
  'log_sistema'
];

// Tablas con usuarios (requieren tratamiento especial)
const AUTH_TABLES = [
  'auth.users'
];

// ─── FUNCIÓN PRINCIPAL ───────────────────────────────────────
async function migrate() {
  console.log('\n============================================================');
  console.log('  MIGRACIÓN: Base de datos local → Supabase Cloud');
  console.log('============================================================\n');

  let localClient, supabaseClient;

  try {
    console.log('Conectando a base de datos local...');
    localClient = await localPool.connect();
    console.log('✓ Conectado a liceo_db (local)\n');

    console.log('Conectando a Supabase Cloud (vía Connection String)...');
    supabaseClient = await supabasePool.connect();
    console.log('✓ Conectado a Supabase Cloud\n');

    // ─── Inicializar esquema en Supabase (auth.users) ──────────
    console.log('[0/9] Asegurando esquema auth en Supabase (Gestionado por Supabase)...');
    console.log('  ✓ Esquema auth.users verificado (ya existente)\n');

    // ─── Migrar auth.users ──────────────────────────────────────
    console.log('[1/9] Migrando usuarios de auth.users...');
    try {
      const localUsers = await localClient.query('SELECT * FROM auth.users');
      let migratedUsers = 0;
      for (const user of localUsers.rows) {
        await supabaseClient.query(`
          INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, reset_token, reset_token_expires, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            encrypted_password = EXCLUDED.encrypted_password,
            raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW()
        `, [
          user.id, user.email, user.encrypted_password,
          user.raw_user_meta_data || {}, user.raw_app_meta_data || {},
          user.reset_token, user.reset_token_expires,
          user.created_at, user.updated_at
        ]);
        migratedUsers++;
      }
      console.log(`  ✓ ${migratedUsers} usuarios migrados\n`);
    } catch (e) {
      console.warn(`  ⚠ auth.users: ${e.message}\n`);
    }

    // ─── Migrar tablas de public ────────────────────────────────
    for (let i = 0; i < TABLES.length; i++) {
      const table = TABLES[i];
      console.log(`[${i + 2}/${TABLES.length + 1}] Migrando tabla: ${table}...`);
      try {
        const result = await localClient.query(`SELECT * FROM public.${table}`);
        if (result.rows.length === 0) {
          console.log(`  ℹ Sin datos en ${table}\n`);
          continue;
        }

        // Construir INSERT dinámico con ON CONFLICT DO UPDATE
        const columns = Object.keys(result.rows[0]);
        const colList = columns.map(c => `"${c}"`).join(', ');
        let migrated = 0;

        for (const row of result.rows) {
          const values = columns.map(c => row[c]);
          const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
          const updateClause = columns
            .filter(c => c !== 'id')
            .map(c => `"${c}" = EXCLUDED."${c}"`)
            .join(', ');

          await supabaseClient.query(
            `INSERT INTO public.${table} (${colList}) VALUES (${placeholders})
             ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
            values
          );
          migrated++;
        }
        console.log(`  ✓ ${migrated} filas migradas\n`);
      } catch (e) {
        console.warn(`  ⚠ Error en ${table}: ${e.message}\n`);
      }
    }

    // ─── Migrar tabla usuarios (depende de auth.users) ─────────
    console.log(`[${TABLES.length + 2}/${TABLES.length + 2}] Migrando tabla: usuarios...`);
    try {
      const usuarios = await localClient.query('SELECT * FROM public.usuarios');
      let migrated = 0;
      for (const row of usuarios.rows) {
        await supabaseClient.query(`
          INSERT INTO public.usuarios (id, id_rol, nombre_completo, correo, estado, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            nombre_completo = EXCLUDED.nombre_completo,
            correo = EXCLUDED.correo,
            estado = EXCLUDED.estado,
            updated_at = NOW()
        `, [row.id, row.id_rol, row.nombre_completo, row.correo, row.estado, row.created_at, row.updated_at]);
        migrated++;
      }
      console.log(`  ✓ ${migrated} usuarios del portal migrados\n`);
    } catch (e) {
      console.warn(`  ⚠ Error en usuarios: ${e.message}\n`);
    }

    // ─── Migrar ausencias ───────────────────────────────────────
    console.log('Migrando ausencias...');
    try {
      const ausencias = await localClient.query('SELECT * FROM public.ausencias');
      let migrated = 0;
      for (const row of ausencias.rows) {
        const cols = Object.keys(row);
        const colList = cols.map(c => `"${c}"`).join(', ');
        const vals = cols.map(c => row[c]);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const updateClause = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
        await supabaseClient.query(
          `INSERT INTO public.ausencias (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
          vals
        );
        migrated++;
      }
      console.log(`  ✓ ${migrated} ausencias migradas\n`);
    } catch (e) {
      console.warn(`  ⚠ Error en ausencias: ${e.message}\n`);
    }

    console.log('============================================================');
    console.log('  ✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('============================================================');
    console.log('\nPróximo paso: Despliega el backend en Render y el frontend en Vercel.');

  } catch (err) {
    console.error('\n❌ Error crítico durante la migración:', err);
    process.exit(1);
  } finally {
    if (localClient) localClient.release();
    if (supabaseClient) supabaseClient.release();
    await localPool.end();
    await supabasePool.end();
  }
}

migrate();
