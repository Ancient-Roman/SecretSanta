import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// For migrations and direct query access
export const client = postgres(connectionString);

// ORM instance
export const db = drizzle(client, { schema });

export * from './schema';
