import { createContext } from 'react';
import type { UserRole } from '../../types';
import type { CmsSession, RoleSource } from '../../shared/types/auth';

export type AuthContextValue = {
  session: CmsSession | null;
  loading: boolean;
  role: UserRole['role'];
  roleSource: RoleSource;
  logout: () => Promise<void>;
  demoLogin: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
