import type { ViewState } from '../types';

export type MenuItem = {
  id: ViewState;
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  children?: { label: string; description: string }[];
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', path: '/dashboard', label: 'Visão Geral', icon: 'fa-solid fa-chart-pie', children: [{ label: 'KPIs', description: 'Tráfego e indicadores' }, { label: 'Origens', description: 'Canais principais' }] },
    ],
  },
  {
    title: 'Conteúdo',
    items: [
      { id: 'blog', path: '/content/blog', label: 'Blog', icon: 'fa-solid fa-newspaper', children: [{ label: 'Posts', description: 'Artigos e categorias' }, { label: 'SEO', description: 'Meta e preview' }] },
      { id: 'portfolio', path: '/content/portfolio', label: 'Portfólio', icon: 'fa-solid fa-briefcase', adminOnly: true, children: [{ label: 'Projetos', description: 'Cases publicados' }] },
      { id: 'microsaas', path: '/content/microsaas', label: 'Microsaas', icon: 'fa-solid fa-cube', children: [{ label: 'Produtos', description: 'Cards e features' }] },
      { id: 'media', path: '/content/media', label: 'Mídia', icon: 'fa-solid fa-images', children: [{ label: 'Biblioteca', description: 'Assets do site' }] },
    ],
  },
  {
    title: 'Operação',
    items: [
      { id: 'settings', path: '/operation/settings', label: 'Configurações', icon: 'fa-solid fa-sliders', adminOnly: true, children: [{ label: 'Equipe', description: 'Acessos e roles' }, { label: 'Deploy', description: 'Integrações e scripts' }] },
    ],
  },
];
