import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'secretary' | 'parent';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Absence {
  id: string;
  parent_id: string;
  student_name: string;
  reason: string;
  date_from: string;
  date_to: string;
  document_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  comments?: string;
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}
