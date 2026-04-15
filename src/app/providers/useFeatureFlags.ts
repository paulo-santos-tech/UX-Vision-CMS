import { useContext } from 'react';
import { FeatureFlagsContext } from './feature-flags-context';

export const useFeatureFlags = () => {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags deve ser usado dentro de FeatureFlagsProvider');
  return ctx;
};
