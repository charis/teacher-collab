// Library imports
import { PrismaClient } from '@prisma/client'

// Single instance of the PrismaClient class
const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
export default prisma;
