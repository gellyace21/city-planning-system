export interface Admin {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  password_hash: string;
  created_at: string;
  profile_pic: string;
  is_superadmin: boolean;
}

export interface Lead {
  id: number;
  token: string;
  username: string;
  password_hash: string;
  is_active: boolean;
  department: string;
  created_at: string;
}
