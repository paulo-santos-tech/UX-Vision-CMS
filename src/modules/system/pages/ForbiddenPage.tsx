import { useNavigate } from 'react-router-dom';

export const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface border border-divider rounded-2xl p-8 text-center">
        <div className="text-5xl text-amber-300 mb-4"><i className="fa-solid fa-lock"></i></div>
        <h1 className="text-heading mb-2">Acesso Restrito</h1>
        <p className="text-text-muted text-sm mb-6">Voce nao tem permissao para acessar esta pagina.</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-lg bg-surface-elevated border border-divider hover:bg-surface-elevated border border-divider/20 transition-colors">Voltar ao Dashboard</button>
      </div>
    </div>
  );
};
