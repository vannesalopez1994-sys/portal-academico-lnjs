
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
    console.error('Error: VITE_SUPABASE_ANON_KEY is not defined in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const subjects = [
    'Matemáticas',
    'Castellano',
    'Inglés',
    'Biología',
    'Química',
    'Física',
    'Educación Física'
];

async function seedSubjects() {
    console.log('Seeding subjects...');

    for (const name of subjects) {
        const { data, error } = await supabase
            .from('materias')
            .upsert({ nombre_materia: name }, { onConflict: 'nombre_materia' })
            .select();

        if (error) {
            console.error(`Error seeding subject ${name}:`, error.message);
        } else {
            console.log(`Subject seeded/updated: ${name}`);
        }
    }

    console.log('Seeding complete.');
}

seedSubjects();
