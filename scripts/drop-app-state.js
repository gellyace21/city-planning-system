const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set. Aborting.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    console.log("Dropping table app_state if it exists...");
    await sql`DROP TABLE IF EXISTS app_state;`;
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to drop table:", err);
    process.exit(1);
  }
})();
