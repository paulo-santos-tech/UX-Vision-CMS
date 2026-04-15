import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import type { PageView } from '../../../types';

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y';

const TrafficChart = ({ data }: { data: { label: string; count: number; tooltip: string }[] }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-text-muted opacity-60 text-xs">Sem dados suficientes para exibir o gráfico.</div>;

  const height = 150;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const denominator = Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => {
      const x = (i / denominator) * 1000;
      const y = height - (d.count / maxVal) * height;
      return `${x},${y}`;
    })
    .join(' ');

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
      </svg>
      <div className="flex justify-between text-[10px] text-text-muted opacity-70 mt-2 font-mono uppercase tracking-widest">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const [stats, setStats] = useState({ visits: 0, projects: 0, posts: 0 });
  const [analyticsData, setAnalyticsData] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startDate = new Date();
        if (timeRange === '24h') startDate.setHours(now.getHours() - 24);
        else if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
        else if (timeRange === '30d') startDate.setDate(now.getDate() - 30);
        else if (timeRange === '90d') startDate.setDate(now.getDate() - 90);
        else if (timeRange === '1y') startDate.setFullYear(now.getFullYear() - 1);

        const [projRes, postRes, analyticsRes] = await Promise.allSettled([
          supabase.from('portfolio').select('*', { count: 'exact', head: true }),
          supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
          supabase.from('page_analytics').select('*').gte('created_at', startDate.toISOString()).order('created_at', { ascending: true })
        ]);

        const projCount = projRes.status === 'fulfilled' ? projRes.value.count : 0;
        const postCount = postRes.status === 'fulfilled' ? postRes.value.count : 0;

        let visits = 0;
        let pageViews: PageView[] = [];

        if (analyticsRes.status === 'fulfilled' && !analyticsRes.value.error && analyticsRes.value.data) {
          visits = analyticsRes.value.count || analyticsRes.value.data.length;
          pageViews = analyticsRes.value.data;
        }

        setStats({ visits, projects: projCount || 0, posts: postCount || 0 });
        setAnalyticsData(pageViews);
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, [timeRange]);

  const { chartData, topPages, topReferrers } = useMemo(() => {
    const pages: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    const groupedCounts: Record<string, number> = {};
    const now = new Date();
    const isHourly = timeRange === '24h';
    const isMonthly = timeRange === '1y';

    if (isHourly) {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(now.getHours() - i);
        const label = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        groupedCounts[label] = 0;
      }
    } else if (isMonthly) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        groupedCounts[label] = 0;
      }
    } else {
      const days = timeRange === '7d' ? 6 : timeRange === '30d' ? 29 : 89;
      for (let i = days; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        groupedCounts[label] = 0;
      }
    }

    analyticsData.forEach((view) => {
      const date = new Date(view.created_at);
      if (isHourly) {
        const h = date.getHours();
        const targetKey = Object.keys(groupedCounts).find((k) => k.startsWith(h.toString().padStart(2, '0')));
        if (targetKey) groupedCounts[targetKey]++;
      } else {
        const key = isMonthly
          ? date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (groupedCounts[key] !== undefined) groupedCounts[key]++;
      }

      const path = view.path || '/';
      pages[path] = (pages[path] || 0) + 1;
      let ref = 'Direto';
      if (view.referrer) {
        try {
          ref = new URL(view.referrer).hostname.replace('www.', '');
        } catch {
          ref = view.referrer;
        }
      }
      referrers[ref] = (referrers[ref] || 0) + 1;
    });

    return {
      chartData: Object.entries(groupedCounts).map(([label, count]) => ({
        label,
        count,
        tooltip: isHourly ? 'nesta hora' : isMonthly ? 'neste mês' : 'neste dia',
      })),
      topPages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topReferrers: Object.entries(referrers).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [analyticsData, timeRange]);

  if (loading) return <div className="flex justify-center items-center h-64 w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan"></div></div>;

  const rangeLabel: Record<TimeRange, string> = {
    '24h': 'Hoje',
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias',
    '1y': 'Último ano',
  };

  const avgByPoint = Math.round(stats.visits / Math.max(chartData.length, 1));
  const topPage = topPages[0]?.[0] || 'Sem dados';
  const topOrigin = topReferrers[0]?.[0] || 'Sem dados';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-neon-purple/20 to-neon-cyan/10 border border-divider p-8 rounded-2xl backdrop-blur-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="space-y-1">
          <h3 className="text-heading">Dashboard Executivo</h3>
          <p className="text-text-muted text-sm">KPI do seu site em {rangeLabel[timeRange].toLowerCase()}.</p>
        </div>
        <div className="bg-surface-elevated p-1 rounded-lg border border-divider flex">
          {[{ k: '24h', l: 'Hoje' }, { k: '7d', l: '7 Dias' }, { k: '30d', l: '30 Dias' }, { k: '90d', l: '3 Meses' }, { k: '1y', l: '1 Ano' }].map((r) => (
            <button key={r.k} onClick={() => setTimeRange(r.k as TimeRange)} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${timeRange === r.k ? 'bg-surface-elevated border border-divider/20 text-text-primary shadow-sm' : 'text-text-muted opacity-70 hover:text-text-primary'}`}>{r.l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface border border-divider rounded-2xl p-6"><p className="text-text-muted text-xs uppercase">Visitas</p><p className="text-3xl font-black">{stats.visits}</p></div>
        <div className="bg-surface border border-divider rounded-2xl p-6"><p className="text-text-muted text-xs uppercase">Média por faixa</p><p className="text-3xl font-black">{avgByPoint}</p></div>
        <div className="bg-surface border border-divider rounded-2xl p-6"><p className="text-text-muted text-xs uppercase">Projetos</p><p className="text-3xl font-black">{stats.projects}</p></div>
        <div className="bg-surface border border-divider rounded-2xl p-6"><p className="text-text-muted text-xs uppercase">Posts</p><p className="text-3xl font-black">{stats.posts}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-divider rounded-2xl p-4"><div className="text-overline text-text-muted opacity-80 mb-1">Página líder</div><div className="text-sm font-semibold text-text-primary truncate">{topPage}</div></div>
        <div className="bg-surface border border-divider rounded-2xl p-4"><div className="text-overline text-text-muted opacity-80 mb-1">Origem líder</div><div className="text-sm font-semibold text-text-primary truncate">{topOrigin}</div></div>
      </div>

      <div className="bg-surface border border-divider rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-lg font-bold mb-2">Evolução de Tráfego</h3>
        <TrafficChart data={chartData} />
      </div>
    </div>
  );
};
