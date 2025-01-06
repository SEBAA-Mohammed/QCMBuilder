export interface Test {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  status: 'draft' | 'published' | 'archived';
  time_limit: number | null;
  passing_score: number | null;
  is_randomized: boolean;
  attempts_allowed: number;
  created_at: string;
  updated_at: string;
}