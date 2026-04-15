export type RoleSource = 'table' | 'metadata' | 'email_whitelist' | 'fallback';

export interface CmsSession {
  user: {
    id: string;
    email: string | null;
  };
}
