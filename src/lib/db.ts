import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const libsql = createClient({
  url: process.env.DATABASE_URL!,
});

const adapter = new PrismaLibSQL(libsql);
export const db = new PrismaClient({ adapter });