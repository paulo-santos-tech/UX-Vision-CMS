import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../../assets/logo.svg';
import { supabase } from '../../../supabaseClient';
import type { ViewState } from '../../../types';
import { MENU_SECTIONS } from '../../../app/menuConfig';
import type { CmsFeatureFlags } from '../../types/features';
import { useToast } from '../../../app/providers/useToast';

type SidebarNavigationProps = {
  currentView: ViewState;
  role: string;
  flags: CmsFeatureFlags;
};

export const SidebarNavigation = ({ currentView, role, flags }: SidebarNavigationProps) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const tabs = MENU_SECTIONS.flatMap((section) => section.items).filter((tab) => flags[tab.id]);

  const navigateTo = (tab: { id: ViewState; path: string; adminOnly?: boolean }) => {
    if (tab.adminOnly && role !== 'admin') {
      showToast('Esta area e exclusiva para administradores.', 'error');
      return;
    }
    navigate(tab.path);
  };

  const [quickStats, setQuickStats] = useState({ blog: 0, portfolio: 0, microsaas: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
      supabase.from('portfolio').select('*', { count: 'exact', head: true }),
      supabase.from('microsaas').select('*', { count: 'exact', head: true }),
    ]).then(([blogRes, portfolioRes, microsaasRes]) => {
      setQuickStats({
        blog: blogRes.count || 0,
        portfolio: portfolioRes.count || 0,
        microsaas: microsaasRes.count || 0,
      });
    });
  }, []);

  return (
    <>
      <aside className="hidden md:flex md:w-72 md:flex-col md:sticky md:top-6 md:h-[calc(100vh-3rem)] bg-surface rounded-3xl p-5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3 pb-5">
          <img src={logoImg} alt="UX Vision" className="h-9 w-auto object-contain" />
        </div>
        <nav className="mt-5 flex flex-col gap-4 overflow-y-auto pr-1">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="text-overline text-text-muted opacity-60 px-2 mb-2">{section.title}</div>
              <div className="flex flex-col gap-2">
                {section.items.filter((tab) => flags[tab.id]).map((tab) => {
                  const locked = Boolean(tab.adminOnly && role !== 'admin');
                  const active = currentView === tab.id;
                  return (
                    <div key={tab.id}>
                      <button
                        onClick={() => navigateTo(tab)}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 transition-all duration-200 border ${active ? 'bg-neon-purple/15 border-neon-purple/30 text-text-primary shadow-[0_0_20px_-8px_rgba(178,0,255,0.5)]' : 'bg-transparent border-transparent text-text-muted hover:bg-surface-elevated hover:text-text-primary'} ${locked ? 'opacity-80' : ''}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${active ? 'bg-neon-cyan/20 text-neon-cyan shadow-[0_0_12px_-5px_rgba(0,226,255,0.8)]' : 'bg-surface-elevated text-text-muted'}`}>
                            <i className={tab.icon}></i>
                          </span>
                          {tab.label}
                        </span>
                        {tab.adminOnly && (
                          <span className={`text-overline px-2 py-1 rounded-full border ${locked ? 'border-amber-400/40 text-amber-300' : 'border-emerald-400/40 text-emerald-300'}`}>
                            {locked ? 'Admin' : 'OK'}
                          </span>
                        )}
                      </button>
                      {active && tab.children && (
                        <div className="ml-12 mt-2 space-y-1">
                          {tab.children.map((child) => (
                            <div key={child.label} className="text-[11px] text-text-muted opacity-70 leading-tight">
                              <span className="text-text-muted">{child.label}:</span> {child.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="bg-surface-elevated shadow-sm hover:shadow-md transition-shadow rounded-xl p-2">
            <div className="text-overline text-text-muted opacity-70">Blog</div>
            <div className="text-sm font-bold text-text-primary">{quickStats.blog}</div>
          </div>
          <div className="bg-surface-elevated shadow-sm hover:shadow-md transition-shadow rounded-xl p-2">
            <div className="text-overline text-text-muted opacity-70">Portf.</div>
            <div className="text-sm font-bold text-text-primary">{quickStats.portfolio}</div>
          </div>
          <div className="bg-surface-elevated shadow-sm hover:shadow-md transition-shadow rounded-xl p-2">
            <div className="text-overline text-text-muted opacity-70">MSaaS</div>
            <div className="text-sm font-bold text-text-primary">{quickStats.microsaas}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <button onClick={() => navigate('/content/blog')} disabled={!flags.blog} className="w-full text-left text-xs font-semibold bg-surface-elevated shadow-sm rounded-lg px-3 py-2 text-text-primary hover:bg-surface-elevated/80 transition-all disabled:opacity-50 disabled:pointer-events-none">
            <i className="fa-solid fa-plus mr-2"></i>Novo post
          </button>
          <button onClick={() => navigateTo({ id: 'portfolio', path: '/content/portfolio', adminOnly: true })} disabled={!flags.portfolio} className="w-full text-left text-xs font-semibold bg-surface-elevated shadow-sm rounded-lg px-3 py-2 text-text-primary hover:bg-surface-elevated/80 transition-all disabled:opacity-50 disabled:pointer-events-none">
            <i className="fa-solid fa-plus mr-2"></i>Novo projeto
          </button>
        </div>
        <div className="mt-auto pt-5">
          <p className="text-[11px] text-text-muted opacity-70">Acesso atual</p>
          <p className="text-sm text-text-primary font-bold uppercase tracking-wider">{role}</p>
        </div>
      </aside>

      <div className="md:hidden overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => {
            const locked = Boolean(tab.adminOnly && role !== 'admin');
            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-200 border ${currentView === tab.id ? 'bg-neon-purple/10 border-neon-purple/30 text-text-primary shadow-[0_0_15px_-3px_rgba(178,0,255,0.3)]' : 'bg-transparent border-transparent text-text-muted opacity-80 hover:bg-surface-elevated hover:text-text-primary'}`}
              >
                <i className={tab.icon}></i>
                {tab.label}
                {locked && <i className="fa-solid fa-lock text-[10px] text-amber-300"></i>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
