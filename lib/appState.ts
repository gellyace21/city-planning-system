import "server-only";

import { sql } from "@/lib/db";

export type AppState = {
  admins?: unknown[];
  leads?: unknown[];
  register_requests?: unknown[];
  generated_links?: unknown[];
  lead_files?: unknown[];
  file_comments?: unknown[];
  comments?: unknown[];
  notifications?: unknown[];
  aip_rows?: unknown[];
  monitoring_rows?: unknown[];
  edit_history?: unknown[];
  projects?: unknown[];
  monitoring_categories?: unknown[];
  [key: string]: unknown;
};

const STATE_ID = 1;

let initPromise: Promise<void> | null = null;

async function ensureState(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS app_state (
        id integer PRIMARY KEY,
        data jsonb NOT NULL DEFAULT '{}'::jsonb
      )
    `;

    const rows = (await sql`
      SELECT data
      FROM app_state
      WHERE id = ${STATE_ID}
    `) as Array<{ data: AppState }>;

    if (rows.length === 0) {
      await sql`
        INSERT INTO app_state (id, data)
        VALUES (${STATE_ID}, '{}'::jsonb)
      `;
    }
  })().catch((error) => {
    initPromise = null;
    throw error;
  });

  return initPromise;
}

export async function readAppState<T = AppState>(): Promise<T> {
  await ensureState();

  const rows = (await sql`
    SELECT data
    FROM app_state
    WHERE id = ${STATE_ID}
  `) as Array<{ data: T }>;

  return rows[0]?.data ?? ({} as T);
}

export async function writeAppState<T = AppState>(data: T): Promise<void> {
  await ensureState();

  await sql`
    UPDATE app_state
    SET data = ${JSON.stringify(data)}::jsonb
    WHERE id = ${STATE_ID}
  `;
}
