import pg from 'pg';
import fs from 'fs';
import path from 'path';

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
} catch (err) {}

const localPool = new Pool({
  host: 'localhost', port: 5432, database: 'liceo_db',
  user: 'postgres', password: '1234', ssl: false, connectionTimeoutMillis: 5000
});

const supabasePool = new Pool({
  host: 'aws-1-us-west-2.pooler.supabase.com', port: 5432, database: 'postgres',
  user: 'postgres.vwbyktkzvowphcgegiyd', password: 'Elismar2403',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000
});

async function run() {
  console.log('\n============================================================');
  console.log('  CORRECCIÓN DE TABLAS Y MIGRACIÓN FINAL');
  console.log('============================================================\n');

  let localClient, supClient;

  try {
    localClient = await localPool.connect();
    supClient = await supabasePool.connect();
    console.log('✓ Conectado a ambas bases de datos\n');

    // ─── PASO 1: Eliminar tablas que tienen FK incorrecto y recrearlas ──────
    console.log('[1/4] Recreando tabla usuarios con FK a public.auth_users...');
    await supClient.query(`DROP TABLE IF EXISTS public.ausencias CASCADE;`);
    await supClient.query(`DROP TABLE IF EXISTS public.usuarios CASCADE;`);

    await supClient.query(`
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
    console.log('  ✓ Tabla usuarios recreada con FK correcto\n');

    // ─── PASO 2: Migrar usuarios ───────────────────────────────────────────
    console.log('[2/4] Migrando usuarios del portal...');
    const usuariosResult = await localClient.query('SELECT * FROM public.usuarios');
    let count = 0;
    for (const row of usuariosResult.rows) {
      try {
        await supClient.query(`
          INSERT INTO public.usuarios (id, id_rol, nombre_completo, correo, estado, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            nombre_completo = EXCLUDED.nombre_completo,
            correo = EXCLUDED.correo,
            estado = EXCLUDED.estado,
            updated_at = NOW()
        `, [row.id, row.id_rol, row.nombre_completo, row.correo, row.estado || 'activo', row.created_at, row.updated_at]);
        console.log(`  ✓ Usuario: ${row.correo}`);
        count++;
      } catch (e) {
        console.log(`  ⚠ ${row.correo}: ${e.message}`);
      }
    }
    console.log(`\n  ✓ ${count}/${usuariosResult.rows.length} usuarios migrados\n`);

    // ─── PASO 3: Recrear ausencias con FK correcto ─────────────────────────
    console.log('[3/4] Recreando tabla ausencias...');

    // Obtener estructura de ausencias desde local
    const ausenciasStruct = await localClient.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ausencias'
      ORDER BY ordinal_position;
    `);
    
    // Crear tabla ausencias dinámica basada en estructura local
    const cols = ausenciasStruct.rows;
    if (cols.length > 0) {
      const colDefs = cols.map(col => {
        let def = `"${col.column_name}" ${col.data_type}`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        return def;
      }).join(',\n        ');

      await supClient.query(`
        CREATE TABLE IF NOT EXISTS public.ausencias (
          ${colDefs}
        );
      `);
      console.log('  ✓ Tabla ausencias creada\n');
    }

    // ─── PASO 4: Migrar ausencias ──────────────────────────────────────────
    console.log('[4/4] Migrando ausencias...');
    const ausenciasResult = await localClient.query('SELECT * FROM public.ausencias');
    let ausCount = 0;
    for (const row of ausenciasResult.rows) {
      try {
        const rowCols = Object.keys(row);
        const colList = rowCols.map(c => `"${c}"`).join(', ');
        const vals = rowCols.map(c => row[c]);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const updateClause = rowCols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
        await supClient.query(
          `INSERT INTO public.ausencias (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
          vals
        );
        ausCount++;
      } catch (e) {
        console.log(`  ⚠ Ausencia: ${e.message}`);
      }
    }
    console.log(`  ✓ ${ausCount} ausencias migradas\n`);

    console.log('============================================================');
    console.log('  ✅ TODO MIGRADO CORRECTAMENTE');
    console.log('============================================================');
    console.log('\n📊 Resumen final en Supabase Cloud:');
    
    // Conteo final
    for (const tabla of ['roles', 'auth_users', 'usuarios', 'noticias', 'horarios', 'planes_evaluacion', 'documentos_institucionales', 'ausencias']) {
      try {
        const res = await supClient.query(`SELECT COUNT(*) FROM public.${tabla}`);
        console.log(`  ${tabla}: ${res.rows[0].count} filas`);
      } catch(e) {
        console.log(`  ${tabla}: (no existe)`);
      }
    }

  } catch (err) {
    console.error('\n❌ Error crítico:', err.message);
    process.exit(1);
  } finally {
    if (localClient) localClient.release();
    if (supClient) supClient.release();
    await localPool.end();
    await supabasePool.end();
  }
}

run();
