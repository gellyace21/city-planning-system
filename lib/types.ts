export type Admin = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  profile_pic: string | null;
  is_superadmin: boolean;
  is_active: boolean;
  phone: string | null;
  created_at: string;
};

export type Lead = {
  id: number;
  token: string;
  username: string | null;
  password_hash: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
};

export type RegisterRequest = {
  id: number;
  token: string;
  username: string | null;
  password_hash: string | null;
  department: string | null;
  status: string;
  created_at: string;
};

export type Project = {
  id: number;
  project_name: string;
  year: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadFile = {
  id: number;
  lead_id: number | null;
  project_id: number | null;
  file_name: string;
  department: string | null;
  row_count: number | null;
  deleted: boolean;
  uploaded_at: string;
};

export type AipRow = {
  id: number;
  project_id: number | null;
  upload_id: number | null;
  lead_id: number | null;
  row_number: number | null;
  year: number | null;
  sector: string | null;
  aip_code: string | null;
  description: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  outputs: string | null;
  funding: string | null;
  ps: number;
  mooe: number;
  fe: number;
  co: number;
  total: number;
  cc_adaptation: number;
  cc_mitigation: number;
  cc_code: string | null;
  created_at: string;
};

export type MonitoringCategory = {
  id: number;
  project_id: number | null;
  name: string;
  created_at: string;
};

export type MonitoringRow = {
  id: number;
  project_id: number | null;
  upload_id: number | null;
  category_id: number | null;
  row_number: number | null;
  project_name: string | null;
  agency: string | null;
  location: string | null;
  approved_budget: number;
  certified_amount: number;
  obligation: number;
  actual_cost: number;
  funding: string | null;
  certified_date: string | null;
  major_findings: string | null;
  issues: string | null;
  status_percent: number;
  action_recommendation: string | null;
  remarks: string | null;
  created_at: string;
};

export type GeneratedLink = {
  id: number;
  lead_id: number | null;
  token: string;
  created_by_admin: number | null;
  created_at: string;
};

export type EditHistory = {
  id: number;
  project_id: number | null;
  entity_name: string;
  row_id: number;
  column_name: string;
  old_value: string | null;
  new_value: string | null;
  action_type: string | null;
  change_status: string | null;
  row_snapshot: Record<string, unknown> | null;
  edited_by_admin: number | null;
  edited_by_role: string | null;
  reviewed_by_admin: number | null;
  reviewed_at: string | null;
  edited_at: string;
};

export type Comment = {
  id: number;
  project_id: number | null;
  entity_name: string;
  row_id: number;
  column_name: string | null;
  comment_text: string;
  created_by_id: number;
  created_by_role: string;
  created_at: string;
};

export type FileComment = {
  id: number;
  file_id: number | null;
  lead_id: number | null;
  comment_text: string;
  created_by_id: number;
  created_by_role: string;
  created_at: string;
};

export type Notification = {
  id: number;
  recipient_id: number;
  recipient_role: string;
  actor_id: number;
  actor_role: string;
  entity_name: string | null;
  row_id: number | null;
  column_name: string | null;
  message: string | null;
  read_at: string | null;
  created_at: string;
};
