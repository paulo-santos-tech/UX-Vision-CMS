import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
// CORREÇÃO CRÍTICA: Uso de 'import type' para corrigir o erro do TypeScript (isolatedModules)
import type { PortfolioItem, BlogPost, BlogCategory, SiteSettings, ViewState, MicrosaasItem, PageView } from './types';

// IMPORTAÇÃO DO LOGO (Garante que funcione em Produção e Dev)
import logoImg from './assets/logo.svg';

// ============================================================================
// 1. COMPONENTES DE UI REUTILIZÁVEIS
// ============================================================================

/**
 * COMPONENTE DE GRÁFICO SIMPLES (SVG)
 * Exibe a tendência de visitas nos últimos dias
 */
const TrafficChart = ({ data }: { data: { date: string; count: number }[] }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-white/30 text-xs">Sem dados suficientes</div>;

  const height = 150;
  const maxVal = Math.max(...data.map(d => d.count), 1); // Evita divisão por zero
  
  // Pontos para a linha SVG
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 1000; // Mapeia para 0-1000 de largura
    const y = height - (d.count / maxVal) * height;
    return `${x},${y}`;
  }).join(' ');

  // Pontos para a área preenchida (fecha o loop embaixo)
  const fillPoints = `0,${height} ${points} 1000,${height}`;

  return (
    <div className="w-full h-[180px] relative mt-4 group">
      <svg viewBox="0 0 1000 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        {/* Gradiente */}
        <defs>
          <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00e2ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00e2ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Linhas de grade horizontais */}
        <line x1="0" y1="0" x2="1000" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
        <line x1="0" y1="75" x2="1000" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
        <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        {/* Área Preenchida */}
        <polygon points={fillPoints} fill="url(#gradient)" />
        
        {/* Linha Principal */}
        <polyline 
          points={points} 
          fill="none" 
          stroke="#00e2ff" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="drop-shadow-[0_0_10px_rgba(0,226,255,0.5)]"
        />

        {/* Círculos nos pontos (visíveis no hover ou para todos se poucos dados) */}
        {data.map((d, i) => {
           const x = (i / (data.length - 1)) * 1000;
           const y = height - (d.count / maxVal) * height;
           return (
             <g key={i} className="group/point">
               <circle cx={x} cy={y} r="4" fill="#fff" className="opacity-0 group-hover/point:opacity-100 transition-opacity" />
               {/* Tooltip simples via title nativo por enquanto */}
               <rect x={x - 25} y={y - 30} width="50" height="20" rx="4" fill="rgba(0,0,0,0.8)" className="opacity-0 group-hover/point:opacity-100" />
               <text x={x} y={y - 16} textAnchor="middle" fill="white" fontSize="10" className="opacity-0 group-hover/point:opacity-100 pointer-events-none">
                 {d.count}
               </text>
             </g>
           )
        })}
      </svg>
      {/* Eixo X (Datas) */}
      <div className="flex justify-between text-[10px] text-white/40 mt-2 font-mono">
         <span>{data[0]?.date}</span>
         <span>{data[Math.floor(data.length/2)]?.date}</span>
         <span>{data[data.length-1]?.date}</span>
      </div>
    </div>
  );
};

/**
 * SEO GAUGE CHART (Estilo Yoast)
 */
const SeoGauge = ({ score }: { score: number }) => {
  const radius = 30;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'text-red-500';
  let icon = 'fa-frown';
  let label = 'Precisa Melhorar';

  if (score >= 50 && score < 80) {
    color = 'text-orange-400';
    icon = 'fa-meh';
    label = 'OK';
  } else if (score >= 80) {
    color = 'text-green-500';
    icon = 'fa-smile';
    label = 'Ótimo';
  }

  return (
    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="currentColor"
            className={`${color} transition-all duration-1000 ease-out`}
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className={`absolute text-2xl ${color}`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase font-bold text-white/50 mb-1">SEO Score</div>
        <div className={`text-3xl font-black ${color}`}>{score}/100</div>
        <div className="text-sm font-medium text-white/80">{label}</div>
      </div>
    </div>
  );
};

/**
 * EDITOR DE TEXTO CUSTOMIZADO "NEON EDITOR"
 */
const NeonEditor = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
    handleInput();
  };

  const addLink = () => {
    const url = prompt('Digite a URL do link:');
    if (url) exec('createLink', url);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    const fileName = `editor_${Date.now()}_${file.name.replace(/\s/g, '_')}`;

    try {
      const { error } = await supabase.storage.from("portfolio-images").upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(fileName);
      exec('insertImage', publicUrl);
    } catch (err: any) {
      alert("Erro ao enviar imagem: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tag = e.target.value;
    if (tag) {
      exec('formatBlock', tag);
      e.target.value = "";
    }
  };

  const ToolbarBtn = ({ icon, cmd, arg, label }: { icon: string, cmd?: string, arg?: string, label?: string }) => (
    <button
      type="button"
      onClick={() => cmd ? exec(cmd, arg) : null}
      onMouseDown={(e) => {
         if(!cmd) return; 
         e.preventDefault();
      }}
      className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
      title={label}
    >
      <i className={icon}></i>
    </button>
  );

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 flex flex-col h-[400px]">
      <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

      <div className="bg-white/5 border-b border-white/10 p-2 flex flex-wrap gap-2 items-center">
        <div className="relative group">
          <select 
            onChange={handleHeadingChange} 
            defaultValue=""
            className="appearance-none bg-black/40 text-white/80 text-sm border border-white/10 rounded-lg pl-3 pr-8 py-1.5 focus:border-neon-purple focus:outline-none cursor-pointer hover:bg-black/60 transition-colors"
          >
            <option value="" disabled>Texto</option>
            <option value="P">Parágrafo</option>
            <option value="H2">H2</option>
            <option value="H3">H3</option>
            <option value="H4">H4</option>
            <option value="H5">H5</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">
            <i className="fa-solid fa-chevron-down"></i>
          </div>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1"></div>
        
        <ToolbarBtn icon="fa-solid fa-bold" cmd="bold" label="Negrito" />
        <ToolbarBtn icon="fa-solid fa-italic" cmd="italic" label="Itálico" />
        <ToolbarBtn icon="fa-solid fa-list-ul" cmd="insertUnorderedList" label="Lista" />
        <ToolbarBtn icon="fa-solid fa-list-ol" cmd="insertOrderedList" label="Lista Num." />
        
        <div className="w-px h-6 bg-white/10 mx-1"></div>
        
        <button type="button" onClick={addLink} className="p-2 text-white/60 hover:text-neon-cyan hover:bg-white/10 rounded-lg transition-colors"><i className="fa-solid fa-link"></i></button>
        <button 
          type="button" 
          onClick={triggerImageUpload} 
          className={`p-2 rounded-lg transition-colors ${isUploading ? 'text-neon-purple animate-pulse' : 'text-white/60 hover:text-neon-purple hover:bg-white/10'}`}
        >
          <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-image'}`}></i>
        </button>
        <div className="ml-auto">
          <ToolbarBtn icon="fa-solid fa-eraser" cmd="removeFormat" label="Limpar" />
        </div>
      </div>
      
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-grow p-4 outline-none overflow-y-auto neon-editor-content bg-transparent font-sans text-sm text-gray-200"
        data-placeholder={placeholder}
      />
    </div>
  );
};

// Spinner de carregamento
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan"></div>
  </div>
);

// Container para inputs
const InputGroup = ({ 
  label, 
  children, 
  icon, 
  className = "" 
}: { 
  label?: string; 
  children?: React.ReactNode; 
  icon?: string; 
  className?: string 
}) => (
  <div className={`mb-5 w-full relative ${className}`}>
    {label && (
      <label className="block mb-2 text-xs text-white/60 uppercase tracking-wide font-semibold">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <i className={`${icon} absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neon-cyan opacity-80 pointer-events-none z-10`}></i>
      )}
      {children}
    </div>
  </div>
);

// Inputs estilizados
const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement> & { hasIcon?: boolean }) => (
  <input
    {...props}
    className={`w-full bg-black/40 border border-white/10 rounded-xl text-white text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 ${props.hasIcon ? 'pl-12 py-4' : 'px-4 py-3'} ${props.className}`}
  />
);

const StyledTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasIcon?: boolean }) => (
  <textarea
    {...props}
    className={`w-full bg-black/40 border border-white/10 rounded-xl text-white text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 min-h-[100px] resize-y ${props.hasIcon ? 'pl-12 py-4' : 'px-4 py-3'} ${props.className}`}
  />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full bg-black/40 border border-white/10 rounded-xl text-white text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 px-4 py-3 appearance-none ${props.className}`}
  >
    {props.children}
  </select>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  type = 'button',
  className = '',
  disabled
}: { 
  children?: React.ReactNode; 
  onClick?: (e: any) => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'; 
  type?: 'button' | 'submit';
  className?: string;
  disabled?: boolean;
}) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-gradient-to-br from-[#b200ff] to-[#7b00ff] text-white shadow-lg shadow-neon-purple/20 hover:-translate-y-0.5 hover:shadow-neon-purple/30",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20",
    danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40",
    outline: "bg-transparent border border-white/20 text-white/80 hover:text-white hover:border-neon-cyan/40 hover:bg-neon-cyan/5",
    ghost: "bg-transparent text-white/60 hover:text-white"
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// ============================================================================
// 2. COMPONENTE PRINCIPAL DO APP
// ============================================================================

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'editor'>('editor');
  const [view, setView] = useState<ViewState>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    setRole(data?.role || 'admin'); 
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg text-white">
      <LoadingSpinner />
    </div>
  );

  return (
    <div className="min-h-screen text-white font-sans selection:bg-neon-purple/30 selection:text-white">
      {!session ? (
        <LoginScreen />
      ) : (
        <div className="max-w-7xl mx-auto px-4 pb-20">
          <Header email={session.user.email} role={role} onLogout={handleLogout} />
          <Navigation currentView={view} setView={setView} role={role} />
          
          <main className="mt-8">
            {view === 'dashboard' && <DashboardView />}
            {view === 'blog' && <BlogView />}
            {view === 'portfolio' && role === 'admin' && <PortfolioView />}
            {view === 'microsaas' && <MicrosaasView />}
            {view === 'media' && <MediaView />}
            {view === 'settings' && role === 'admin' && <SettingsView />}
          </main>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. TELAS (Login, Header, Dashboard...)
// ============================================================================

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Erro: Verifique suas credenciais.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-dark-glass backdrop-blur-xl border border-dark-border rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="UX Vision" className="h-14 w-auto object-contain opacity-90" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">CMS Login</h2>
        <form onSubmit={handleLogin}>
          <InputGroup icon="fa-solid fa-envelope" className="mb-4">
            <StyledInput 
              type="email" 
              placeholder="E-mail" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              hasIcon 
            />
          </InputGroup>
          <InputGroup icon="fa-solid fa-lock" className="mb-6">
            <div className="relative">
              <StyledInput 
                type={showPassword ? "text" : "password"} 
                placeholder="Senha" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                hasIcon 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-20"
                tabIndex={-1}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </InputGroup>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
};

const Header = ({ email, role, onLogout }: { email: string; role: string; onLogout: () => void }) => (
  <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 rounded-b-2xl mb-6 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <img src={logoImg} alt="UX Vision" className="h-8 w-auto object-contain" />
      <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-full">
        {role}
      </span>
    </div>
    <div className="flex items-center gap-4">
      <span className="hidden sm:block text-white/80 text-sm">{email}</span>
      <button 
        onClick={onLogout}
        className="p-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        aria-label="Sair"
      >
        <i className="fa-solid fa-power-off"></i>
      </button>
    </div>
  </header>
);

const Navigation = ({ currentView, setView, role }: { currentView: ViewState; setView: (v: ViewState) => void; role: string }) => {
  const tabs: { id: ViewState; label: string; icon: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: 'fa-solid fa-chart-pie' },
    { id: 'blog', label: 'Blog', icon: 'fa-solid fa-newspaper' },
    { id: 'portfolio', label: 'Portfólio', icon: 'fa-solid fa-briefcase', adminOnly: true },
    { id: 'microsaas', label: 'Microsaas', icon: 'fa-solid fa-cube' },
    { id: 'media', label: 'Mídia', icon: 'fa-solid fa-images' },
    { id: 'settings', label: 'Configurações', icon: 'fa-solid fa-sliders', adminOnly: true },
  ];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-max">
        {tabs.map(tab => {
          if (tab.adminOnly && role !== 'admin') return null;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-200 border ${
                isActive 
                  ? 'bg-neon-purple/10 border-neon-purple/30 text-white shadow-[0_0_15px_-3px_rgba(178,0,255,0.3)]' 
                  : 'bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- DASHBOARD VIEW ---
const DashboardView = () => {
  const [stats, setStats] = useState({ visits: 0, projects: 0, posts: 0 });
  const [analyticsData, setAnalyticsData] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const { count: proj } = await supabase.from("portfolio").select("*", { count: "exact", head: true });
        const { count: post } = await supabase.from("blog_posts").select("*", { count: "exact", head: true });
        
        // Pega dados dos últimos 30 dias para o gráfico
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let visits = 0;
        let pageViews: PageView[] = [];

        try {
          const { data, count, error } = await supabase
            .from("page_analytics")
            .select("*") // Precisamos dos dados, não apenas count
            .gte("created_at", thirtyDaysAgo.toISOString())
            .order("created_at", { ascending: true });
            
          if (!error && data) {
            visits = count || data.length;
            pageViews = data;
          }
        } catch { /* Ignora se a tabela não existir */ }

        setStats({ visits, projects: proj || 0, posts: post || 0 });
        setAnalyticsData(pageViews);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  // Processamento de Dados para o Dashboard
  const { chartData, topPages, topReferrers, topCampaigns } = useMemo(() => {
    // 1. Chart Data (Visitas por Dia)
    const dailyCounts: Record<string, number> = {};
    const today = new Date();
    // Preenche com 0 os ultimos 30 dias
    for(let i=29; i>=0; i--) {
       const d = new Date();
       d.setDate(today.getDate() - i);
       const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
       dailyCounts[dateStr] = 0;
    }

    analyticsData.forEach(view => {
       const dateStr = new Date(view.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
       if(dailyCounts[dateStr] !== undefined) dailyCounts[dateStr]++;
    });

    const chartData = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));

    // 2. Top Pages
    const pages: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    const campaigns: Record<string, number> = {};

    analyticsData.forEach(view => {
       // Pages
       const path = view.path || '/';
       pages[path] = (pages[path] || 0) + 1;

       // Referrers (Tenta limpar a URL)
       let ref = 'Direto / Desconhecido';
       if(view.referrer) {
         try {
           const url = new URL(view.referrer);
           ref = url.hostname.replace('www.', '');
           if(ref.includes('google')) ref = 'Google (Orgânico)';
           if(ref.includes('instagram')) ref = 'Instagram';
           if(ref.includes('facebook')) ref = 'Facebook';
           if(ref.includes('linkedin')) ref = 'LinkedIn';
           if(ref.includes('t.co')) ref = 'Twitter / X';
         } catch { ref = view.referrer; }
       }
       referrers[ref] = (referrers[ref] || 0) + 1;

       // Campaigns (Extrair UTM)
       try {
         // Assume que 'path' pode conter query strings se gravado corretamente, ou o parametro esta solto
         // No DB atual, path costuma ser só o caminho. Se quisermos UTM, precisaríamos salvar a URL completa ou query params.
         // Vou tentar extrair do 'path' caso ele tenha sido salvo com query string.
         if(view.path && view.path.includes('utm_')) {
            const urlParams = new URLSearchParams(view.path.split('?')[1]);
            const source = urlParams.get('utm_source');
            const campaign = urlParams.get('utm_campaign');
            const term = urlParams.get('utm_term'); // A "Palavra-chave" do marketing pago
            
            if(source || campaign) {
               const label = `${source || '??'} / ${campaign || '??'} ${term ? `(${term})` : ''}`;
               campaigns[label] = (campaigns[label] || 0) + 1;
            }
         }
       } catch {}
    });

    // Ordenar e pegar Top 5
    const topPages = Object.entries(pages).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topReferrers = Object.entries(referrers).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topCampaigns = Object.entries(campaigns).sort((a,b) => b[1] - a[1]).slice(0, 5);

    return { chartData, topPages, topReferrers, topCampaigns };
  }, [analyticsData]);

  const StatCard = ({ icon, title, value, colorClass, subtext }: any) => (
    <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 flex items-center gap-5 backdrop-blur-md relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
      <i className={`${icon} text-3xl ${colorClass} relative z-10`}></i>
      <div className="relative z-10">
        <h3 className="text-sm text-white/60 mb-1 font-semibold uppercase tracking-wide">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
        {subtext && <p className="text-[10px] text-white/40 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  const ListCard = ({ title, items, icon, color }: any) => (
     <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md flex flex-col h-full">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
          <i className={`${icon} ${color}`}></i> {title}
        </h3>
        <div className="space-y-3 flex-grow">
           {items.length === 0 ? (
             <p className="text-white/20 text-xs italic">Sem dados registrados.</p>
           ) : items.map(([label, count]: any, i: number) => (
             <div key={i} className="relative">
                <div className="flex justify-between text-xs mb-1 relative z-10">
                   <span className="font-medium text-white/80 truncate max-w-[80%]">{label}</span>
                   <span className="text-white/50">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${(count / Math.max(...items.map((x:any) => x[1]))) * 100}%` }}></div>
                </div>
             </div>
           ))}
        </div>
     </div>
  );

  // CORREÇÃO: Uso da variável loading para evitar o erro TS6133
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER DE BOAS VINDAS */}
      <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border border-white/10 p-8 rounded-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">Analytics em Tempo Real</h3>
          <p className="text-white/60 text-sm">Resumo dos últimos 30 dias de performance.</p>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sistema Ativo
           </span>
        </div>
      </div>

      {/* CARDS DE ESTATÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
           icon="fa-solid fa-users" 
           title="Visitas Totais" 
           value={stats.visits} 
           colorClass="text-neon-cyan" 
           subtext="Acessos únicos (IP/Sessão)"
        />
        <StatCard 
           icon="fa-solid fa-layer-group" 
           title="Projetos Ativos" 
           value={stats.projects} 
           colorClass="text-neon-purple" 
        />
        <StatCard 
           icon="fa-solid fa-file-lines" 
           title="Conteúdos" 
           value={stats.posts} 
           colorClass="text-blue-400" 
           subtext="Artigos publicados no blog"
        />
      </div>

      {/* GRÁFICO PRINCIPAL */}
      <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
         <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">Tráfego do Site</h3>
            <select className="bg-black/40 border border-white/10 rounded-lg text-xs text-white/70 px-2 py-1 outline-none">
              <option>Últimos 30 dias</option>
            </select>
         </div>
         <TrafficChart data={chartData} />
      </div>

      {/* GRID DE DETALHES (TOP PAGES, ORIGEM, CAMPANHAS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* PÁGINAS MAIS ACESSADAS */}
         <ListCard 
            title="Páginas Populares" 
            items={topPages} 
            icon="fa-solid fa-copy" 
            color="text-neon-purple" 
         />
         
         {/* ORIGEM DO TRÁFEGO */}
         <ListCard 
            title="Origem (Referrer)" 
            items={topReferrers} 
            icon="fa-solid fa-globe" 
            color="text-neon-cyan" 
         />
         
         {/* CAMPANHAS DE MARKETING (UTM) */}
         <ListCard 
            title="Campanhas & Keywords" 
            items={topCampaigns} 
            icon="fa-solid fa-bullhorn" 
            color="text-green-400" 
         />
      </div>

      {/* NOTA SOBRE GOOGLE KEYWORDS */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
         <i className="fa-solid fa-circle-info text-blue-400 mt-0.5"></i>
         <div>
            <h4 className="text-sm font-bold text-blue-300">Sobre Palavras-Chave do Google</h4>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
               Por questões de privacidade e criptografia (SSL), o Google não compartilha a palavra-chave exata que o usuário digitou para encontrar seu site organicamente. 
               Para rastrear termos de campanhas pagas (Ads), use links com <code>?utm_term=palavra-chave</code>. 
               Para SEO orgânico, consulte o <strong>Google Search Console</strong>.
            </p>
         </div>
      </div>
    </div>
  );
};

// --- BLOG VIEW ---
interface SeoCheckItem {
  id: string;
  label: string;
  status: 'good' | 'warning' | 'bad';
  message: string;
}

const BlogView = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    status: 'draft',
    social_shares: { wa: true, fb: false, li: true, tg: false, tw: false }
  });
  
  // SEO States
  const [seoScore, setSeoScore] = useState(0);
  const [seoChecks, setSeoChecks] = useState<SeoCheckItem[]>([]);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  
  // Tabs for SEO Results
  const [activeSeoTab, setActiveSeoTab] = useState<'problems' | 'improvements' | 'good'>('problems');

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const loadData = useCallback(async () => {
    const { data: p } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (p) setPosts(p);
    const { data: c } = await supabase.from("blog_categories").select("*").order("name");
    if (c) setCategories(c);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ENGINE SEO
  useEffect(() => {
    if (!isEditing) return;

    const title = formData.title || "";
    const slug = formData.slug || "";
    const metaDesc = formData.meta_description || "";
    const contentHtml = formData.content || "";
    const keyword = (formData.keyword || "").trim().toLowerCase();

    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, 'text/html');
    const textContent = doc.body.textContent || "";
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    
    const checks: SeoCheckItem[] = [];
    let passedChecks = 0;

    if (!keyword) {
      checks.push({ id: 'kw_missing', label: 'Palavra-chave', status: 'bad', message: 'Defina uma palavra-chave foco para começar a análise.' });
    } else {
      if (title.toLowerCase().includes(keyword)) { checks.push({ id: 'kw_title', label: 'Título', status: 'good', message: 'Palavra-chave presente no título.' }); passedChecks++; } else { checks.push({ id: 'kw_title', label: 'Título', status: 'bad', message: 'Palavra-chave não encontrada no título.' }); }
      if (slug.toLowerCase().includes(keyword.replace(/\s+/g, '-'))) { checks.push({ id: 'kw_slug', label: 'URL Slug', status: 'good', message: 'Palavra-chave presente na URL.' }); passedChecks++; } else { checks.push({ id: 'kw_slug', label: 'URL Slug', status: 'warning', message: 'Palavra-chave não encontrada na URL.' }); }
      if (metaDesc.toLowerCase().includes(keyword)) { checks.push({ id: 'kw_meta', label: 'Meta Descrição', status: 'good', message: 'Palavra-chave na meta descrição.' }); passedChecks++; } else { checks.push({ id: 'kw_meta', label: 'Meta Descrição', status: 'warning', message: 'Palavra-chave ausente na meta descrição.' }); }
      const firstParagraph = textContent.slice(0, 200).toLowerCase();
      if (firstParagraph.includes(keyword)) { checks.push({ id: 'kw_intro', label: 'Introdução', status: 'good', message: 'Palavra-chave aparece no início do texto.' }); passedChecks++; } else { checks.push({ id: 'kw_intro', label: 'Introdução', status: 'warning', message: 'Tente usar a palavra-chave no primeiro parágrafo.' }); }
      
       // 6. Densidade da palavra-chave
      const matches = (textContent.toLowerCase().match(new RegExp(keyword, "g")) || []).length;
      const density = wordCount > 0 ? (matches / wordCount) * 100 : 0;
      
      if (density >= 0.5 && density <= 2.5) {
        checks.push({ id: 'density', label: 'Densidade', status: 'good', message: `Densidade perfeita (${density.toFixed(1)}%).` });
        passedChecks++;
      } else if (density < 0.5) {
        checks.push({ id: 'density', label: 'Densidade', status: 'warning', message: `Baixa densidade (${density.toFixed(1)}%). Use a palavra-chave mais vezes.` });
      } else {
        checks.push({ id: 'density', label: 'Densidade', status: 'bad', message: `Excesso de otimização (${density.toFixed(1)}%). Reduza a palavra-chave.` });
      }
    }

    if (wordCount >= 300) { checks.push({ id: 'length', label: 'Tamanho', status: 'good', message: `Conteúdo com bom tamanho (${wordCount} palavras).` }); passedChecks++; } else { checks.push({ id: 'length', label: 'Tamanho', status: 'bad', message: `Conteúdo muito curto (${wordCount}/300 palavras).` }); }
    
    // Links Internos/Externos
    const links = doc.querySelectorAll('a');
    if (links.length > 0) {
      checks.push({ id: 'links', label: 'Links', status: 'good', message: 'O artigo contém links.' });
      passedChecks++;
    } else {
      checks.push({ id: 'links', label: 'Links', status: 'warning', message: 'Adicione links internos ou externos.' });
    }

    // Imagens e Alt Text
    const images = doc.querySelectorAll('img');
    if (images.length > 0) {
      const hasAlt = Array.from(images).some(img => img.getAttribute('alt')?.trim());
      if (hasAlt) {
        checks.push({ id: 'images', label: 'Imagens', status: 'good', message: 'Imagens com texto alternativo encontradas.' });
        passedChecks++;
      } else {
         checks.push({ id: 'images', label: 'Imagens', status: 'warning', message: 'Adicione texto alternativo (Alt) nas imagens.' });
      }
    }

    const totalPossibleChecks = keyword ? 8 : 2; 
    setSeoScore(Math.min(100, Math.round((passedChecks / totalPossibleChecks) * 100)));
    setSeoChecks(checks);

  }, [formData, isEditing]);

  const handleEdit = (post: BlogPost) => {
    setFormData(post);
    setEditingId(post.id);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = () => {
    setFormData({ status: 'draft', social_shares: { wa: true, fb: false, li: true, tg: false, tw: false } });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    loadData();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await supabase.from("blog_categories").insert([{ name: newCatName }]);
    setNewCatName('');
    loadData();
  };

  const generateSlug = (text: string) => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert("Título obrigatório");
    const slug = formData.slug || generateSlug(formData.title);
    const payload = { 
      ...formData, 
      slug,
      excerpt: formData.excerpt,
      author: formData.author,
      read_time: formData.read_time
    };
    
    const { error } = editingId 
      ? await supabase.from("blog_posts").update(payload).eq("id", editingId)
      : await supabase.from("blog_posts").insert([payload]);

    if (error) alert("Erro: " + error.message);
    else {
      setIsEditing(false);
      loadData();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const fileName = `blog_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const { error } = await supabase.storage.from("portfolio-images").upload(fileName, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, image: publicUrl }));
    }
  };

  if (!isEditing) {
    return (
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Blog Posts</h3>
          <Button onClick={handleCreate}><i className="fa-solid fa-plus"></i> Novo Post</Button>
        </div>
        
        {/* UNIFIED CARD LAYOUT (GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {posts.map(post => (
             <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col">
               <div className="h-40 overflow-hidden relative bg-black/40">
                 {post.image ? (
                   <img src={post.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                     <i className="fa-solid fa-newspaper text-white/20 text-4xl"></i>
                   </div>
                 )}
                 {/* Status Badge */}
                 <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${
                      post.status === 'published' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 
                      post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {post.status}
                    </span>
                 </div>
                 {/* Action Overlay */}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-300">
                    <button onClick={() => handleEdit(post)} className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-neon-purple hover:border-neon-purple flex items-center justify-center transition-colors"><i className="fa-solid fa-pen"></i></button>
                    <button onClick={() => handleDelete(post.id)} className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-red-500 hover:border-red-500 flex items-center justify-center transition-colors"><i className="fa-solid fa-trash"></i></button>
                 </div>
               </div>
               <div className="p-4 flex flex-col flex-grow">
                 <span className="text-xs text-neon-cyan uppercase font-bold tracking-wider mb-1">{post.category}</span>
                 <h4 className="text-lg font-bold text-white mb-2 line-clamp-2">{post.title}</h4>
                 <p className="text-white/50 text-xs line-clamp-3">{post.excerpt || 'Sem resumo disponível...'}</p>
                 <div className="mt-auto pt-4 flex justify-between items-center text-[10px] text-white/30 font-mono border-t border-white/5">
                   <span>{new Date(post.created_at).toLocaleDateString()}</span>
                   <span>{post.read_time || '5 min'}</span>
                 </div>
               </div>
             </div>
          ))}
          {posts.length === 0 && <p className="text-white/40 col-span-full text-center py-8">Nenhum artigo encontrado.</p>}
        </div>
      </div>
    );
  }

  // --- EDIT MODE ---
  const problems = seoChecks.filter(c => c.status === 'bad');
  const improvements = seoChecks.filter(c => c.status === 'warning');
  const goodResults = seoChecks.filter(c => c.status === 'good');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* FORM COLUMN */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">{editingId ? 'Editar Artigo' : 'Criar Artigo'}</h3>
            <Button variant="outline" onClick={() => setShowCatManager(!showCatManager)} className="text-xs">
              <i className="fa-solid fa-tags"></i> Gerenciar Cats
            </Button>
          </div>

          {showCatManager && (
             <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 border-dashed">
              <div className="flex gap-2 mb-3">
                <StyledInput placeholder="Nova categoria..." value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                <Button onClick={handleAddCategory} variant="secondary"><i className="fa-solid fa-plus"></i></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <span key={c.id} className="bg-neon-purple/20 border border-neon-purple/30 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                    {c.name}
                    <button onClick={async () => { if(confirm('Del?')) { await supabase.from('blog_categories').delete().eq('id', c.id); loadData(); }}} className="hover:text-red-400"><i className="fa-solid fa-xmark"></i></button>
                  </span>
                ))}
              </div>
             </div>
          )}

          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Status">
                <StyledSelect value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="scheduled">Agendado</option>
                </StyledSelect>
              </InputGroup>
              {formData.status === 'scheduled' && (
                <InputGroup label="Data">
                  <StyledInput type="datetime-local" value={formData.scheduled_at ? new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''} onChange={e => setFormData({...formData, scheduled_at: new Date(e.target.value).toISOString()})} />
                </InputGroup>
              )}
            </div>
            
            <div className="flex gap-4">
              <div className="flex-grow">
                <InputGroup label="Título">
                  <StyledInput value={formData.title || ''} onChange={e => { const title = e.target.value; setFormData({...formData, title, slug: generateSlug(title)}); }} required />
                </InputGroup>
              </div>
              <div className="w-1/3">
                <InputGroup label="Categoria">
                  <StyledSelect value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </StyledSelect>
                </InputGroup>
              </div>
            </div>

            <InputGroup label="Resumo (Excerpt)">
               <StyledTextArea value={formData.excerpt || ''} onChange={e => setFormData({...formData, excerpt: e.target.value})} rows={3} placeholder="Um breve resumo que aparecerá no card do blog..." />
            </InputGroup>

            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Autor">
                 <StyledInput value={formData.author || ''} onChange={e => setFormData({...formData, author: e.target.value})} placeholder="Ex: Fulano da Silva" />
               </InputGroup>
               <InputGroup label="Tempo de Leitura">
                 <StyledInput value={formData.read_time || ''} onChange={e => setFormData({...formData, read_time: e.target.value})} placeholder="Ex: 5 min" />
               </InputGroup>
            </div>

            <InputGroup label="Conteúdo">
               <NeonEditor value={formData.content || ''} onChange={(newContent: string) => setFormData({...formData, content: newContent})} />
            </InputGroup>

            <InputGroup label="Imagem de Capa">
              <div className="flex items-center gap-4 p-4 border border-dashed border-white/20 rounded-xl bg-white/5">
                <label className="cursor-pointer bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-4 py-2 rounded-lg font-bold hover:bg-neon-cyan/20 transition-colors">
                  <i className="fa-solid fa-image mr-2"></i> Escolher
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </label>
                <span className="text-sm text-white/50 truncate max-w-[200px]">{formData.image ? 'Imagem selecionada' : 'Nenhuma imagem'}</span>
                {formData.image && <img src={formData.image} className="h-10 w-10 object-cover rounded ml-auto" alt="Preview" />}
              </div>
            </InputGroup>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button type="submit" className="flex-1">Salvar Artigo</Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      </div>

      {/* SEO & PREVIEW COLUMN */}
      <div className="space-y-6">
        
        {/* YOAST-STYLE SEO WIDGET */}
        <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
          <h3 className="font-bold mb-4 flex items-center gap-2"><i className="fa-solid fa-rocket text-neon-purple"></i> Análise SEO</h3>
          
          <InputGroup label="Palavra-chave Foco">
            <StyledInput value={formData.keyword || ''} onChange={e => setFormData({...formData, keyword: e.target.value})} placeholder="Ex: Marketing Digital" />
          </InputGroup>

          <SeoGauge score={seoScore} />

          <div className="mt-6 border-t border-white/10 pt-4">
             {/* Problems Tab */}
             {problems.length > 0 && (
               <div className="mb-4">
                 <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setActiveSeoTab(activeSeoTab === 'problems' ? 'problems' : 'problems')}>
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-sm font-bold text-white/80">Problemas ({problems.length})</span>
                    <i className={`fa-solid fa-chevron-down text-xs ml-auto transition-transform ${activeSeoTab === 'problems' ? 'rotate-180' : ''}`}></i>
                 </div>
                 {activeSeoTab === 'problems' && (
                   <div className="space-y-2 pl-5">
                      {problems.map(c => (
                        <div key={c.id} className="text-xs text-white/60 flex items-start gap-2">
                           <i className="fa-solid fa-xmark text-red-500 mt-0.5"></i> {c.message}
                        </div>
                      ))}
                   </div>
                 )}
               </div>
             )}

             {/* Improvements Tab */}
             {improvements.length > 0 && (
               <div className="mb-4">
                 <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setActiveSeoTab(activeSeoTab === 'improvements' ? 'improvements' : 'improvements')}>
                    <span className="w-3 h-3 rounded-full bg-orange-400"></span>
                    <span className="text-sm font-bold text-white/80">Melhorias ({improvements.length})</span>
                    <i className={`fa-solid fa-chevron-down text-xs ml-auto transition-transform ${activeSeoTab === 'improvements' ? 'rotate-180' : ''}`}></i>
                 </div>
                 {activeSeoTab === 'improvements' && (
                   <div className="space-y-2 pl-5">
                      {improvements.map(c => (
                        <div key={c.id} className="text-xs text-white/60 flex items-start gap-2">
                           <i className="fa-solid fa-circle-exclamation text-orange-400 mt-0.5"></i> {c.message}
                        </div>
                      ))}
                   </div>
                 )}
               </div>
             )}

             {/* Good Results Tab */}
             {goodResults.length > 0 && (
               <div className="mb-2">
                 <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setActiveSeoTab(activeSeoTab === 'good' ? 'problems' : 'good')}>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-sm font-bold text-white/80">Bons Resultados ({goodResults.length})</span>
                    <i className={`fa-solid fa-chevron-down text-xs ml-auto transition-transform ${activeSeoTab === 'good' ? 'rotate-180' : ''}`}></i>
                 </div>
                 {activeSeoTab === 'good' && (
                   <div className="space-y-2 pl-5">
                      {goodResults.map(c => (
                        <div key={c.id} className="text-xs text-white/60 flex items-start gap-2">
                           <i className="fa-solid fa-check text-green-500 mt-0.5"></i> {c.message}
                        </div>
                      ))}
                   </div>
                 )}
               </div>
             )}
             
             {seoChecks.length === 0 && <p className="text-white/40 text-xs text-center mt-4">Defina uma palavra-chave para iniciar.</p>}
          </div>

          <div className="border-t border-white/10 mt-6 pt-6 space-y-3">
             <InputGroup label="Meta Title">
               <StyledInput value={formData.meta_title || ''} maxLength={60} onChange={e => setFormData({...formData, meta_title: e.target.value})} />
             </InputGroup>
             <InputGroup label="Meta Description">
               <StyledTextArea value={formData.meta_description || ''} maxLength={160} rows={3} onChange={e => setFormData({...formData, meta_description: e.target.value})} />
             </InputGroup>
          </div>
        </div>

        {/* GOOGLE PREVIEW WIDGET */}
        <div className="bg-white text-black rounded-xl overflow-hidden shadow-lg border border-white/20">
          <div className="bg-[#1f1f1f] p-3 flex justify-between items-center text-white">
            <span className="text-xs font-bold">Google Preview</span>
            <div className="flex bg-white/10 rounded-full p-1 gap-1">
              <button onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded-full ${previewMode === 'mobile' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/50'}`}><i className="fa-solid fa-mobile-screen"></i></button>
              <button onClick={() => setPreviewMode('desktop')} className={`p-1.5 rounded-full ${previewMode === 'desktop' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/50'}`}><i className="fa-solid fa-desktop"></i></button>
            </div>
          </div>
          
          <div className="p-4 font-arial max-w-full overflow-hidden bg-white">
             {previewMode === 'mobile' ? (
                // MOBILE PREVIEW
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-3">
                     <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center p-1 border border-gray-200">
                        {/* Fake Favicon */}
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-cyan-500"></div>
                     </div>
                     <div className="flex flex-col leading-tight">
                        <span className="text-[#202124] font-bold text-xs">UX Vision</span>
                        <span className="text-[#4d5156] text-[10px] truncate">uxvision.com.br › blog › {formData.slug || 'post'}</span>
                     </div>
                  </div>
                  
                  <div className="flex gap-3">
                     <div className="flex-1">
                        <div className="text-[#195bb9] font-medium text-base leading-snug mb-1 hover:underline cursor-pointer">
                           {formData.meta_title || formData.title || 'Título do Artigo'}
                        </div>
                        <div className="text-[#4d5156] text-sm leading-snug line-clamp-3">
                           <span className="text-[#70757a]">{new Date().toLocaleDateString()} — </span>
                           {formData.meta_description || formData.excerpt || "Descrição..."}
                        </div>
                     </div>
                     {formData.image && (
                        <div className="w-[92px] h-[92px] flex-shrink-0">
                           <img src={formData.image} className="w-full h-full object-cover rounded-lg border border-black/5" />
                        </div>
                     )}
                  </div>
                </div>
             ) : (
                // DESKTOP PREVIEW
                <div className="text-sm">
                   <div className="flex items-center gap-1 text-[#202124] text-xs mb-1">
                      <div className="w-4 h-4 rounded-full bg-gray-200 mr-1 flex items-center justify-center text-[8px]">V</div>
                      <span>UX Vision</span>
                      <span className="text-gray-400">›</span>
                      <span>blog</span>
                      <span className="text-gray-400">›</span>
                      <span>{formData.slug || 'post'}</span>
                   </div>
                   <div className="text-[#1a0dab] text-xl cursor-pointer hover:underline mb-1">
                      {formData.meta_title || formData.title || 'Título do Artigo'}
                   </div>
                   <div className="text-[#4d5156] text-sm leading-snug max-w-[600px]">
                     <span className="text-[#70757a]">{new Date().toLocaleDateString()} — </span>
                     {formData.meta_description || formData.excerpt || "A descrição do seu artigo aparecerá aqui nos resultados de busca do Google..."}
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MICROSAAS VIEW ---
const MicrosaasView = () => {
  const [items, setItems] = useState<MicrosaasItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<MicrosaasItem>>({});
  const [featureInput, setFeatureInput] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("microsaas").select("*").order("created_at", { ascending: false });
    if(data) setItems(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      price: formData.price,
      link: formData.link,
      image: formData.image, // Incluindo imagem
      features: formData.features || []
    };

    const { error } = formData.id
      ? await supabase.from("microsaas").update(payload).eq("id", formData.id)
      : await supabase.from("microsaas").insert([payload]);

    if (error) alert("Erro: " + error.message);
    else {
      setIsEditing(false);
      load();
    }
  };

  const addFeature = (e: any) => {
    if ((e.key === 'Enter' || e.type === 'click') && featureInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }));
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => {
      const newFeatures = [...(prev.features || [])];
      newFeatures.splice(index, 1);
      return { ...prev, features: newFeatures };
    });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `microsaas_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    await supabase.storage.from("portfolio-images").upload(name, file);
    const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(name);
    setFormData(prev => ({ ...prev, image: publicUrl }));
  };

  // --- EDIT FORM ---
  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto bg-dark-glass border border-dark-border rounded-2xl p-8 backdrop-blur-md animate-fade-in">
        <h3 className="text-xl font-bold mb-6">{formData.id ? 'Editar Produto' : 'Novo Produto Microsaas'}</h3>
        <form onSubmit={handleSave} className="space-y-6">
          <InputGroup label="Nome do Produto">
            <StyledInput value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </InputGroup>
          
          <div className="grid grid-cols-2 gap-4">
            <InputGroup label="Status">
              <StyledSelect value={formData.status || 'Venda'} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                <option value="Venda">Venda</option>
                <option value="Uso">Uso</option>
                <option value="Beta">Beta</option>
              </StyledSelect>
            </InputGroup>
            <InputGroup label="Preço">
              <StyledInput value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="R$ 97,00 ou Grátis" />
            </InputGroup>
          </div>

          <InputGroup label="Ícone / Logo">
             <div className="flex items-center gap-4 p-4 border border-dashed border-white/20 rounded-xl bg-white/5">
                <label className="cursor-pointer bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-4 py-2 rounded-lg font-bold hover:bg-neon-cyan/20 transition-colors">
                  <i className="fa-solid fa-image mr-2"></i> Upload Ícone
                  <input type="file" hidden accept="image/*" onChange={handleImage} />
                </label>
                {formData.image && <img src={formData.image} className="h-10 w-10 object-contain rounded bg-black/50 p-1" alt="Preview" />}
             </div>
          </InputGroup>

          <InputGroup label="Descrição Detalhada">
            {/* SUBSTITUÍDO StyledTextArea POR NeonEditor */}
            <NeonEditor 
              value={formData.description || ''} 
              onChange={(newContent) => setFormData({ ...formData, description: newContent })} 
              placeholder="Descreva as funcionalidades do seu SaaS..." 
            />
          </InputGroup>

          <InputGroup label="Link de Acesso">
            <StyledInput value={formData.link || ''} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." />
          </InputGroup>

          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <label className="block mb-2 text-xs text-white/60 uppercase font-semibold">Funcionalidades</label>
            <div className="flex gap-2 mb-3">
              <StyledInput value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={addFeature} placeholder="Digite e aperte Enter..." className="flex-1" />
              <Button onClick={addFeature} variant="secondary"><i className="fa-solid fa-plus"></i></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.features?.map((feat, i) => (
                <span key={i} className="bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {feat}
                  <button type="button" onClick={() => removeFeature(i)} className="hover:text-red-400"><i className="fa-solid fa-xmark"></i></button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="submit" className="flex-1">Salvar Produto</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
          </div>
        </form>
      </div>
    );
  }

  // --- UNIFIED CARD LAYOUT ---
  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Microsaas</h3>
        <Button onClick={() => { setFormData({ status: 'Venda' }); setIsEditing(true); }}><i className="fa-solid fa-plus"></i> Novo</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col">
            {/* Visual Header */}
            <div className="h-40 relative bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
               
               {/* Se tiver imagem, mostra ela. Se não, mostra o ícone padrão */}
               {item.image ? (
                 <img src={item.image} className="h-20 w-auto object-contain z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-500" alt={item.name} />
               ) : (
                 <i className="fa-solid fa-cube text-5xl text-white/20 group-hover:scale-110 transition-transform duration-500"></i>
               )}
               
               {/* Status Badge */}
               <div className="absolute top-2 right-2 z-20">
                 <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${
                    item.status === 'Venda' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    item.status === 'Uso' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                 }`}>
                   {item.status}
                 </span>
               </div>

               {/* Action Overlay */}
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-300 z-30">
                  <button onClick={() => { setFormData(item); setIsEditing(true); }} className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-neon-purple hover:border-neon-purple flex items-center justify-center"><i className="fa-solid fa-pen"></i></button>
                  <button onClick={async () => { if(confirm('Del?')) { await supabase.from('microsaas').delete().eq('id', item.id); load(); } }} className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-red-500 hover:border-red-500 flex items-center justify-center"><i className="fa-solid fa-trash"></i></button>
               </div>
            </div>

            <div className="p-4 flex flex-col flex-grow">
              <span className="text-xs text-neon-cyan uppercase font-bold tracking-wider mb-1">{item.price}</span>
              <h4 className="text-lg font-bold text-white mb-2">{item.name}</h4>
              
              {/* Descrição agora pode conter HTML, então removemos tags para o preview do card */}
              <p className="text-white/50 text-xs line-clamp-3 mb-4">
                {item.description ? item.description.replace(/<[^>]*>?/gm, '') : ''}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-auto">
                {item.features?.slice(0, 2).map((f, i) => (
                  <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/10 text-white/50 truncate max-w-[100px]">{f}</span>
                ))}
                {(item.features?.length || 0) > 2 && <span className="text-[10px] text-white/40 px-1 py-1">+{item.features!.length - 2}</span>}
              </div>
            </div>
            
            <div className="bg-black/20 border-t border-white/10 p-3 flex justify-between items-center">
               <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-white/60 hover:text-neon-cyan hover:underline truncate max-w-[150px] flex items-center gap-2">
                 <i className="fa-solid fa-external-link-alt text-[10px]"></i> Acessar
               </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- PORTFOLIO VIEW ---
const PortfolioView = () => {
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PortfolioItem>>({});
  const [techInput, setTechInput] = useState("");
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("portfolio").select("*").order("created_at", { ascending: false });
    if(data) setProjects(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      title: formData.title, 
      category: formData.category, 
      description: formData.description, 
      image: formData.image,
      client: formData.client,
      year: formData.year,
      link: formData.link,
      challenge: formData.challenge,
      solution: formData.solution,
      full_description: formData.full_description,
      technologies: formData.technologies || [],
      gallery: formData.gallery || []
    };
    
    const { error } = formData.id 
       ? await supabase.from("portfolio").update(payload).eq("id", formData.id)
       : await supabase.from("portfolio").insert([payload]);

    if (error) alert("Erro: " + error.message);
    else {
      setIsEditing(false);
      load();
    }
  };

  const handleCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `pf_cover_${Date.now()}_${file.name}`;
    await supabase.storage.from("portfolio-images").upload(name, file);
    const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(name);
    setFormData(p => ({ ...p, image: publicUrl }));
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploadingGallery(true);
    const files = Array.from(e.target.files);
    const newUrls: string[] = [];

    for (const file of files) {
      const name = `pf_gallery_${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("portfolio-images").upload(name, file);
      if (!error) {
         const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(name);
         newUrls.push(publicUrl);
      }
    }
    setFormData(p => ({ ...p, gallery: [...(p.gallery || []), ...newUrls] }));
    setIsUploadingGallery(false);
  };

  const removeGalleryImage = (index: number) => {
    setFormData(p => {
      const newGallery = [...(p.gallery || [])];
      newGallery.splice(index, 1);
      return { ...p, gallery: newGallery };
    });
  };

  const addTech = (e: any) => {
    if ((e.key === 'Enter' || e.type === 'click') && techInput.trim()) {
      e.preventDefault();
      setFormData(p => ({ ...p, technologies: [...(p.technologies || []), techInput.trim()] }));
      setTechInput("");
    }
  };

  const removeTech = (index: number) => {
    setFormData(p => {
      const newTech = [...(p.technologies || [])];
      newTech.splice(index, 1);
      return { ...p, technologies: newTech };
    });
  };

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-dark-glass border border-dark-border rounded-2xl p-8 backdrop-blur-md animate-fade-in">
        <h3 className="text-xl font-bold mb-6">{formData.id ? 'Editar Projeto' : 'Novo Projeto'}</h3>
        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <InputGroup label="Título do Projeto">
               <StyledInput value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
             </InputGroup>
             <InputGroup label="Categoria">
                <StyledSelect value={formData.category || 'Web Design'} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="Web Design">Web Design</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="App / Bubble">App / Bubble</option>
                  <option value="Landing Page">Landing Page</option>
                  <option value="Branding">Branding</option>
                  <option value="Tráfego Pago">Tráfego Pago</option>
                </StyledSelect>
             </InputGroup>
             <InputGroup label="Cliente">
               <StyledInput value={formData.client || ''} onChange={e => setFormData({...formData, client: e.target.value})} placeholder="Ex: Nike, Startup X" />
             </InputGroup>
             <div className="flex gap-4">
               <InputGroup label="Ano">
                 <StyledInput value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="Ex: 2024" />
               </InputGroup>
               <InputGroup label="Link do Projeto">
                 <StyledInput value={formData.link || ''} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
               </InputGroup>
             </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <label className="block mb-2 text-xs text-white/60 uppercase font-semibold">Tecnologias Utilizadas</label>
            <div className="flex gap-2 mb-3">
               <StyledInput value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={addTech} placeholder="Digite e aperte Enter (ex: React, Node, Figma)..." className="flex-1" />
               <Button onClick={addTech} variant="secondary"><i className="fa-solid fa-plus"></i></Button>
            </div>
            <div className="flex flex-wrap gap-2">
               {formData.technologies?.map((tech, i) => (
                 <span key={i} className="bg-neon-purple/20 border border-neon-purple/30 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {tech}
                    <button type="button" onClick={() => removeTech(i)} className="hover:text-red-400"><i className="fa-solid fa-xmark"></i></button>
                 </span>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <InputGroup label="Imagem de Capa (Principal)">
                <div className="border border-dashed border-white/20 rounded-xl p-4 text-center hover:bg-white/5 transition-colors relative h-full flex flex-col items-center justify-center">
                   {formData.image ? ( <img src={formData.image} className="h-32 object-cover rounded-lg mb-2" /> ) : ( <i className="fa-solid fa-image text-3xl text-white/20 mb-2"></i> )}
                   <label className="cursor-pointer text-neon-cyan text-sm font-bold hover:underline">
                      Alterar Capa
                      <input type="file" hidden accept="image/*" onChange={handleCoverImage} />
                   </label>
                </div>
             </InputGroup>

             <InputGroup label="Galeria de Imagens (Detalhes)">
                <div className="border border-dashed border-white/20 rounded-xl p-4 min-h-[160px]">
                   <div className="flex flex-wrap gap-2 mb-3">
                      {formData.gallery?.map((url, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                           <img src={url} className="w-full h-full object-cover" />
                           <button type="button" onClick={() => removeGalleryImage(i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      ))}
                   </div>
                   <label className={`block text-center cursor-pointer bg-white/5 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors ${isUploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}>
                      {isUploadingGallery ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus"></i> Adicionar Imagens</>}
                      <input type="file" hidden multiple accept="image/*" onChange={handleGalleryUpload} />
                   </label>
                </div>
             </InputGroup>
          </div>

          <InputGroup label="Descrição Curta (Resumo)">
             <StyledTextArea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} placeholder="Aparece no card da home..." />
          </InputGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <InputGroup label="O Desafio">
                <StyledTextArea value={formData.challenge || ''} onChange={e => setFormData({...formData, challenge: e.target.value})} rows={4} placeholder="Qual era o problema a ser resolvido?" />
             </InputGroup>
             <InputGroup label="A Solução">
                <StyledTextArea value={formData.solution || ''} onChange={e => setFormData({...formData, solution: e.target.value})} rows={4} placeholder="Como você resolveu o problema?" />
             </InputGroup>
          </div>

          <InputGroup label="História Completa (Visão Geral)">
             <NeonEditor value={formData.full_description || ''} onChange={val => setFormData({...formData, full_description: val})} placeholder="Escreva os detalhes completos do projeto, insira imagens extras, formate texto..." />
          </InputGroup>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Button type="submit" className="flex-1">Salvar Projeto</Button>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">Projetos</h3>
        <Button onClick={() => { setFormData({}); setIsEditing(true); }}><i className="fa-solid fa-plus"></i> Novo</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {projects.map(p => (
           <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
             <div className="h-40 overflow-hidden relative">
               <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-300">
                  <button onClick={() => { setFormData(p); setIsEditing(true); }} className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-neon-purple hover:border-neon-purple flex items-center justify-center"><i className="fa-solid fa-pen"></i></button>
                  <button onClick={async () => { if(confirm('Del?')) { await supabase.from('portfolio').delete().eq('id', p.id); load(); } }} className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-red-500 hover:border-red-500 flex items-center justify-center"><i className="fa-solid fa-trash"></i></button>
               </div>
             </div>
             <div className="p-4">
               <span className="text-xs text-neon-cyan uppercase font-bold tracking-wider">{p.category}</span>
               <h4 className="text-lg font-bold text-white mt-1 truncate">{p.title}</h4>
               <p className="text-white/50 text-xs mt-1 truncate">{p.client ? `Cliente: ${p.client}` : 'Cliente Confidencial'}</p>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};

// --- MEDIA VIEW ---
const MediaView = () => {
  const [images, setImages] = useState<{name: string, url: string}[]>([]);
  
  const load = async () => {
    const { data } = await supabase.storage.from("portfolio-images").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if(data) {
      const mapped = data.filter((f: any) => f.name !== '.emptyFolderPlaceholder').map((f: any) => ({
        name: f.name,
        url: supabase.storage.from("portfolio-images").getPublicUrl(f.name).data.publicUrl
      }));
      setImages(mapped);
    }
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `${Date.now()}_media_${file.name.replace(/\s/g, '_')}`;
    await supabase.storage.from("portfolio-images").upload(name, file);
    load();
  };

  const handleDeleteImage = async (imageName: string) => {
    if(!confirm('Tem certeza que deseja apagar esta imagem permanentemente?')) return;
    const { error } = await supabase.storage.from('portfolio-images').remove([imageName]);
    if (error) {
      alert("Erro ao excluir imagem: " + error.message);
    } else {
      load();
    }
  };

  return (
    <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md animate-fade-in">
       <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
         <h3 className="font-bold text-xl"><i className="fa-solid fa-images mr-2 text-neon-purple"></i> Galeria</h3>
         <label className="cursor-pointer bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold hover:bg-neon-cyan/10 hover:border-neon-cyan/50 hover:text-white transition-all flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-up"></i> Upload
            <input type="file" hidden accept="image/*" onChange={handleUpload} />
         </label>
       </div>
       <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
         {images.map(img => (
           <div key={img.name} className="aspect-square rounded-xl overflow-hidden relative group border border-white/10 bg-black/30">
             <img src={img.url} className="w-full h-full object-cover" loading="lazy" />
             <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
               <button onClick={() => { navigator.clipboard.writeText(img.url); alert('URL copiada!'); }} className="p-2 text-white hover:text-neon-cyan" title="Copiar Link"><i className="fa-solid fa-link"></i></button>
               <button onClick={() => handleDeleteImage(img.name)} className="p-2 text-white hover:text-red-500" title="Excluir"><i className="fa-solid fa-trash"></i></button>
             </div>
           </div>
         ))}
       </div>
    </div>
  );
};

// --- SETTINGS VIEW ---
const SettingsView = () => {
  const [data, setData] = useState<Partial<SiteSettings>>({});
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", 1).single().then(({data}: { data: any }) => {
       if(data) setData(data);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("site_settings").update(data).eq("id", 1);
    
    if(error) {
       const { error: insertError } = await supabase.from("site_settings").insert([{ ...data, id: 1 }]);
       if (insertError) alert("Erro ao salvar: " + insertError.message);
       else alert("Configurações criadas e salvas!");
    } else {
       alert("Configurações atualizadas!");
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if(!e.target.files?.[0]) return;
     const file = e.target.files[0];
     const name = `avatar_${Date.now()}`;
     await supabase.storage.from("portfolio-images").upload(name, file);
     const { data: { publicUrl } } = supabase.storage.from("portfolio-images").getPublicUrl(name);
     setData(p => ({...p, author_avatar: publicUrl}));
  };

  const handleTriggerDeploy = async () => {
    setDeploying(true);
    await new Promise(r => setTimeout(r, 2000));
    alert("Webhook disparado! O site está sendo atualizado.");
    setDeploying(false);
  };

  const trackerSnippet = `
// INSTALAÇÃO DO RASTREADOR DE ANALYTICS
// Cole este código no arquivo principal do seu site (Ex: App.js, layout.tsx ou index.html dentro de uma tag <script>)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  '${supabaseUrl}', 
  '${supabaseKey}'
);

const trackView = async () => {
  try {
    await supabase.from('page_analytics').insert([{
      path: window.location.pathname + window.location.search,
      referrer: document.referrer,
      user_agent: navigator.userAgent
    }]);
  } catch (e) { console.error('Analytics Error', e); }
};

// Executar ao carregar a página
trackView();
`;

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
       <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
          <h3 className="font-bold text-lg mb-6 text-neon-cyan">Perfil & Social</h3>
          <div className="flex flex-col items-center mb-6">
             <div className="w-24 h-24 rounded-full bg-white/5 border border-white/20 overflow-hidden mb-3 relative group">
                <img src={data.author_avatar || "https://via.placeholder.com/100"} className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                   <i className="fa-solid fa-camera text-white"></i>
                   <input type="file" hidden accept="image/*" onChange={handleAvatar} />
                </label>
             </div>
          </div>
          <InputGroup label="Nome">
             <StyledInput value={data.author_name || ''} onChange={e => setData({...data, author_name: e.target.value})} />
          </InputGroup>
          <InputGroup label="Bio">
             <StyledTextArea value={data.author_bio || ''} onChange={e => setData({...data, author_bio: e.target.value})} rows={3} />
          </InputGroup>
          <div className="grid grid-cols-2 gap-4 mt-6">
             <InputGroup icon="fa-brands fa-whatsapp"><StyledInput placeholder="WhatsApp" value={data.whatsapp || ''} onChange={e => setData({...data, whatsapp: e.target.value})} hasIcon /></InputGroup>
             <InputGroup icon="fa-brands fa-instagram"><StyledInput placeholder="Instagram" value={data.instagram || ''} onChange={e => setData({...data, instagram: e.target.value})} hasIcon /></InputGroup>
             <InputGroup icon="fa-brands fa-linkedin"><StyledInput placeholder="LinkedIn" value={data.linkedin || ''} onChange={e => setData({...data, linkedin: e.target.value})} hasIcon /></InputGroup>
          </div>
       </div>

       <div className="space-y-6">
         
         {/* NOVO: INSTALAÇÃO DO RASTREADOR */}
         <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-bold text-lg mb-4 text-neon-cyan"><i className="fa-solid fa-code mr-2"></i> Instalação do Rastreador</h3>
            <p className="text-xs text-white/60 mb-3">
               Para que o Dashboard de Analytics funcione, você precisa instalar este código no seu site público (Frontend). Ele envia os dados de visita para o Supabase.
            </p>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-[10px] text-white/70 overflow-x-auto relative group">
               <pre>{trackerSnippet.trim()}</pre>
               <button 
                 type="button"
                 onClick={() => { navigator.clipboard.writeText(trackerSnippet); alert('Código copiado!'); }}
                 className="absolute top-2 right-2 bg-white/10 hover:bg-neon-purple text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-all"
               >
                 <i className="fa-solid fa-copy"></i>
               </button>
            </div>
         </div>

         <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <i className="fa-solid fa-server text-6xl text-white"></i>
            </div>
            <h3 className="font-bold text-lg mb-4 text-green-400">Deploy & Publicação</h3>
            <p className="text-xs text-white/60 mb-4">
              Dispare uma atualização manual no seu site frontend (Vercel/Netlify) para refletir as mudanças recentes.
            </p>
            <Button 
              onClick={handleTriggerDeploy} 
              disabled={deploying}
              className={`w-full ${deploying ? 'animate-pulse' : ''}`}
            >
              {deploying ? (
                <><i className="fa-solid fa-circle-notch fa-spin"></i> Atualizando Site...</>
              ) : (
                <><i className="fa-solid fa-bolt"></i> Publicar Alterações Agora</>
              )}
            </Button>
         </div>

         <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-bold text-lg mb-4 text-neon-purple">Pixels & Analytics</h3>
            <InputGroup label="Google Analytics (GA4)" icon="fa-brands fa-google">
               <StyledInput value={data.pixel_google || ''} onChange={e => setData({...data, pixel_google: e.target.value})} hasIcon placeholder="G-XXXXXXXX" />
            </InputGroup>
            <InputGroup label="Meta Pixel" icon="fa-brands fa-meta">
               <StyledInput value={data.pixel_meta || ''} onChange={e => setData({...data, pixel_meta: e.target.value})} hasIcon placeholder="ID..." />
            </InputGroup>
         </div>

         <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
            <h3 className="font-bold text-lg mb-4">Scripts Globais</h3>
            <InputGroup label="HEAD Scripts">
               <StyledTextArea value={data.head_scripts || ''} onChange={e => setData({...data, head_scripts: e.target.value})} className="font-mono text-xs" />
            </InputGroup>
            <Button type="submit" className="w-full mt-4">Salvar Configurações</Button>
         </div>
       </div>
    </form>
  );
};

export default App;