import { Link, useLocation } from 'react-router-dom';
import { getBreadcrumbsFromPath } from '../../../app/routes';

export const Breadcrumbs = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbsFromPath(location.pathname);

  if (breadcrumbs.length <= 1) return <div className="h-4" />; // Spacer for home/dashboard

  return (
    <nav className="flex items-center gap-2 mb-6 animate-fade-in group/nav" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <div key={crumb.to} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-text-muted opacity-30 select-none">
                <i className="fa-solid fa-chevron-right text-[8px]"></i>
              </span>
            )}
            
            {isLast ? (
              <span className="text-xs font-bold text-text-primary tracking-wide">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="text-xs font-medium text-text-muted hover:text-neon-cyan active:scale-95 transition-all duration-200"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};
