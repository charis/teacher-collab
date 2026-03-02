// Library imports
import 'dotenv/config';  // load .env for Prisma CLI (optional / recommended)
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    // path to your Prisma schema file
    schema: path.join('prisma', 'schema.prisma'),
    
    // migrations settings and (workaround) seed location
    migrations: {
        path: path.join('prisma', 'migrations'),
        
        // Add seed here (works reliably in many Prisma versions)
        seed: 'ts-node prisma/scripts/seed.js',
    },
});