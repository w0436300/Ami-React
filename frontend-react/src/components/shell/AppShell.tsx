import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />

      <div className="flex flex-col flex-1 ml-sidebar">
        <TopBar />
        <main className="flex-1 p-page overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
