import type { ViewState } from '../../types';

export type CmsFeatureFlags = Record<ViewState, boolean>;

export const DEFAULT_FEATURE_FLAGS: CmsFeatureFlags = {
  dashboard: true,
  blog: true,
  portfolio: true,
  microsaas: true,
  media: true,
  settings: true,
};
