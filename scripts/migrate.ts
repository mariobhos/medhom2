/**
 * Applies pending Drizzle migrations.
 *
 * Local:      npm run db:migrate
 * Production: DATABASE_URL="<production url>" npm run db:migrate
 */
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local or pass it inline.");
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    ssl: connectionString.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
  });

  const target = connectionString.replace(/\/\/[^@]*@/, "//***@");
  console.log(`Running migrations against ${target}`);

  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
