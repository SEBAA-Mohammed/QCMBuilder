export interface User {
    id: number;
    full_name: string;
    email: string;
    role: 'teacher' | 'student';
    is_active: boolean;
    last_login: string | null;
    created_at: string;
    updated_at: string;
  }