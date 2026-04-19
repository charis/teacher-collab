const { spawn } = require('child_process');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

if (!process.env.DIRECT_DATABASE_URL) {
    console.error('DIRECT_DATABASE_URL is not set in .env or .env.local');
    process.exit(1);
}

process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;

const child = spawn('npx', ['prisma', 'studio'], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
