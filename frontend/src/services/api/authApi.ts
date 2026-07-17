export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  department?: string | null;
  is_active: boolean;
  is_manager: boolean;
  roles: string[];
  permissions: string[];
}
