import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// Optional: local service role key is also static in supabase cli, but let's see if we can just sign up
const supabase = createClient(LOCAL_URL, LOCAL_ANON_KEY);

async function run() {
    console.log('Verificando conexión y tabla roles...');

    // 1. Verificar/Insertar Roles
    let { data: roles, error: rolesError } = await supabase.from('roles').select('*');

    if (rolesError) {
        console.error('Error conexion a roles:', rolesError.message);
        return;
    }

    if (!roles || roles.length === 0) {
        console.log('No roles found, inserting...');
        const rolesToInsert = [
            { nombre_rol: 'Administrador' },
            { nombre_rol: 'Secretaría' },
            { nombre_rol: 'Representante' }
        ];

        // We don't specify id_rol, expecting it to auto-generate if it's uuid with default gen_random_uuid()
        const { data: newRoles, error: insertRolesErr } = await supabase
            .from('roles')
            .insert(rolesToInsert)
            .select('*');

        if (insertRolesErr) {
            console.error('Error insertando roles:', insertRolesErr.message);
            return;
        }
        roles = newRoles;
        console.log('Roles insertados:', roles);
    } else {
        console.log('Roles OK:', roles);
    }

    // 2. Crear un usuario de prueba (Administrador)
    console.log('Creando usuario admin@test.com...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'admin@test.com',
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Admin Local',
            }
        }
    });

    if (authError) {
        console.error('Sign up error (quizá ya existe):', authError.message);
    } else {
        console.log('Auth user OK:', authData?.user?.id);
    }

    // Login to make sure we have access or if it worked
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'admin@test.com',
        password: 'Password123!'
    });

    if (loginError) {
        console.error('Error login:', loginError.message);
        return;
    }

    const userId = sessionData.user.id;

    // 3. Vincular con la tabla `usuarios`
    const adminRole = roles.find(r => r.nombre_rol === 'Administrador');

    console.log('Insertando/Actualizando id en tabla usuarios:', userId);
    const { error: usuError } = await supabase.from('usuarios').upsert({
        id: userId,
        id_rol: adminRole?.id_rol,
        nombre_completo: 'Admin Local',
        correo: 'admin@test.com'
    });

    if (usuError) {
        console.error('Error upsert tabla usuarios:', usuError.message);
    } else {
        console.log('Usuario de prueba insertado exitosamente en `usuarios` vinculándolo con el Rol Admin.');
        console.log('¡Puedes ingresar con: admin@test.com / Password123!');
    }
}

run();
