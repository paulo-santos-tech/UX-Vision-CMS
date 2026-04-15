import { useCallback, useMemo, useState } from 'react';
import { ConfirmContext } from './confirm-context';
import type { ConfirmOptions } from './confirm-context';

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions;
  resolve?: (value: boolean) => void;
};

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    options: { message: '' },
  });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = useCallback((confirmed: boolean) => {
    state.resolve?.(confirmed);
    setState({ open: false, options: { message: '' } });
  }, [state]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-divider rounded-2xl p-6">
            <h3 className="text-lg font-bold text-text-primary mb-2">{state.options.title || 'Confirmar acao'}</h3>
            <p className="text-sm text-text-muted mb-6">{state.options.message}</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => handleClose(false)} className="px-4 py-2 rounded-lg border border-divider text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors">
                {state.options.cancelText || 'Cancelar'}
              </button>
              <button type="button" onClick={() => handleClose(true)} className="px-4 py-2 rounded-lg border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
                {state.options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
