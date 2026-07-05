import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'liceo_db',
  user: 'postgres',
  password: '1234'
});

async function main() {
  try {
    const usersAuth = await pool.query('SELECT id, email, created_at FROM auth.users');
    console.log('--- auth.users ---');
    console.table(usersAuth.rows);

    const usersPublic = await pool.query(`
      SELECT u.id, u.nombre_completo, u.correo, r.nombre_rol 
      FROM public.usuarios u
      LEFT JOIN public.roles r ON u.id_rol = r.id_rol
    `);
    console.log('--- public.usuarios ---');
    console.table(usersPublic.rows);
  } catch (err) {
    console.error('Error querying database:', err.message);
  } finally {
    await pool.end();
  }
}

main();
