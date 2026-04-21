// Library imports
import dotenv from 'dotenv';
const shellDatabaseUrl       = process.env.DATABASE_URL;
const shellDirectDatabaseUrl = process.env.DIRECT_DATABASE_URL;
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });
if (shellDatabaseUrl) {
    process.env.DATABASE_URL = shellDatabaseUrl;
}
if (shellDirectDatabaseUrl) {
    process.env.DIRECT_DATABASE_URL = shellDirectDatabaseUrl;
}
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// The Prisma CLI (migrate, studio, generate, ...) needs a direct Postgres
// connection — Prisma 7 Studio and migrate no longer accept Accelerate URLs
// (prisma:// / prisma+postgres://). Use DIRECT_DATABASE_URL when available,
// and fall back to DATABASE_URL for setups that aren't on Accelerate.
// The app runtime keeps using DATABASE_URL via the Accelerate extension.
const cliDatabaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
    // path to your Prisma schema file
    schema: path.join('prisma', 'schema.prisma'),

    // Connection URL for Prisma Migrate/Introspect (required in Prisma 7+)
    datasource: {
        url: cliDatabaseUrl!,
    },

    // migrations settings and (workaround) seed location
    migrations: {
        path: path.join('prisma', 'migrations'),

        // Add seed here (works reliably in many Prisma versions)
        seed: 'ts-node prisma/scripts/seed.js',
    },
});