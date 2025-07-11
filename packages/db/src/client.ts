import * as schema from "./drizzle/schema";
import env from "./env";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
	connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool, { schema: schema });
export * from "./drizzle/schema";
