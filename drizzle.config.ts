import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local for development
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
