import { useContext } from 'react';
import { ConfirmContext } from './confirm-context';

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de ConfirmProvider');
  return ctx;
};
