(async () => {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) {
        const key = m[1];
        let val = m[2];
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set in environment or .env.local");
    process.exit(2);
  }

  try {
    const neon = await import("@neondatabase/serverless");
    const sql = neon.neon(process.env.DATABASE_URL);
    console.log(
      "Running test queries: leads, generated_links, lead_files counts",
    );
    const leads = await sql`SELECT count(*)::text as count FROM leads LIMIT 1`;
    let links =
      await sql`SELECT count(*)::text as count FROM generated_links LIMIT 1`;
    const files =
      await sql`SELECT count(*)::text as count FROM lead_files LIMIT 1`;
    console.log("leads:", leads, "\nlinks:", links, "\nlead_files:", files);

    const admins =
      await sql`SELECT id, name, email, is_superadmin FROM admins ORDER BY id`;
    console.log("admins:", admins);

    const joined = await sql`
      SELECT gl.id as gid, gl.token, gl.created_at, l.id as lead_id, l.username
      FROM generated_links gl
      LEFT JOIN leads l ON l.id = gl.lead_id
      ORDER BY gl.created_at DESC
      LIMIT 20
    `;
    console.log("recent generated_links joined with leads:", joined);

    const linkCount = Number(links[0]?.count || 0);
    if (linkCount === 0) {
      console.log(
        "No generated_links found — inserting a test link for lead_id=1",
      );
      const token = "test-token-" + Date.now();
      const inserted = await sql`
        INSERT INTO generated_links (lead_id, token, created_by_admin)
        VALUES (1, ${token}, 1)
        RETURNING id, lead_id, token, created_at
      `;
      console.log("Inserted test link:", inserted);

      links =
        await sql`SELECT id, lead_id, token, created_at FROM generated_links ORDER BY created_at DESC LIMIT 10`;
      console.log("generated_links rows:", links);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error connecting to Neon or running query:", err);
    process.exit(3);
  }
})();
