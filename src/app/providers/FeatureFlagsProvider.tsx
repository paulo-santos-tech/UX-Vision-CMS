import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from './useAuth';
import type { ViewState } from '../../types';
import { DEFAULT_FEATURE_FLAGS } from '../../shared/types/features';
import type { CmsFeatureFlags } from '../../shared/types/features';
import { FeatureFlagsContext } from './feature-flags-context';

const parseFlagsFromEnv = (): CmsFeatureFlags => {
  const raw = String(import.meta.env.VITE_ENABLED_MODULES || '').trim();
  if (!raw) return DEFAULT_FEATURE_FLAGS;

  const enabled = new Set(raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  return {
    dashboard: true,
    blog: enabled.has('blog'),
    portfolio: enabled.has('portfolio'),
    microsaas: enabled.has('microsaas'),
    media: enabled.has('media'),
    settings: enabled.has('settings'),
  };
};

const sanitizeFlags = (value: unknown): CmsFeatureFlags | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Record<ViewState, unknown>>;
  return {
    dashboard: true,
    blog: candidate.blog === undefined ? true : Boolean(candidate.blog),
    portfolio: candidate.portfolio === undefined ? true : Boolean(candidate.portfolio),
    microsaas: candidate.microsaas === undefined ? true : Boolean(candidate.microsaas),
    media: candidate.media === undefined ? true : Boolean(candidate.media),
    settings: candidate.settings === undefined ? true : Boolean(candidate.settings),
  };
};

export const FeatureFlagsProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const envDefaults = useMemo(() => parseFlagsFromEnv(), []);
  const [flags, setFlags] = useState<CmsFeatureFlags>(envDefaults);

  useEffect(() => {
    const load = async () => {
      if (!session) {
        setFlags(envDefaults);
        return;
      }

      try {
        const { data } = await supabase.from('site_settings').select('enabled_modules').eq('id', 1).single();
        const parsed = sanitizeFlags(data?.enabled_modules);
        if (parsed) setFlags(parsed);
        else setFlags(envDefaults);
      } catch {
        setFlags(envDefaults);
      }
    };

    void load();
  }, [envDefaults, session]);

  const setFlag = (feature: ViewState, enabled: boolean) => {
    if (feature === 'dashboard') return;
    setFlags((prev) => ({ ...prev, [feature]: enabled }));
  };

  const saveFlags = async () => {
    const payload = { id: 1, enabled_modules: flags };
    const { error } = await supabase.from('site_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      return {
        ok: false,
        message: `Nao foi possivel salvar os modulos: ${error.message}. Execute a migracao para adicionar a coluna enabled_modules em site_settings.`,
      };
    }
    return { ok: true };
  };

  return <FeatureFlagsContext.Provider value={{ flags, setFlag, saveFlags }}>{children}</FeatureFlagsContext.Provider>;
};
