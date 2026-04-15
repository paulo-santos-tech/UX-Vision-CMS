import { createContext } from 'react';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
};

export type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);
