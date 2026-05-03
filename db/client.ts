import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 10, idle_timeout: 30 }) : null;

export const db = sql ? drizzle(sql, { schema }) : null;
export const isPostgresEnabled = sql !== null;
