import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import type { UserRole } from '../../types';
import type { CmsSession, RoleSource } from '../../shared/types/auth';
import { AuthContext } from './auth-context';

const mapRoleFromMetadata = (session: { user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } }) => {
  const roleFromMetadata = String(session.user.app_metadata?.role || session.user.user_metadata?.role || '').toLowerCase();
  const fallbackRole: UserRole['role'] = roleFromMetadata === 'admin' ? 'admin' : 'editor';
  const fallbackSource: RoleSource = roleFromMetadata === 'admin' ? 'metadata' : 'fallback';
  return { fallbackRole, fallbackSource };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<CmsSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole['role']>('editor');
  const [roleSource, setRoleSource] = useState<RoleSource>('fallback');

  const adminEmailWhitelist = useMemo(
    () =>
      String(import.meta.env.VITE_ADMIN_EMAILS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    []
  );

  const fetchRole = async (
    userId: string,
    fallbackRole: UserRole['role'] = 'editor',
    fallbackSource: RoleSource = 'fallback'
  ) => {
    try {
      const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).single();
      if (error) {
        setRole(fallbackRole);
        setRoleSource(fallbackSource);
        return;
      }

      const resolved = String(data?.role || '').toLowerCase();
      setRole(resolved === 'admin' ? 'admin' : 'editor');
      setRoleSource('table');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
        return;
      }

      const email = session.user.email ?? null;
      const { fallbackRole, fallbackSource } = mapRoleFromMetadata(session);
      const isEmailWhitelisted = !!email && adminEmailWhitelist.includes(email.toLowerCase());

      setSession({ user: { id: session.user.id, email } });

      if (isEmailWhitelisted) {
        setRole('admin');
        setRoleSource('email_whitelist');
        setLoading(false);
        return;
      }

      void fetchRole(session.user.id, fallbackRole, fallbackSource);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!nextSession) {
        setSession(null);
        setLoading(false);
        return;
      }

      const email = nextSession.user.email ?? null;
      const { fallbackRole, fallbackSource } = mapRoleFromMetadata(nextSession);
      const isEmailWhitelisted = !!email && adminEmailWhitelist.includes(email.toLowerCase());

      setSession({ user: { id: nextSession.user.id, email } });

      if (isEmailWhitelisted) {
        setRole('admin');
        setRoleSource('email_whitelist');
        setLoading(false);
        return;
      }

      void fetchRole(nextSession.user.id, fallbackRole, fallbackSource);
    });

    return () => subscription.unsubscribe();
  }, [adminEmailWhitelist]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const demoLogin = () => {
    setSession({
      user: {
        id: 'demo-user-id',
        email: 'visitante@uxvision.com',
      },
    });
    setRole('editor');
    setRoleSource('fallback');
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, loading, role, roleSource, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
