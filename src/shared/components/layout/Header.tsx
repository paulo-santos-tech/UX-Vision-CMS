import logoImg from '../../../assets/logo.svg';
import type { RoleSource } from '../../types/auth';

type HeaderProps = {
  email: string;
  role: string;
  roleSource: RoleSource;
  onLogout: () => void;
  theme: string;
  onToggleTheme: () => void;
  pageTitle?: string;
};

export const Header = ({ email, role, roleSource, onLogout, theme, onToggleTheme, pageTitle }: HeaderProps) => (
  <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md px-4 md:px-6 py-4 rounded-2xl flex justify-between items-center transition-colors shadow-sm">
    <div className="flex items-center gap-3">
      <img src={logoImg} alt="UX Vision" className="h-8 w-auto object-contain md:hidden" />
      <div>
        <h1 className="text-sm font-black uppercase tracking-widest text-text-primary">{pageTitle || 'Painel CMS'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-neon-cyan/10 text-neon-cyan rounded-full">{role}</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-surface-elevated text-text-muted rounded-full">
            {roleSource === 'table' ? 'role: tabela' : roleSource === 'metadata' ? 'role: metadata' : roleSource === 'email_whitelist' ? 'role: email' : 'role: fallback'}
          </span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="hidden sm:block text-text-primary text-sm font-medium pr-3 border-r border-divider/20">{email}</span>
      <button
        onClick={onToggleTheme}
        className="w-10 h-10 rounded-full bg-surface-elevated text-text-muted hover:text-neon-cyan hover:shadow-md transition-all flex items-center justify-center"
        title={theme === 'dark' ? 'Mudar para Light' : 'Mudar para Dark'}
      >
        <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
      </button>
      <button onClick={onLogout} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-lg transition-all flex items-center justify-center"><i className="fa-solid fa-power-off"></i></button>
    </div>
  </header>
);
