import { useState } from 'react';
import type { Screen } from '../types';
import {
  LayoutDashboard, BadgePlus, ListOrdered,
  Menu, ChevronLeft,
} from 'lucide-react';

const NAV_ITEMS: { screen: Screen; label: string; icon: typeof LayoutDashboard }[] = [
  { screen: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { screen: 'issue', label: 'Issue Credential', icon: BadgePlus },
  { screen: 'offers', label: 'Offers', icon: ListOrdered },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED = 56;

export function Layout({ currentScreen, onNavigate, children }: {
  currentScreen: Screen;
  onNavigate: (s: Screen) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-primary text-slate-200 flex flex-col
          transition-all duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: sidebarWidth }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-slate-700">
          {collapsed ? null : <span className="font-semibold text-sm tracking-wide">Issuer Portal</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => {
                  onNavigate(item.screen);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                  ${active
                    ? 'bg-primary-light text-white border-l-[3px] border-accent pl-[13px]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-l-[3px] border-transparent'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* No logout button — issuer has no auth */}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-primary text-white">
          <button onClick={() => setMobileOpen(true)} className="p-1">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Issuer Portal</span>
        </header>

        <main className="flex-1 p-6 max-w-4xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
