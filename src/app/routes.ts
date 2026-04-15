import type { ViewState } from '../types';

export const ROUTE_PATH_BY_VIEW: Record<ViewState, string> = {
  dashboard: '/dashboard',
  blog: '/content/blog',
  portfolio: '/content/portfolio',
  microsaas: '/content/microsaas',
  media: '/content/media',
  settings: '/operation/settings',
};

export const ROUTE_LABEL_BY_VIEW: Record<ViewState, string> = {
  dashboard: 'Dashboard',
  blog: 'Blog',
  portfolio: 'Portfolio',
  microsaas: 'Microsaas',
  media: 'Media',
  settings: 'Configuracoes',
};

export const resolveViewFromPath = (pathname: string): ViewState => {
  if (pathname.startsWith('/content/blog')) return 'blog';
  if (pathname.startsWith('/content/portfolio')) return 'portfolio';
  if (pathname.startsWith('/content/microsaas')) return 'microsaas';
  if (pathname.startsWith('/content/media')) return 'media';
  if (pathname.startsWith('/operation/settings')) return 'settings';
  return 'dashboard';
};

export const getPageTitleFromPath = (pathname: string): string => {
  const view = resolveViewFromPath(pathname);
  return ROUTE_LABEL_BY_VIEW[view];
};

const SEGMENT_LABELS: Record<string, string> = {
  content: 'Conteudo',
  operation: 'Operacao',
  dashboard: 'Dashboard',
  blog: 'Blog',
  portfolio: 'Portfolio',
  microsaas: 'Microsaas',
  media: 'Midia',
  settings: 'Configuracoes',
};

// Mapeamento de redirecionamentos para caminhos intermediários que não possuem página própria
const VIRTUAL_PATH_REDIRECTS: Record<string, string> = {
  '/content': '/content/blog',
  '/operation': '/operation/settings',
};

export const getBreadcrumbsFromPath = (pathname: string): { label: string; to: string }[] => {
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  const breadcrumbs: { label: string; to: string }[] = [{ label: 'Inicio', to: '/dashboard' }];

  if (cleanPath === '/dashboard' || (segments.length === 1 && segments[0] === 'dashboard')) {
    return breadcrumbs;
  }

  let cumulativePath = '';
  segments.forEach((segment) => {
    cumulativePath += `/${segment}`;
    const label = SEGMENT_LABELS[segment] || segment;
    const to = VIRTUAL_PATH_REDIRECTS[cumulativePath] || cumulativePath;

    breadcrumbs.push({ label, to });
  });

  return breadcrumbs;
};
