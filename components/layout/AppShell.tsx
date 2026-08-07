import { Header } from './Header';
import { SidebarNav } from './SidebarNav';

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <div className="app-shell">
        <aside className="hidden bg-yc-bg md:block">
          <SidebarNav />
        </aside>
        <main>{children}</main>
      </div>
    </>
  );
}
