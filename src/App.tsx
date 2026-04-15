import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './app/providers/AuthProvider';
import { FeatureFlagsProvider } from './app/providers/FeatureFlagsProvider';
import { useFeatureFlags } from './app/providers/useFeatureFlags';
import { useAuth } from './app/providers/useAuth';
import { ToastProvider } from './app/providers/ToastProvider';
import { ConfirmProvider } from './app/providers/ConfirmProvider';
import { AppShell } from './app/AppShell';
import { getBreadcrumbsFromPath, getPageTitleFromPath, resolveViewFromPath } from './app/routes';
import { ErrorBoundary } from './app/ErrorBoundary';
import { Header } from './shared/components/layout/Header';
import { SidebarNavigation } from './shared/components/layout/SidebarNavigation';
import { LoadingSpinner } from './shared/components/cms/FormControls';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { ForbiddenPage } from './modules/system/pages/ForbiddenPage';
import { NotFoundPage } from './modules/system/pages/NotFoundPage';

const DashboardPage = lazy(() => import('./modules/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const BlogPage = lazy(() => import('./modules/content/blog/pages/BlogPage').then((m) => ({ default: m.BlogPage })));
const PortfolioPage = lazy(() => import('./modules/content/portfolio/pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })));
const MicrosaasPage = lazy(() => import('./modules/content/microsaas/pages/MicrosaasPage').then((m) => ({ default: m.MicrosaasPage })));
const MediaPage = lazy(() => import('./modules/content/media/pages/MediaPage').then((m) => ({ default: m.MediaPage })));
const SettingsPage = lazy(() => import('./modules/settings/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const PageLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 w-56 bg-surface-elevated rounded-lg"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="h-28 bg-surface-elevated rounded-2xl"></div>
      <div className="h-28 bg-surface-elevated rounded-2xl"></div>
      <div className="h-28 bg-surface-elevated rounded-2xl"></div>
      <div className="h-28 bg-surface-elevated rounded-2xl"></div>
    </div>
    <div className="h-72 bg-surface-elevated rounded-2xl"></div>
  </div>
);

const RequireAuth = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const RequireAdmin = ({ role }: { role: 'admin' | 'editor' }) => {
  if (role !== 'admin') return <Navigate to="/forbidden" replace />;
  return <Outlet />;
};

const RequireFeature = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
};

import { Breadcrumbs } from './shared/components/layout/Breadcrumbs';

const ProtectedLayout = ({ role, roleSource, email, onLogout, theme, onToggleTheme }: { role: 'admin' | 'editor'; roleSource: 'table' | 'metadata' | 'email_whitelist' | 'fallback'; email: string; onLogout: () => void; theme: 'dark' | 'light'; onToggleTheme: () => void }) => {
  const location = useLocation();
  const currentView = resolveViewFromPath(location.pathname);
  const pageTitle = getPageTitleFromPath(location.pathname);
  const { flags } = useFeatureFlags();

  useEffect(() => {
    document.title = `UX Vision CMS - ${pageTitle}`;
  }, [pageTitle]);

  return (
    <AppShell
      navigation={<SidebarNavigation currentView={currentView} role={role} flags={flags} />}
      header={<Header email={email} role={role} roleSource={roleSource} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} pageTitle={pageTitle} />}
    >
      <Breadcrumbs />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
};

const AppRouter = () => {
  const { session, loading, role, roleSource, logout, demoLogin } = useAuth();
  const { flags } = useFeatureFlags();
  const isDemoLoginEnabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'false';
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-base text-text-primary"><LoadingSpinner /></div>;
  }

  return (
    <div className="min-h-screen text-text-primary font-sans selection:bg-neon-purple/30 selection:text-text-primary transition-colors duration-300">
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage onDemoLogin={demoLogin} showDemoLogin={isDemoLoginEnabled} />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth isAuthenticated={!!session} />}>
          <Route
            path="/"
            element={
              <ProtectedLayout
                role={role}
                roleSource={roleSource}
                email={session?.user.email || 'usuario@uxvision.com'}
                onLogout={() => {
                  void logout();
                }}
                theme={theme}
                onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              />
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route element={<RequireFeature enabled={flags.blog} />}>
              <Route path="content/blog" element={<BlogPage />} />
            </Route>
            <Route element={<RequireFeature enabled={flags.microsaas} />}>
              <Route path="content/microsaas" element={<MicrosaasPage />} />
            </Route>
            <Route element={<RequireFeature enabled={flags.media} />}>
              <Route path="content/media" element={<MediaPage />} />
            </Route>

            <Route element={<RequireAdmin role={role} />}>
              <Route element={<RequireFeature enabled={flags.portfolio} />}>
                <Route path="content/portfolio" element={<PortfolioPage />} />
              </Route>
              <Route element={<RequireFeature enabled={flags.settings} />}>
                <Route path="operation/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage homePath={session ? '/dashboard' : '/login'} />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <AuthProvider>
      <FeatureFlagsProvider>
        <ConfirmProvider>
          <ToastProvider>
            <AppRouter />
          </ToastProvider>
        </ConfirmProvider>
      </FeatureFlagsProvider>
    </AuthProvider>
  </ErrorBoundary>
);

export default App;
