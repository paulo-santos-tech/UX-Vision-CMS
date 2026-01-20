import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
import type { PortfolioItem, BlogPost, BlogCategory, SiteSettings, ViewState, MicrosaasItem, PageView, SeoCheckItem } from './types';

// IMPORTAÇÃO DO LOGO
import logoImg from './assets/logo.svg';

// ============================================================================
// 1. COMPONENTES DE UI REUTILIZÁVEIS
// ============================================================================

const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan"></div>
  </div>
);

/**
 * COMPONENTE DE GRÁFICO DE TRÁFEGO
 */
const TrafficChart = ({ data }: { data: { label: string; count: number; tooltip: string }[] }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-white/30 text-xs">Sem dados suficientes para exibir o gráfico.</div>;

  const height = 150;
  const maxVal = Math.max(...data.map(d => d.count), 1); 
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 1000;
    const y = height - (d.count / maxVal) * height;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `0,${height} ${points} 1000,${height}`;

  return (
    <div className="w-full h-[180px] relative mt-4 group cursor-crosshair">
      <svg viewBox="0 0 1000 150" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#00e2ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00e2ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <line x1="0" y1="0" x2="1000" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
        <line x1="0" y1="75" x2="1000" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,5" />
        <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

        <polygon points={fillPoints} fill="url(#gradient)" />
        <polyline points={points} fill="none" stroke="#00e2ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_10px_rgba(0,226,255,0.5)]" />

        {data.map((d, i) => {
           const x = (i / (data.length - 1)) * 1000;
           const y = height - (d.count / maxVal) * height;
           return (
             <g key={i} className="group/point">
               <rect x={x - 10} y="0" width="20" height="150" fill="transparent" />
               <circle cx={x} cy={y} r="4" fill="#fff" className="opacity-0 group-hover/point:opacity-100 transition-opacity" />
               <line x1={x} y1={y} x2={x} y2={150} stroke="rgba(255,255,255,0.2)" strokeDasharray="2,2" className="opacity-0 group-hover/point:opacity-100" />
               
               <foreignObject x={x < 500 ? x : x - 120} y={0} width="120" height="60" className="opacity-0 group-hover/point:opacity-100 pointer-events-none transition-opacity z-50">
                  <div className={`bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg p-2 text-xs text-white shadow-2xl ${x < 500 ? 'ml-3' : 'mr-3'}`}>
                    <div className="font-bold text-neon-cyan text-sm">{d.count} Visitas</div>
                    <div className="text-white/60 text-[10px] uppercase tracking-wide">{d.tooltip}</div>
                  </div>
               </foreignObject>
             </g>
           )
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-white/40 mt-2 font-mono uppercase tracking-widest">
         <span>{data[0]?.label}</span>
         <span>{data[Math.floor(data.length/2)]?.label}</span>
         <span>{data[data.length-1]?.label}</span>
      </div>
    </div>
  );
};

const SeoGauge = ({ score }: { score: number }) => {
  const radius = 30;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  let color = 'text-red-500';
  let icon = 'fa-frown';
  let label = 'Ruim';
  if (score >= 50 && score < 80) { color = 'text-orange-400'; icon = 'fa-meh'; label = 'Regular'; } 
  else if (score >= 80) { color = 'text-green-500'; icon = 'fa-smile'; label = 'Excelente'; }

  return (
    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
          <circle stroke="currentColor" className={`${color} transition-all duration-1000 ease-out`} strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        </svg>
        <div className={`absolute text-xl ${color}`}><i className={`fa-solid ${icon}`}></i></div>
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-white/50 mb-0.5">SEO Score</div>
        <div className={`text-2xl font-black ${color}`}>{score}/100</div>
        <div className="text-sm font-medium text-white/80">{label}</div>
      </div>
    </div>
  );
};

const NeonEditor = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };
  const exec = (command: string, value: string | undefined = undefined) => { document.execCommand(command, false, value); if (editorRef.current) editorRef.current.focus(); handleInput(); };
  const addLink = () => { const url = prompt('URL do link:'); if (url) exec('createLink', url); };

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
    } catch (err: any) { alert("Erro ao enviar imagem: " + (err.message || "Erro desconhecido")); } 
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 flex flex-col h-[400px]">
      <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
      <div className="bg-white/5 border-b border-white/10 p-2 flex flex-wrap gap-2 items-center">
        <select onChange={(e) => { exec('formatBlock', e.target.value); e.target.value=""; }} className="bg-black/40 text-white/80 text-xs border border-white/10 rounded px-2 py-1 outline-none cursor-pointer">
            <option value="">Texto Normal</option>
            <option value="H2">Título H2</option>
            <option value="H3">Título H3</option>
        </select>
        <div className="w-px h-4 bg-white/10 mx-1"></div>
        <button type="button" onClick={() => exec('bold')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white"><i className="fa-solid fa-bold text-xs"></i></button>
        <button type="button" onClick={() => exec('italic')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white"><i className="fa-solid fa-italic text-xs"></i></button>
        <button type="button" onClick={() => exec('insertUnorderedList')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white"><i className="fa-solid fa-list-ul text-xs"></i></button>
        <button type="button" onClick={addLink} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-neon-cyan"><i className="fa-solid fa-link text-xs"></i></button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 ${isUploading ? 'text-neon-purple animate-pulse' : 'text-white/70 hover:text-neon-purple'}`}><i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-image'} text-xs`}></i></button>
      </div>
      <div ref={editorRef} contentEditable onInput={handleInput} className="flex-grow p-4 outline-none overflow-y-auto neon-editor-content bg-transparent font-sans text-sm text-gray-200 leading-relaxed" data-placeholder={placeholder} />
    </div>
  );
};

const InputGroup = ({ label, children, icon, className = "" }: { label?: string, children: React.ReactNode, icon?: string, className?: string }) => (
  <div className={`mb-5 w-full relative ${className}`}>
    {label && <label className="block mb-2 text-xs text-white/60 uppercase tracking-wide font-semibold">{label}</label>}
    <div className="relative">{icon && <i className={`${icon} absolute left-4 top-1/2 -translate-y-1/2 text-lg text-neon-cyan opacity-80 pointer-events-none z-10`}></i>}{children}</div>
  </div>
);
const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement> & { hasIcon?: boolean }) => <input {...props} className={`w-full bg-black/40 border border-white/10 rounded-xl text-white text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 ${props.hasIcon ? 'pl-12 py-4' : 'px-4 py-3'} ${props.className}`} />;
const StyledTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasIcon?: boolean }) => <textarea {...props} className={`w-full bg-black/40 border border-white/10 rounded-xl text-white text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 min-h-[100px] resize-y ${props.hasIcon ? 'pl-12 py-4' : 'px-4 py-3'} ${props.className}`} />;
const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className={`w-full bg-black/40 border border-white/10 rounded-xl text-white text-sm transition-all focus:border-neon-purple focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-neon-purple/20 px-4 py-3 appearance-none ${props.className}`}>{props.children}</select>;
const Button = ({ children, onClick, variant = 'primary', type = 'button', className = '', disabled }: { children: React.ReactNode, onClick?: (e: React.MouseEvent) => void, variant?: 'primary' | 'secondary' | 'danger' | 'outline', type?: 'button' | 'submit', className?: string, disabled?: boolean }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-gradient-to-br from-[#b200ff] to-[#7b00ff] text-white shadow-lg shadow-neon-purple/20 hover:-translate-y-0.5 hover:shadow-neon-purple/30",
    secondary: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20",
    danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40",
    outline: "bg-transparent border border-white/20 text-white/80 hover:text-white hover:border-neon-cyan/40 hover:bg-neon-cyan/5"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{children}</button>;
};

// ============================================================================
// 2. COMPONENTE PRINCIPAL
// ============================================================================

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'editor'>('editor');
  const [view, setView] = useState<ViewState>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id); else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();
    setRole(data?.role || 'admin'); 
    setLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-dark-bg text-white"><LoadingSpinner /></div>;

  return (
    <div className="min-h-screen text-white font-sans selection:bg-neon-purple/30 selection:text-white">
      {!session ? <LoginScreen /> : (
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
// 3. TELAS
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
    if (error) setError("Credenciais inválidas.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-dark-glass backdrop-blur-xl border border-dark-border rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8"><img src={logoImg} alt="UX Vision" className="h-14 w-auto object-contain opacity-90" /></div>
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleLogin}>
          <InputGroup icon="fa-solid fa-envelope" className="mb-4"><StyledInput type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required hasIcon /></InputGroup>
          <InputGroup icon="fa-solid fa-lock" className="mb-6">
            <div className="relative"><StyledInput type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required hasIcon />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white z-20"><i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
            </div>
          </InputGroup>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
          {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
};

const Header = ({ email, role, onLogout }: { email: string, role: string, onLogout: () => void }) => (
  <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 rounded-b-2xl mb-6 flex justify-between items-center">
    <div className="flex items-center gap-3"><img src={logoImg} alt="UX Vision" className="h-8 w-auto object-contain" /><span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 rounded-full">{role}</span></div>
    <div className="flex items-center gap-4"><span className="hidden sm:block text-white/80 text-sm">{email}</span><button onClick={onLogout} className="p-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"><i className="fa-solid fa-power-off"></i></button></div>
  </header>
);

const Navigation = ({ currentView, setView, role }: { currentView: ViewState, setView: (v: ViewState) => void, role: string }) => {
  const tabs: { id: ViewState, label: string, icon: string, adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: 'fa-solid fa-chart-pie' },
    { id: 'blog', label: 'Blog', icon: 'fa-solid fa-newspaper' },
    { id: 'portfolio', label: 'Portfólio', icon: 'fa-solid fa-briefcase', adminOnly: true },
    { id: 'microsaas', label: 'Microsaas', icon: 'fa-solid fa-cube' },
    { id: 'media', label: 'Mídia', icon: 'fa-solid fa-images' },
    { id: 'settings', label: 'Configurações', icon: 'fa-solid fa-sliders', adminOnly: true },
  ];
  return (
    <div className="overflow-x-auto pb-2"><div className="flex gap-2 min-w-max">
      {tabs.map(tab => {
        if (tab.adminOnly && role !== 'admin') return null;
        return <button key={tab.id} onClick={() => setView(tab.id)} className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-200 border ${currentView === tab.id ? 'bg-neon-purple/10 border-neon-purple/30 text-white shadow-[0_0_15px_-3px_rgba(178,0,255,0.3)]' : 'bg-transparent border-transparent text-white/50 hover:bg-white/5 hover:text-white'}`}><i className={tab.icon}></i>{tab.label}</button>;
      })}
    </div></div>
  );
};

// --- DASHBOARD VIEW COM FILTROS DE TEMPO ---
type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y';

const DashboardView = () => {
  const [stats, setStats] = useState({ visits: 0, projects: 0, posts: 0 });
  const [analyticsData, setAnalyticsData] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const { count: proj } = await supabase.from("portfolio").select("*", { count: "exact", head: true });
        const { count: post } = await supabase.from("blog_posts").select("*", { count: "exact", head: true });
        
        const now = new Date();
        const startDate = new Date();
        if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
        else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
        else if (timeRange === '90d') startDate.setDate(now.getDate() - 90);
        else if (timeRange === '1y') startDate.setFullYear(now.getFullYear() - 1);

        let visits = 0;
        let pageViews: PageView[] = [];

        try {
          const { data, count, error } = await supabase
            .from("page_analytics")
            .select("*")
            .gte("created_at", startDate.toISOString())
            .order("created_at", { ascending: true });
            
          if (!error && data) {
            visits = count || data.length;
            pageViews = data;
          }
        } catch { /* Ignora */ }

        setStats({ visits, projects: proj || 0, posts: post || 0 });
        setAnalyticsData(pageViews);
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    loadStats();
  }, [timeRange]);

  const { chartData, topPages, topReferrers } = useMemo(() => {
    const pages: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    const groupedCounts: Record<string, number> = {};
    
    const now = new Date();
    const isHourly = timeRange === '24h';
    const isMonthly = timeRange === '1y';
    
    if (isHourly) {
      for(let i=23; i>=0; i--) {
        const d = new Date(now); d.setHours(now.getHours() - i);
        groupedCounts[d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})] = 0;
      }
    } else if (isMonthly) {
      for(let i=11; i>=0; i--) {
        const d = new Date(now); d.setMonth(now.getMonth() - i);
        groupedCounts[d.toLocaleDateString('pt-BR', {month: 'short', year: '2-digit'})] = 0;
      }
    } else {
      const days = timeRange === '7d' ? 6 : timeRange === '30d' ? 29 : 89;
      for(let i=days; i>=0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        groupedCounts[d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})] = 0;
      }
    }

    analyticsData.forEach(view => {
       const date = new Date(view.created_at);
       let key = '';
       if (isHourly) {
          const h = date.getHours();
          const targetKey = Object.keys(groupedCounts).find(k => k.startsWith(h.toString().padStart(2, '0')));
          if(targetKey) groupedCounts[targetKey]++;
       } else {
          key = isMonthly ? date.toLocaleDateString('pt-BR', {month: 'short', year: '2-digit'}) 
                          : date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
          if(groupedCounts[key] !== undefined) groupedCounts[key]++;
       }

       pages[view.path || '/'] = (pages[view.path || '/'] || 0) + 1;
       let ref = view.referrer ? new URL(view.referrer).hostname.replace('www.', '') : 'Direto';
       referrers[ref] = (referrers[ref] || 0) + 1;
    });

    const chartData = Object.entries(groupedCounts).map(([label, count]) => ({ 
      label, count, tooltip: isHourly ? 'nesta hora' : isMonthly ? 'neste mês' : 'neste dia'
    }));

    const topPages = Object.entries(pages).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const topReferrers = Object.entries(referrers).sort((a,b) => b[1] - a[1]).slice(0, 5);

    return { chartData, topPages, topReferrers };
  }, [analyticsData, timeRange]);

  const StatCard = ({ icon, title, value, colorClass }: any) => (
    <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 flex items-center gap-5 backdrop-blur-md relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-110 transition-transform duration-500 ${colorClass.replace('text-', 'bg-')}`}></div>
      <i className={`${icon} text-3xl ${colorClass} relative z-10`}></i>
      <div className="relative z-10">
        <h3 className="text-sm text-white/60 mb-1 font-semibold uppercase tracking-wide">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </div>
  );

  const ListCard = ({ title, items, icon, color }: any) => (
     <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md flex flex-col h-full">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wide">
          <i className={`${icon} ${color}`}></i> {title}
        </h3>
        <div className="space-y-3 flex-grow">
           {items.length === 0 ? <p className="text-white/20 text-xs italic">Sem dados.</p> : items.map(([label, count]: any, i: number) => (
             <div key={i} className="relative">
                <div className="flex justify-between text-xs mb-1 relative z-10">
                   <span className="font-medium text-white/80 truncate max-w-[80%]">{label}</span>
                   <span className="text-white/50">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${(count / Math.max(...items.map((x:any) => x[1]), 1)) * 100}%` }}></div>
                </div>
             </div>
           ))}
        </div>
     </div>
  );

  if (loading) return <div className="flex justify-center items-center h-64 w-full"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border border-white/10 p-8 rounded-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">Analytics</h3>
          <p className="text-white/60 text-sm">Visão geral do tráfego do site.</p>
        </div>
        <div className="bg-black/40 p-1 rounded-lg border border-white/10 flex">
           {[
             { k: '24h', l: 'Hoje' },
             { k: '7d', l: '7 Dias' },
             { k: '30d', l: '30 Dias' },
             { k: '90d', l: '3 Meses' },
             { k: '1y', l: '1 Ano' }
           ].map((r) => (
             <button 
               key={r.k} 
               onClick={() => setTimeRange(r.k as TimeRange)}
               className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${timeRange === r.k ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
             >
               {r.l}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon="fa-solid fa-users" title="Visitas no Período" value={stats.visits} colorClass="text-neon-cyan" />
        <StatCard icon="fa-solid fa-layer-group" title="Projetos Totais" value={stats.projects} colorClass="text-neon-purple" />
        <StatCard icon="fa-solid fa-file-lines" title="Conteúdos Publicados" value={stats.posts} colorClass="text-blue-400" />
      </div>

      <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
         <h3 className="text-lg font-bold mb-2">Evolução do Tráfego</h3>
         <TrafficChart data={chartData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <ListCard title="Páginas Mais Acessadas" items={topPages} icon="fa-solid fa-copy" color="text-neon-purple" />
         <ListCard title="Principais Origens" items={topReferrers} icon="fa-solid fa-globe" color="text-neon-cyan" />
      </div>
    </div>
  );
};

// --- BLOG VIEW ---
const BlogView = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [formData, setFormData] = useState<Partial<BlogPost>>({ status: 'draft', social_shares: { wa: true, fb: false, li: true, tg: false, tw: false } });
  
  const [seoScore, setSeoScore] = useState(0);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [seoChecks, setSeoChecks] = useState<SeoCheckItem[]>([]); // Uso correto de SeoCheckItem

  const loadData = useCallback(async () => {
    const { data: p } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    if (p) setPosts(p);
    const { data: c } = await supabase.from("blog_categories").select("*").order("name");
    if (c) setCategories(c);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // SEO Calculation
  useEffect(() => {
    if (!isEditing) return;
    const title = formData.title || "";
    const content = formData.content || "";
    const keyword = (formData.keyword || "").trim().toLowerCase();
    
    let checksFound = 0;
    const checks: SeoCheckItem[] = []; // Uso do tipo

    if (keyword) {
       if (title.toLowerCase().includes(keyword)) {
         checksFound++;
         checks.push({id: '1', label: 'Título', status: 'good', message: 'Palavra-chave encontrada.'});
       } else {
         checks.push({id: '1', label: 'Título', status: 'bad', message: 'Palavra-chave ausente.'});
       }

       if (content.toLowerCase().includes(keyword)) {
         checksFound++;
         checks.push({id: '2', label: 'Conteúdo', status: 'good', message: 'Palavra-chave no texto.'});
       }
       
       if (content.length > 500) {
         checksFound++;
         checks.push({id: '3', label: 'Tamanho', status: 'good', message: 'Conteúdo extenso.'});
       }
    }
    setSeoChecks(checks);
    setSeoScore(keyword ? Math.round((checksFound/3)*100) : 0);
  }, [formData, isEditing]);

  const handleEdit = (post: BlogPost) => { setFormData(post); setEditingId(post.id); setIsEditing(true); };
  const handleCreate = () => { setFormData({ status: 'draft' }); setEditingId(null); setIsEditing(true); };
  const handleDelete = async (id: number) => { if(confirm('Excluir?')) { await supabase.from('blog_posts').delete().eq('id', id); loadData(); } };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert("Título obrigatório");
    const slug = formData.slug || formData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const payload = { ...formData, slug };
    const { error } = editingId ? await supabase.from("blog_posts").update(payload).eq("id", editingId) : await supabase.from("blog_posts").insert([payload]);
    if (error) alert(error.message); else { setIsEditing(false); loadData(); }
  };
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if(!e.target.files?.[0]) return;
     const file = e.target.files[0];
     const name = `blog_${Date.now()}_${file.name}`;
     await supabase.storage.from('portfolio-images').upload(name, file);
     const { data } = supabase.storage.from('portfolio-images').getPublicUrl(name);
     setFormData({...formData, image: data.publicUrl});
  };
  const handleAddCategory = async () => { if(newCatName) { await supabase.from('blog_categories').insert([{name: newCatName}]); setNewCatName(''); loadData(); } };

  if(!isEditing) return (
    <div className="animate-fade-in">
       <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Blog</h3><Button onClick={handleCreate}>Novo Post</Button></div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {posts.map(post => (
           <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all">
              <div className="h-40 bg-black/40 relative">
                 {post.image && <img src={post.image} className="w-full h-full object-cover" />}
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(post)} className="w-8 h-8 bg-white/20 rounded flex items-center justify-center hover:bg-neon-purple"><i className="fa-solid fa-pen"></i></button>
                    <button onClick={() => handleDelete(post.id)} className="w-8 h-8 bg-white/20 rounded flex items-center justify-center hover:bg-red-500"><i className="fa-solid fa-trash"></i></button>
                 </div>
              </div>
              <div className="p-4">
                 <h4 className="font-bold truncate">{post.title}</h4>
                 <div className="text-xs text-white/50 mt-1">{post.status}</div>
              </div>
           </div>
         ))}
       </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
       <div className="lg:col-span-2 space-y-6">
          <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
             <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Novo'} Post</h3>
             <form onSubmit={handleSave} className="space-y-4">
                <InputGroup label="Título"><StyledInput value={formData.title||''} onChange={(e) => setFormData({...formData, title: e.target.value})} /></InputGroup>
                <div className="grid grid-cols-2 gap-4">
                   <InputGroup label="Categoria">
                      <StyledSelect value={formData.category||''} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                         <option value="">Selecione...</option>
                         {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </StyledSelect>
                   </InputGroup>
                   <InputGroup label="Status"><StyledSelect value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})}><option value="draft">Rascunho</option><option value="published">Publicado</option></StyledSelect></InputGroup>
                </div>
                <InputGroup label="Conteúdo"><NeonEditor value={formData.content||''} onChange={c => setFormData({...formData, content: c})} /></InputGroup>
                <InputGroup label="Imagem Capa"><input type="file" onChange={handleImage} className="text-xs text-white/50" /></InputGroup>
                <div className="flex gap-2 mt-4"><Button type="submit">Salvar</Button><Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button></div>
             </form>
          </div>
          {/* Gerenciador Rápido de Categorias */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex gap-2">
             <StyledInput placeholder="Nova categoria..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
             <Button onClick={handleAddCategory} variant="secondary">Adicionar</Button>
          </div>
       </div>
       <div className="space-y-6">
          <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
             <h3 className="font-bold mb-4">SEO</h3>
             <InputGroup label="Palavra-chave"><StyledInput value={formData.keyword||''} onChange={(e) => setFormData({...formData, keyword: e.target.value})} /></InputGroup>
             <SeoGauge score={seoScore} />
             <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/50">
               <p>Meta Title: {formData.title?.length || 0}/60</p>
               <p>Meta Desc: {formData.meta_description?.length || 0}/160</p>
               <div className="mt-2 flex flex-col gap-1">
                 {seoChecks.map(c => <span key={c.id} className={c.status === 'good' ? 'text-green-400' : 'text-red-400'}>{c.message}</span>)}
               </div>
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

  const load = useCallback(async () => { const { data } = await supabase.from("microsaas").select("*").order("created_at", { ascending: false }); if(data) setItems(data); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, features: formData.features || [] };
    const { error } = formData.id ? await supabase.from("microsaas").update(payload).eq("id", formData.id) : await supabase.from("microsaas").insert([payload]);
    if(error) alert(error.message); else { setIsEditing(false); load(); }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `ms_${Date.now()}_${file.name}`;
    await supabase.storage.from("portfolio-images").upload(name, file);
    const { data } = supabase.storage.from("portfolio-images").getPublicUrl(name);
    setFormData({...formData, image: data.publicUrl});
  };

  if(isEditing) return (
    <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md animate-fade-in">
       <h3 className="text-xl font-bold mb-4">{formData.id ? 'Editar' : 'Novo'} Microsaas</h3>
       <form onSubmit={handleSave} className="space-y-4">
          <InputGroup label="Nome"><StyledInput value={formData.name||''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></InputGroup>
          <div className="grid grid-cols-2 gap-4">
             <InputGroup label="Preço"><StyledInput value={formData.price||''} onChange={(e) => setFormData({...formData, price: e.target.value})} /></InputGroup>
             <InputGroup label="Status"><StyledSelect value={formData.status||'Venda'} onChange={(e) => setFormData({...formData, status: e.target.value as any})}><option>Venda</option><option>Uso</option><option>Beta</option></StyledSelect></InputGroup>
          </div>
          <InputGroup label="Link"><StyledInput value={formData.link||''} onChange={(e) => setFormData({...formData, link: e.target.value})} /></InputGroup>
          <InputGroup label="Ícone"><div className="flex gap-4 items-center"><input type="file" onChange={handleImage} className="text-xs text-white/50" />{formData.image && <img src={formData.image} className="w-10 h-10 object-contain" />}</div></InputGroup>
          <InputGroup label="Descrição"><NeonEditor value={formData.description||''} onChange={c => setFormData({...formData, description: c})} /></InputGroup>
          
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
             <label className="text-xs uppercase font-bold mb-2 block">Features</label>
             <div className="flex gap-2 mb-2"><StyledInput value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} /><Button onClick={() => { if(featureInput) { setFormData(prev => ({...prev, features: [...(prev.features||[]), featureInput]})); setFeatureInput(''); } }} variant="secondary">+</Button></div>
             <div className="flex flex-wrap gap-2">{formData.features?.map((f, i) => <span key={i} className="bg-neon-cyan/20 px-2 py-1 rounded text-xs flex gap-2 items-center">{f} <i className="fa-solid fa-xmark cursor-pointer" onClick={() => setFormData(prev => ({...prev, features: prev.features?.filter((_, idx) => idx !== i)}))}></i></span>)}</div>
          </div>

          <div className="flex gap-2 mt-4"><Button type="submit">Salvar</Button><Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button></div>
       </form>
    </div>
  );

  return (
    <div className="animate-fade-in">
       <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Microsaas</h3><Button onClick={() => { setFormData({status: 'Venda'}); setIsEditing(true); }}>Novo</Button></div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map(item => (
             <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col group hover:-translate-y-1 transition-transform">
                <div className="h-32 bg-gradient-to-br from-indigo-900 to-black relative flex items-center justify-center">
                   {item.image ? <img src={item.image} className="h-16 w-auto object-contain z-10" /> : <i className="fa-solid fa-cube text-4xl text-white/20"></i>}
                   <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-xs font-bold border border-white/10">{item.status}</div>
                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => { setFormData(item); setIsEditing(true); }} className="w-8 h-8 bg-white/20 rounded flex items-center justify-center hover:bg-neon-purple"><i className="fa-solid fa-pen"></i></button>
                      <button onClick={async () => { if(confirm('Del?')) { await supabase.from('microsaas').delete().eq('id', item.id); load(); }}} className="w-8 h-8 bg-white/20 rounded flex items-center justify-center hover:bg-red-500"><i className="fa-solid fa-trash"></i></button>
                   </div>
                </div>
                <div className="p-4 flex-grow">
                   <div className="text-neon-cyan font-bold text-xs mb-1">{item.price}</div>
                   <h4 className="font-bold text-lg mb-2">{item.name}</h4>
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

  const load = useCallback(async () => { const { data } = await supabase.from("portfolio").select("*").order("created_at", { ascending: false }); if(data) setProjects(data); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, technologies: formData.technologies || [] };
    const { error } = formData.id ? await supabase.from("portfolio").update(payload).eq("id", formData.id) : await supabase.from("portfolio").insert([payload]);
    if(error) alert(error.message); else { setIsEditing(false); load(); }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const name = `pf_${Date.now()}_${file.name}`;
    await supabase.storage.from("portfolio-images").upload(name, file);
    const { data } = supabase.storage.from("portfolio-images").getPublicUrl(name);
    setFormData({...formData, image: data.publicUrl});
  };

  if(isEditing) return (
    <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md animate-fade-in">
       <h3 className="text-xl font-bold mb-4">{formData.id ? 'Editar' : 'Novo'} Projeto</h3>
       <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <InputGroup label="Título"><StyledInput value={formData.title||''} onChange={(e) => setFormData({...formData, title: e.target.value})} /></InputGroup>
             <InputGroup label="Categoria"><StyledSelect value={formData.category||'Web'} onChange={(e) => setFormData({...formData, category: e.target.value})}><option>Web Design</option><option>App</option><option>Branding</option></StyledSelect></InputGroup>
          </div>
          <InputGroup label="Imagem"><input type="file" onChange={handleImage} className="text-xs text-white/50" /></InputGroup>
          <InputGroup label="Descrição"><StyledTextArea value={formData.description||''} onChange={(e) => setFormData({...formData, description: e.target.value})} /></InputGroup>
          <div className="flex gap-2"><Button type="submit">Salvar</Button><Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button></div>
       </form>
    </div>
  );

  return (
    <div className="animate-fade-in">
       <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">Portfólio</h3><Button onClick={() => { setFormData({}); setIsEditing(true); }}>Novo</Button></div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map(p => (
             <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                <div className="h-40 bg-black/40 relative">
                   <img src={p.image} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setFormData(p); setIsEditing(true); }} className="w-8 h-8 bg-white/20 rounded flex items-center justify-center hover:bg-neon-purple"><i className="fa-solid fa-pen"></i></button>
                      <button onClick={async () => { if(confirm('Del?')) { await supabase.from('portfolio').delete().eq('id', p.id); load(); }}} className="w-8 h-8 bg-white/20 rounded flex items-center justify-center hover:bg-red-500"><i className="fa-solid fa-trash"></i></button>
                   </div>
                </div>
                <div className="p-4"><div className="text-xs text-neon-cyan font-bold">{p.category}</div><div className="font-bold truncate">{p.title}</div></div>
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
    if(data) setImages(data.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({ name: f.name, url: supabase.storage.from("portfolio-images").getPublicUrl(f.name).data.publicUrl })));
  };
  useEffect(() => { load(); }, []);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!e.target.files?.[0]) return;
    const file = e.target.files[0];
    await supabase.storage.from("portfolio-images").upload(`${Date.now()}_${file.name}`, file);
    load();
  };
  return (
    <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md animate-fade-in">
       <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Galeria</h3><label className="cursor-pointer bg-white/10 px-4 py-2 rounded hover:bg-white/20 text-sm">Upload<input type="file" hidden onChange={handleUpload} /></label></div>
       <div className="grid grid-cols-4 gap-4">
          {images.map(img => (
             <div key={img.name} className="aspect-square bg-black/40 rounded-lg overflow-hidden relative group">
                <img src={img.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { navigator.clipboard.writeText(img.url); alert('URL copiada'); }} className="text-white hover:text-neon-cyan"><i className="fa-solid fa-link"></i></button>
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

  useEffect(() => { supabase.from("site_settings").select("*").eq("id", 1).single().then(({data}) => { if(data) setData(data); }); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("site_settings").update(data).eq("id", 1);
    if(error) {
       const { error: insertError } = await supabase.from("site_settings").insert([{ ...data, id: 1 }]);
       if (insertError) alert("Erro: " + insertError.message); else alert("Salvo!");
    } else alert("Atualizado!");
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if(!e.target.files?.[0]) return;
     const file = e.target.files[0];
     const name = `avatar_${Date.now()}_${file.name}`;
     await supabase.storage.from("portfolio-images").upload(name, file);
     const { data } = supabase.storage.from("portfolio-images").getPublicUrl(name);
     setData(p => ({...p, author_avatar: data.publicUrl}));
  };

  const trackerSnippet = `
// Copie este código para o seu site frontend
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

trackView();
`;

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
       <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold mb-6 text-neon-cyan">Perfil</h3>
          <div className="flex flex-col items-center mb-6">
             <div className="w-24 h-24 rounded-full bg-white/10 overflow-hidden mb-2 relative group cursor-pointer">
                <img src={data.author_avatar || "https://via.placeholder.com/100"} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fa-solid fa-camera"></i></div>
                <input type="file" hidden className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatar} />
             </div>
          </div>
          <InputGroup label="Nome"><StyledInput value={data.author_name||''} onChange={(e) => setData({...data, author_name: e.target.value})} /></InputGroup>
          <InputGroup label="Bio"><StyledTextArea value={data.author_bio||''} onChange={(e) => setData({...data, author_bio: e.target.value})} /></InputGroup>
       </div>
       <div className="space-y-6">
          <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
             <h3 className="text-lg font-bold mb-4 text-green-400">Instalação</h3>
             <div className="bg-black/40 p-4 rounded text-[10px] font-mono overflow-x-auto relative group">
                {trackerSnippet.trim()}
                <button type="button" onClick={() => navigator.clipboard.writeText(trackerSnippet)} className="absolute top-2 right-2 text-white/50 hover:text-white"><i className="fa-solid fa-copy"></i></button>
             </div>
          </div>
          <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 backdrop-blur-md">
             <h3 className="text-lg font-bold mb-4">Meta Pixel / GA4</h3>
             <InputGroup label="GA4 ID"><StyledInput value={data.pixel_google||''} onChange={(e) => setData({...data, pixel_google: e.target.value})} /></InputGroup>
             <Button type="submit" className="w-full mt-4">Salvar Tudo</Button>
          </div>
       </div>
    </form>
  );
};

export default App;