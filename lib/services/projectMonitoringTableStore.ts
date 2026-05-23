import "server-only";

import { sql } from "@/lib/db";

export type MonitoringTableState = {
  projects?: Array<{
    id: number;
    project_name: string;
    year?: number | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }>;
  monitoring_categories?: Array<{
    id: number;
    project_id?: number | null;
    name: string;
    created_at?: string | null;
  }>;
  admins?: Array<{
    id: number;
    name: string;
    email: string;
    password_hash: string;
    profile_pic?: string | null;
    is_superadmin?: boolean | null;
    is_active?: boolean | null;
    phone?: string | null;
    created_at?: string | null;
  }>;
  leads?: Array<{
    id: number;
    token: string;
    username?: string | null;
    password_hash?: string | null;
    department?: string | null;
    is_active?: boolean | null;
    created_at?: string | null;
  }>;
  lead_files?: Array<{
    id: number;
    lead_id?: number | null;
    project_id?: number | null;
    file_name: string;
    department?: string | null;
    row_count?: number | null;
    deleted?: boolean | null;
    uploaded_at?: string | null;
    is_submitted?: boolean | null;
    submitted_at?: string | null;
  }>;
  aip_rows?: Array<Record<string, unknown>>;
  monitoring_rows?: Array<Record<string, unknown>>;
  edit_history?: Array<Record<string, unknown>>;
  comments?: Array<Record<string, unknown>>;
  file_comments?: Array<Record<string, unknown>>;
  notifications?: Array<Record<string, unknown>>;
};

const DEFAULT_PROJECT = {
  id: 1,
  project_name: "Default Project",
  year: new Date().getFullYear(),
  status: "ongoing",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const selectRows = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
  return (await query) as T[];
};

const ensureDefaultProject = (
  projects: MonitoringTableState["projects"],
): MonitoringTableState["projects"] => {
  if (projects && projects.length > 0) {
    return projects;
  }
  return [DEFAULT_PROJECT];
};

export async function readMonitoringTableState(): Promise<MonitoringTableState> {
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id serial PRIMARY KEY,
      project_name text NOT NULL,
      year integer,
      status text DEFAULT 'ongoing',
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_categories (
      id serial PRIMARY KEY,
      project_id integer UNIQUE,
      name text NOT NULL UNIQUE,
      created_at timestamp with time zone DEFAULT now(),
      CONSTRAINT monitoring_categories_project_id_name_key UNIQUE(project_id, name)
    )
  `;

  const [
    projects,
    monitoringCategories,
    admins,
    leads,
    leadFiles,
    aipRows,
    monitoringRows,
    editHistory,
    comments,
    fileComments,
    notifications,
  ] = await Promise.all([
    selectRows<NonNullable<MonitoringTableState["projects"]>[number]>(sql`
        SELECT id, project_name, year, status, created_at, updated_at
        FROM projects
        ORDER BY id ASC
      `),
    selectRows<
      NonNullable<MonitoringTableState["monitoring_categories"]>[number]
    >(sql`
        SELECT id, project_id, name, created_at
        FROM monitoring_categories
        ORDER BY id ASC
      `),
    selectRows<NonNullable<MonitoringTableState["admins"]>[number]>(sql`
        SELECT id, name, email, password_hash, profile_pic, is_superadmin, is_active, phone, created_at
        FROM admins
        ORDER BY id ASC
      `),
    selectRows<NonNullable<MonitoringTableState["leads"]>[number]>(sql`
        SELECT id, token, username, password_hash, department, is_active, created_at
        FROM leads
        ORDER BY id ASC
      `),
    selectRows<NonNullable<MonitoringTableState["lead_files"]>[number]>(sql`
        SELECT id, lead_id, project_id, file_name, department, row_count, deleted, uploaded_at, is_submitted, submitted_at
        FROM lead_files
        ORDER BY id ASC
      `),
    selectRows<Record<string, unknown>>(sql`
        SELECT *
        FROM aip_rows
        ORDER BY id ASC
      `),
    selectRows<Record<string, unknown>>(sql`
        SELECT *
        FROM monitoring_rows
        ORDER BY id ASC
      `),
    selectRows<Record<string, unknown>>(sql`
        SELECT *
        FROM edit_history
        ORDER BY id ASC
      `),
    selectRows<Record<string, unknown>>(sql`
        SELECT *
        FROM comments
        ORDER BY id ASC
      `),
    selectRows<Record<string, unknown>>(sql`
        SELECT *
        FROM file_comments
        ORDER BY id ASC
      `),
    selectRows<Record<string, unknown>>(sql`
        SELECT *
        FROM notifications
        ORDER BY id ASC
      `),
  ]);

  return {
    projects: ensureDefaultProject(projects),
    monitoring_categories: monitoringCategories,
    admins,
    leads,
    lead_files: leadFiles,
    aip_rows: aipRows,
    monitoring_rows: monitoringRows,
    edit_history: editHistory,
    comments,
    file_comments: fileComments,
    notifications,
  };
}

const truncateMonitoringTables = async (): Promise<void> => {
  await sql`
    TRUNCATE TABLE
      notifications,
      comments,
      file_comments,
      edit_history,
      aip_rows,
      monitoring_rows,
      lead_files,
      monitoring_categories,
      leads,
      admins,
      projects
    RESTART IDENTITY CASCADE
  `;
};

const insertProjects = async (
  rows: NonNullable<MonitoringTableState["projects"]>,
): Promise<void> => {
  for (const row of rows) {
    await sql`
      INSERT INTO projects (id, project_name, year, status, created_at, updated_at)
      VALUES (${row.id}, ${row.project_name}, ${row.year ?? null}, ${row.status ?? "ongoing"}, ${row.created_at ?? null}, ${row.updated_at ?? null})
    `;
  }
};

const insertMonitoringCategories = async (
  rows: NonNullable<MonitoringTableState["monitoring_categories"]>,
): Promise<void> => {
  for (const row of rows) {
    await sql`
      INSERT INTO monitoring_categories (id, project_id, name, created_at)
      VALUES (${row.id}, ${row.project_id ?? null}, ${row.name}, ${row.created_at ?? null})
    `;
  }
};

const insertAdmins = async (
  rows: NonNullable<MonitoringTableState["admins"]>,
): Promise<void> => {
  for (const row of rows) {
    await sql`
      INSERT INTO admins (id, name, email, password_hash, profile_pic, is_superadmin, is_active, phone, created_at)
      VALUES (
        ${row.id},
        ${row.name},
        ${row.email},
        ${row.password_hash},
        ${row.profile_pic ?? null},
        ${Boolean(row.is_superadmin)},
        ${row.is_active ?? true},
        ${row.phone ?? null},
        ${row.created_at ?? null}
      )
    `;
  }
};

const insertLeads = async (
  rows: NonNullable<MonitoringTableState["leads"]>,
): Promise<void> => {
  for (const row of rows) {
    await sql`
      INSERT INTO leads (id, token, username, password_hash, department, is_active, created_at)
      VALUES (
        ${row.id},
        ${row.token},
        ${row.username ?? null},
        ${row.password_hash ?? null},
        ${row.department ?? null},
        ${row.is_active ?? true},
        ${row.created_at ?? null}
      )
    `;
  }
};

const insertLeadFiles = async (
  rows: NonNullable<MonitoringTableState["lead_files"]>,
): Promise<void> => {
  for (const row of rows) {
    await sql`
      INSERT INTO lead_files (id, lead_id, project_id, file_name, department, row_count, deleted, uploaded_at, is_submitted, submitted_at)
      VALUES (
        ${row.id},
        ${row.lead_id ?? null},
        ${row.project_id ?? null},
        ${row.file_name},
        ${row.department ?? null},
        ${row.row_count ?? null},
        ${row.deleted ?? false},
        ${row.uploaded_at ?? null},
        ${row.is_submitted ?? false},
        ${row.submitted_at ?? null}
      )
    `;
  }
};

const insertJsonRows = async (
  tableName:
    | "aip_rows"
    | "monitoring_rows"
    | "edit_history"
    | "comments"
    | "file_comments"
    | "notifications",
  rows: Array<Record<string, unknown>>,
): Promise<void> => {
  if (rows.length === 0) {
    return;
  }

  switch (tableName) {
    case "aip_rows":
      await sql`
        INSERT INTO aip_rows
          (id, project_id, upload_id, lead_id, row_number, year, sector, aip_code, description, department, start_date, end_date, outputs, funding, ps, mooe, fe, co, total, cc_adaptation, cc_mitigation, cc_code, created_at)
        SELECT
          id, project_id, upload_id, lead_id, row_number, year, sector, aip_code, description, department, start_date, end_date, outputs, funding, ps, mooe, fe, co, total, cc_adaptation, cc_mitigation, cc_code, created_at
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
          id integer,
          project_id integer,
          upload_id integer,
          lead_id integer,
          row_number integer,
          year integer,
          sector text,
          aip_code text,
          description text,
          department text,
          start_date text,
          end_date text,
          outputs text,
          funding text,
          ps numeric,
          mooe numeric,
          fe numeric,
          co numeric,
          total numeric,
          cc_adaptation numeric,
          cc_mitigation numeric,
          cc_code text,
          created_at timestamp with time zone
        )
      `;
      break;
    case "monitoring_rows":
      await sql`
        INSERT INTO monitoring_rows
          (id, project_id, upload_id, category_id, row_number, project_name, agency, location, approved_budget, certified_amount, obligation, actual_cost, funding, certified_date, major_findings, issues, status_percent, action_recommendation, remarks, created_at)
        SELECT
          id, project_id, upload_id, category_id, row_number, project_name, agency, location, approved_budget, certified_amount, obligation, actual_cost, funding, certified_date, major_findings, issues, status_percent, action_recommendation, remarks, created_at
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
          id integer,
          project_id integer,
          upload_id integer,
          category_id integer,
          row_number integer,
          project_name text,
          agency text,
          location text,
          approved_budget numeric,
          certified_amount numeric,
          obligation numeric,
          actual_cost numeric,
          funding text,
          certified_date date,
          major_findings text,
          issues text,
          status_percent integer,
          action_recommendation text,
          remarks text,
          created_at timestamp with time zone
        )
      `;
      break;
    case "edit_history":
      await sql`
        INSERT INTO edit_history
          (id, project_id, entity_name, row_id, column_name, old_value, new_value, action_type, change_status, row_snapshot, edited_by_admin, edited_by_role, reviewed_by_admin, reviewed_at, edited_at)
        SELECT
          id, project_id, entity_name, row_id, column_name, old_value, new_value, action_type, change_status, row_snapshot, edited_by_admin, edited_by_role, reviewed_by_admin, reviewed_at, edited_at
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
          id integer,
          project_id integer,
          entity_name text,
          row_id integer,
          column_name text,
          old_value text,
          new_value text,
          action_type text,
          change_status text,
          row_snapshot jsonb,
          edited_by_admin integer,
          edited_by_role text,
          reviewed_by_admin integer,
          reviewed_at timestamp with time zone,
          edited_at timestamp with time zone
        )
      `;
      break;
    case "comments":
      await sql`
        INSERT INTO comments
          (id, project_id, entity_name, row_id, column_name, comment_text, created_by_id, created_by_role, created_at)
        SELECT
          id, project_id, entity_name, row_id, column_name, comment_text, created_by_id, created_by_role, created_at
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
          id integer,
          project_id integer,
          entity_name text,
          row_id integer,
          column_name text,
          comment_text text,
          created_by_id integer,
          created_by_role text,
          created_at timestamp with time zone
        )
      `;
      break;
    case "file_comments":
      await sql`
        INSERT INTO file_comments
          (id, file_id, lead_id, comment_text, created_by_id, created_by_role, created_at)
        SELECT
          id, file_id, lead_id, comment_text, created_by_id, created_by_role, created_at
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
          id integer,
          file_id integer,
          lead_id integer,
          comment_text text,
          created_by_id integer,
          created_by_role text,
          created_at timestamp with time zone
        )
      `;
      break;
    case "notifications":
      await sql`
        INSERT INTO notifications
          (id, recipient_id, recipient_role, actor_id, actor_role, entity_name, row_id, column_name, message, read_at, created_at)
        SELECT
          id, recipient_id, recipient_role, actor_id, actor_role, entity_name, row_id, column_name, message, read_at, created_at
        FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
          id integer,
          recipient_id integer,
          recipient_role text,
          actor_id integer,
          actor_role text,
          entity_name text,
          row_id integer,
          column_name text,
          message text,
          read_at timestamp with time zone,
          created_at timestamp with time zone
        )
      `;
      break;
  }
};

export async function writeMonitoringTableState(
  state: MonitoringTableState,
): Promise<void> {
  const projects = ensureDefaultProject(state.projects);
  await truncateMonitoringTables();
  await insertProjects(projects ?? []);
  await insertMonitoringCategories(state.monitoring_categories ?? []);
  await insertAdmins(state.admins ?? []);
  await insertLeads(state.leads ?? []);
  await insertLeadFiles(state.lead_files ?? []);
  await insertJsonRows(
    "aip_rows",
    (state.aip_rows ?? []) as Array<Record<string, unknown>>,
  );
  await insertJsonRows(
    "monitoring_rows",
    (state.monitoring_rows ?? []) as Array<Record<string, unknown>>,
  );
  await insertJsonRows(
    "edit_history",
    (state.edit_history ?? []) as Array<Record<string, unknown>>,
  );
  await insertJsonRows(
    "comments",
    (state.comments ?? []) as Array<Record<string, unknown>>,
  );
  await insertJsonRows(
    "file_comments",
    (state.file_comments ?? []) as Array<Record<string, unknown>>,
  );
  await insertJsonRows(
    "notifications",
    (state.notifications ?? []) as Array<Record<string, unknown>>,
  );
}
