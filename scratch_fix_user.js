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
    // Check if user 14fa40a3 exists in auth.users
    const authRes = await pool.query(
      "SELECT id, email, raw_user_meta_data FROM auth.users WHERE id = $1",
      ['14fa40a3-11d7-47a9-a6e4-e328b487e3e6']
    );
    console.log('User in auth.users:', authRes.rows);

    // Check if user exists in public.usuarios
    const pubRes = await pool.query(
      "SELECT id FROM public.usuarios WHERE id = $1",
      ['14fa40a3-11d7-47a9-a6e4-e328b487e3e6']
    );
    console.log('User in public.usuarios:', pubRes.rows);

    if (authRes.rows.length > 0 && pubRes.rows.length === 0) {
      // Get the Representante role ID
      const roleRes = await pool.query(
        "SELECT id_rol FROM public.roles WHERE nombre_rol = 'Representante' LIMIT 1"
      );
      const idRol = roleRes.rows[0]?.id_rol;
      
      const userData = authRes.rows[0];
      const fullName = userData.raw_user_meta_data?.full_name || 'Antonio';
      const email = userData.email;

      console.log(`Inserting user: ${fullName} (${email}) with role ID: ${idRol}`);
      
      await pool.query(
        "INSERT INTO public.usuarios (id, nombre_completo, correo, id_rol) VALUES ($1, $2, $3, $4)",
        ['14fa40a3-11d7-47a9-a6e4-e328b487e3e6', fullName, email, idRol]
      );
      console.log('✅ User successfully inserted into public.usuarios!');
    } else if (pubRes.rows.length > 0) {
      console.log('✅ User already exists in public.usuarios, no fix needed.');
    } else {
      console.log('❌ User does not exist in auth.users either. Stale session needs to be cleared from browser localStorage.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
