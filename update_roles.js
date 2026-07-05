import { createClient } from '@supabase/supabase-js';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// Optional: local service role key is also static in supabase cli, but let's see if we can just sign up
const supabase = createClient(LOCAL_URL, LOCAL_ANON_KEY);

async function run() {
    console.log('Update roles to English...');

    const { error: errorAdmin } = await supabase.from('roles').update({ nombre_rol: 'admin' }).eq('nombre_rol', 'Administrador');
    if (errorAdmin) console.error('Error admin:', errorAdmin.message);

    const { error: errorSecretary } = await supabase.from('roles').update({ nombre_rol: 'secretary' }).eq('nombre_rol', 'Secretaría');
    if (errorSecretary) console.error('Error secretary:', errorSecretary.message);

    const { error: errorParent } = await supabase.from('roles').update({ nombre_rol: 'parent' }).eq('nombre_rol', 'Representante');
    if (errorParent) console.error('Error parent:', errorParent.message);

    console.log('Roles update complete.');
}

run();
