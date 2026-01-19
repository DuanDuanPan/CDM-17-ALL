import * as dotenv from 'dotenv';
import * as path from 'path';
import { defineConfig, env } from "prisma/config";

// Load .env from project root (monorepo structure)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'npx tsx prisma/seed.ts',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});

