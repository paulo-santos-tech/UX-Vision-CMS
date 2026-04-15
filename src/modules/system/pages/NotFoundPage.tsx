import { Link } from 'react-router-dom';

export const NotFoundPage = ({ homePath }: { homePath: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-text-primary">
      <div className="max-w-lg w-full bg-surface border border-divider rounded-2xl p-8 text-center">
        <div className="text-5xl text-neon-cyan mb-4">
          <i className="fa-solid fa-compass"></i>
        </div>
        <h1 className="text-heading mb-2">Pagina nao encontrada</h1>
        <p className="text-sm text-text-muted mb-6">A rota informada nao existe nesta instancia do CMS.</p>
        <Link to={homePath} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-colors">
          <i className="fa-solid fa-house"></i> Voltar para inicio
        </Link>
      </div>
    </div>
  );
};
