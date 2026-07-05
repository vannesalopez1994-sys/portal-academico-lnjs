import { spawn } from 'child_process';

console.log('\x1b[35m[SYSTEM] Iniciando entorno local (Vite + Proxy DB PostgreSQL)...\x1b[0m\n');

// Iniciar servidor db-server
const dbServer = spawn('node', ['db-server.js'], { stdio: 'pipe', shell: true });

dbServer.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line) console.log(`\x1b[36m[DB]\x1b[0m ${line}`);
  });
});

dbServer.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line) console.error(`\x1b[31m[DB ERROR]\x1b[0m ${line}`);
  });
});

// Iniciar Vite dev server
const viteServer = spawn('npx', ['vite', '--host'], { stdio: 'pipe', shell: true });

viteServer.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line) console.log(`\x1b[32m[VITE]\x1b[0m ${line}`);
  });
});

viteServer.stderr.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line) console.error(`\x1b[31m[VITE ERROR]\x1b[0m ${line}`);
  });
});

// Manejo de salida limpia para detener ambos procesos
function handleExit() {
  console.log('\n\x1b[35m[SYSTEM] Deteniendo servidores de desarrollo...\x1b[0m');
  try {
    dbServer.kill('SIGINT');
  } catch (e) {}
  try {
    viteServer.kill('SIGINT');
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
dbServer.on('close', (code) => {
  console.log(`\x1b[35m[SYSTEM] El servidor de DB se cerró con código ${code}\x1b[0m`);
  handleExit();
});
viteServer.on('close', (code) => {
  console.log(`\x1b[35m[SYSTEM] El servidor de Vite se cerró con código ${code}\x1b[0m`);
  handleExit();
});
