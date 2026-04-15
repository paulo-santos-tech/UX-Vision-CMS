import React from 'react';
import { supabase } from '../supabaseClient';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
  stack: string;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '', stack: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const stack = error instanceof Error ? error.stack || '' : '';
    return { hasError: true, message, stack };
  }

  componentDidCatch(error: unknown): void {
    console.error('Erro nao tratado no app:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const stack = error instanceof Error ? error.stack || '' : '';
    const page = typeof window !== 'undefined' ? window.location.pathname : null;

    void supabase.auth.getUser().then(({ data }) => {
      void supabase.from('app_errors').insert({
        user_id: data.user?.id || null,
        page,
        message,
        stack,
        metadata: {
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          ts: new Date().toISOString(),
        },
      });
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoLogin = () => {
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 text-text-primary">
          <div className="max-w-lg w-full bg-surface border border-divider rounded-2xl p-8 text-center">
            <div className="text-4xl text-red-400 mb-4">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h1 className="text-heading mb-2">Algo deu errado</h1>
            <p className="text-text-muted text-sm mb-2">O app encontrou um erro inesperado.</p>
            <p className="text-text-muted opacity-70 text-xs mb-3 break-all">{this.state.message}</p>
            <details className="text-left text-[11px] text-text-muted opacity-70 bg-surface-elevated border border-divider rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
              <summary className="cursor-pointer text-text-muted">Detalhes tecnicos</summary>
              <pre className="mt-2 whitespace-pre-wrap">{this.state.stack || 'Sem stack disponivel.'}</pre>
            </details>
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleReload} className="px-4 py-2 rounded-lg bg-surface-elevated border border-divider hover:bg-surface-elevated border border-divider/20 transition-colors">Recarregar</button>
              <button onClick={this.handleGoLogin} className="px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-colors">Ir para login</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
