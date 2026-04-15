import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import logoImg from '../../../assets/logo.svg';
import { Button, InputGroup, StyledInput } from '../../../shared/components/cms/FormControls';
import { useToast } from '../../../app/providers/useToast';

type LoginPageProps = {
  onDemoLogin: () => void;
  showDemoLogin: boolean;
};

export const LoginPage = ({ onDemoLogin, showDemoLogin }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      showToast(authError.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-base/50">
      <div className="w-full max-w-md bg-surface backdrop-blur-xl border border-divider hover:border-neon-purple/30 rounded-2xl p-8 shadow-2xl transition-all duration-500">
        <div className="flex justify-center mb-8"><img src={logoImg} alt="UX Vision" className="h-14 w-auto object-contain opacity-90" /></div>
        <h2 className="text-heading text-center mb-2">Login</h2>
        <p className="text-center text-text-muted opacity-80 text-sm mb-6">Bem-vindo de volta.</p>

        <form onSubmit={handleSubmit}>
          <InputGroup icon="fa-solid fa-envelope" className="mb-4"><StyledInput type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required hasIcon /></InputGroup>
          <InputGroup icon="fa-solid fa-lock" className="mb-6">
            <div className="relative"><StyledInput type={showPassword ? 'text' : 'password'} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required hasIcon />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted opacity-80 hover:text-text-primary z-20"><i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
            </div>
          </InputGroup>

          <Button type="submit" className="w-full mb-4" disabled={loading}>
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Entrar'}
          </Button>

          {showDemoLogin && (
            <button
              type="button"
              onClick={onDemoLogin}
              className="w-full mb-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-transparent border border-divider text-text-muted hover:text-text-primary hover:border-neon-cyan/50 hover:bg-neon-cyan/5 group"
            >
              <i className="fa-solid fa-rocket group-hover:text-neon-cyan transition-colors"></i> Acesso Demo (Visitante)
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
