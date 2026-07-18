import pg from 'pg';
const { Pool } = pg;

const localPool = new Pool({ host: 'localhost', port: 5432, database: 'liceo_db', user: 'postgres', password: '1234', ssl: false });
const supPool = new Pool({ host: 'aws-1-us-west-2.pooler.supabase.com', port: 5432, database: 'postgres', user: 'postgres.vwbyktkzvowphcgegiyd', password: 'Elismar2403', ssl: { rejectUnauthorized: false } });

async function run() {
  let lc, sc;
  try {
    lc = await localPool.connect();
    sc = await supPool.connect();
    console.log('✓ Conectado a ambas bases de datos\n');

    // ─── 1. Construir mapa de roles: nombre → id_rol en Supabase ───────────
    const supRoles = await sc.query('SELECT id_rol, nombre_rol FROM public.roles');
    const rolMap = {};
    supRoles.rows.forEach(r => { rolMap[r.nombre_rol] = r.id_rol; });
    console.log('Mapa de roles en Supabase:', rolMap);

    // ─── 2. Construir mapa de auth_users: email → id en Supabase ───────────
    const supAuthUsers = await sc.query('SELECT id, email FROM public.auth_users');
    const authMap = {};
    supAuthUsers.rows.forEach(u => { authMap[u.email] = u.id; });
    console.log('\nMapa de usuarios auth en Supabase (emails→ids):', Object.keys(authMap).length, 'usuarios');

    // ─── 3. Migrar roles locales con su nombre hacia UUIDs de Supabase ──────
    console.log('\n[1/3] Verificando roles en local...');
    const localRoles = await lc.query('SELECT id_rol, nombre_rol FROM public.roles');
    const localRolMap = {}; // local id_rol → supabase id_rol
    for (const r of localRoles.rows) {
      if (rolMap[r.nombre_rol]) {
        localRolMap[r.id_rol] = rolMap[r.nombre_rol];
      }
    }
    console.log('Mapa local→supabase de roles:', localRolMap);

    // ─── 4. Migrar usuarios usando mapeo de IDs ─────────────────────────────
    console.log('\n[2/3] Migrando usuarios con IDs correctos...');
    const usuarios = await lc.query(`
      SELECT u.*, au.email as email_auth 
      FROM public.usuarios u 
      JOIN auth.users au ON u.id = au.id
    `);
    
    let count = 0;
    for (const u of usuarios.rows) {
      const supUserId = authMap[u.email_auth]; // ID del usuario en Supabase auth_users
      const supRolId = localRolMap[u.id_rol];   // ID del rol en Supabase

      if (!supUserId) {
        console.log(`  ⚠ Usuario ${u.email_auth}: no encontrado en auth_users de Supabase`);
        continue;
      }
      if (!supRolId) {
        console.log(`  ⚠ Usuario ${u.email_auth}: rol no mapeado (id_rol local: ${u.id_rol})`);
        continue;
      }

      try {
        await sc.query(`
          INSERT INTO public.usuarios (id, id_rol, nombre_completo, correo, estado, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            id_rol = EXCLUDED.id_rol,
            nombre_completo = EXCLUDED.nombre_completo,
            correo = EXCLUDED.correo,
            estado = EXCLUDED.estado,
            updated_at = NOW()
        `, [supUserId, supRolId, u.nombre_completo, u.correo, u.estado || 'activo', u.created_at, u.updated_at]);
        console.log(`  ✓ ${u.email_auth} → rol: ${supRolId}`);
        count++;
      } catch (e) {
        console.log(`  ⚠ ${u.email_auth}: ${e.message}`);
      }
    }
    console.log(`\n  ✓ ${count}/${usuarios.rows.length} usuarios migrados\n`);

    // ─── 5. Migrar ausencias con mapeo de IDs ───────────────────────────────
    console.log('[3/3] Migrando ausencias...');
    const ausencias = await lc.query(`
      SELECT a.*, au.email 
      FROM public.ausencias a 
      JOIN auth.users au ON a.id_representante = au.id
    `);
    
    let ausCount = 0;
    for (const a of ausencias.rows) {
      const supRepId = authMap[a.email]; // mapeamos id_representante local → supabase
      if (!supRepId) { console.log(`  ⚠ Rep. ${a.email} no encontrado en Supabase`); continue; }
      
      try {
        const cols = Object.keys(a).filter(c => c !== 'email'); // quitar campo auxiliar
        // Reemplazar id_representante con el ID de Supabase
        const row = { ...a };
        delete row.email;
        row.id_representante = supRepId;
        
        const colList = cols.map(c => `"${c}"`).join(', ');
        const vals = cols.map(c => row[c]);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        await sc.query(
          `INSERT INTO public.ausencias (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          vals
        );
        ausCount++;
      } catch (e) {
        console.log(`  ⚠ Ausencia: ${e.message}`);
      }
    }
    console.log(`  ✓ ${ausCount} ausencias migradas\n`);

    // ─── Resumen final ───────────────────────────────────────────────────────
    console.log('============================================================');
    console.log('  ✅ MIGRACIÓN COMPLETADA');
    console.log('============================================================');
    const tablas = ['roles', 'auth_users', 'usuarios', 'noticias', 'horarios', 'planes_evaluacion', 'documentos_institucionales', 'ausencias'];
    for (const t of tablas) {
      const r = await sc.query(`SELECT COUNT(*) FROM public.${t}`);
      console.log(`  ${t}: ${r.rows[0].count} filas`);
    }

  } catch (e) {
    console.error('\n❌ Error:', e.message);
  } finally {
    if(lc) lc.release(); if(sc) sc.release();
    await localPool.end(); await supPool.end();
  }
}
run();
