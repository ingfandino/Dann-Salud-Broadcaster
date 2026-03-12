const { execSync } = require('child_process');

try {
  execSync('npx tsc --noEmit', { cwd: '/home/dann-salud/Documentos/Dann-Salud-Broadcaster/frontend-nextjs', stdio: 'inherit' });
  console.log("Compile OK");
} catch (e) {
  console.log("Compile failed");
}
