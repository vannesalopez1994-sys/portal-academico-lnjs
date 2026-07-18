// setup-supabase-storage.js
// Crea los buckets de Supabase Storage y configura políticas públicas de lectura

const SUPABASE_URL = 'https://vwbyktkzvowphcgegiyd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YnlrdGt6dm93cGhjZ2VnaXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMyOTY1NywiZXhwIjoyMDk3OTA1NjU3fQ.VhGYxOVBEn6UwTYucHT_QgghOLP4HF7vO8QzB7PYrZQ';

const headers = {
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
};

async function createBucket(name) {
  console.log(`\n📦 Creando bucket: ${name}...`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: name, name: name, public: true, file_size_limit: 52428800, allowed_mime_types: null }),
  });
  const json = await res.json();
  if (res.ok) {
    console.log(`  ✅ Bucket "${name}" creado correctamente.`);
  } else if (json.error === 'Duplicate' || (json.message && json.message.includes('already exists'))) {
    console.log(`  ℹ️  Bucket "${name}" ya existía — actualizando a público...`);
    // Update existing bucket to be public
    const upRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ public: true, file_size_limit: 52428800 }),
    });
    const upJson = await upRes.json();
    if (upRes.ok) {
      console.log(`  ✅ Bucket "${name}" actualizado a público.`);
    } else {
      console.log(`  ⚠️  No se pudo actualizar: ${JSON.stringify(upJson)}`);
    }
  } else {
    console.log(`  ❌ Error: ${JSON.stringify(json)}`);
  }
}

async function createPolicy(bucketName, policyName, operation, definition) {
  console.log(`  📋 Creando política "${policyName}" (${operation})...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: policyName }),
  });
}

async function runSQLPolicy(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

async function verifyBuckets() {
  console.log('\n🔍 Verificando buckets existentes...');
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers });
  const json = await res.json();
  if (Array.isArray(json)) {
    console.log('  Buckets encontrados:');
    json.forEach(b => console.log(`    - ${b.name} (público: ${b.public})`));
  } else {
    console.log('  Respuesta:', JSON.stringify(json));
  }
  return Array.isArray(json) ? json : [];
}

async function uploadTest(bucket, fileName, content) {
  console.log(`\n🧪 Probando subida al bucket "${bucket}"...`);
  const formData = new FormData();
  const blob = new Blob([content], { type: 'text/plain' });
  
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'x-upsert': 'true',
    },
    body: blob,
  });
  const json = await res.json();
  if (res.ok) {
    console.log(`  ✅ Archivo de prueba subido: ${json.Key || fileName}`);
    // Get public URL
    const pubUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
    console.log(`  🔗 URL pública: ${pubUrl}`);
    return true;
  } else {
    console.log(`  ❌ Error al subir: ${JSON.stringify(json)}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Configurando Supabase Storage para el Portal Académico LNJS\n');
  console.log('='.repeat(60));

  // 1. Crear los buckets
  await createBucket('imagenes_sistema');
  await createBucket('documentos_pdf');

  // 2. Verificar que existan
  const buckets = await verifyBuckets();

  // 3. Probar subida en ambos buckets
  const imgOk = await uploadTest('imagenes_sistema', 'test-imagen.txt', 'Prueba de subida de imagen');
  const pdfOk = await uploadTest('documentos_pdf', 'test-documento.txt', 'Prueba de subida de PDF');

  console.log('\n' + '='.repeat(60));
  if (imgOk && pdfOk) {
    console.log('✅ ¡Todo listo! Los archivos ahora se guardan permanentemente en Supabase.');
    console.log('   Las imágenes y PDFs ya no se perderán cuando Render reinicie.');
  } else {
    console.log('⚠️  Hubo problemas con algunas pruebas. Revisa los mensajes arriba.');
  }
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
