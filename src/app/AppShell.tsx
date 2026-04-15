import type { ReactNode } from 'react';

type AppShellProps = {
  navigation: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

export const AppShell = ({ navigation, header, children }: AppShellProps) => {
  return (
    <div className="min-h-screen md:flex md:gap-6 md:px-6 md:py-6">
      {navigation}
      <main className="flex-1 min-w-0 px-4 pb-20 md:px-0 md:pb-0">
        {header}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
};
