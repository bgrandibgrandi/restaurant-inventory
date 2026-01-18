'use client';

import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { StoreSwitchConfirmDialog } from './StoreSwitcher';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Store switch confirmation dialog */}
      <StoreSwitchConfirmDialog />
    </div>
  );
}
