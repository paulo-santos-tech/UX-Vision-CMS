import { createContext } from 'react';
import type { ViewState } from '../../types';
import type { CmsFeatureFlags } from '../../shared/types/features';

export type FeatureFlagsContextValue = {
  flags: CmsFeatureFlags;
  setFlag: (feature: ViewState, enabled: boolean) => void;
  saveFlags: () => Promise<{ ok: boolean; message?: string }>;
};

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);
