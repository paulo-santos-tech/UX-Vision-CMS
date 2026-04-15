export const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string }) => {
  return (
    <div className="w-full text-center py-12 px-6 bg-surface-elevated border border-divider rounded-2xl">
      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-elevated border border-white/15 flex items-center justify-center text-text-muted opacity-80">
        <i className={icon}></i>
      </div>
      <h4 className="text-text-primary font-semibold mb-1">{title}</h4>
      <p className="text-sm text-text-muted opacity-80">{description}</p>
    </div>
  );
};
