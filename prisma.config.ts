// Library imports
import dotenv from 'dotenv';
const shellDatabaseUrl = process.env.DATABASE_URL;
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
if (shellDatabaseUrl) {
    process.env.DATABASE_URL = shellDatabaseUrl;
}
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    // path to your Prisma schema file
    schema: path.join('prisma', 'schema.prisma'),

    // Connection URL for Prisma Migrate/Introspect (required in Prisma 7+)
    datasource: {
        url: process.env.DATABASE_URL!,
    },

    // migrations settings and (workaround) seed location
    migrations: {
        path: path.join('prisma', 'migrations'),

        // Add seed here (works reliably in many Prisma versions)
        seed: 'ts-node prisma/scripts/seed.js',
    },
});