import { cn } from '../lib/utils';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Search, Library, Settings, Bot, Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { name: 'New Research', icon: Search, path: '/research/new' },
  { name: 'My Research', icon: Library, path: '/research' },
  { name: 'Saved Reports', icon: FileText, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

import { useAuth } from '../lib/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-full bg-background text-foreground font-sans antialiased overflow-hidden">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center">
            <Bot className="w-6 h-6 text-indigo-500 mr-3" />
            <span className="font-semibold text-lg tracking-tight">ResearchPilot AI</span>
          </div>
          <button 
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium truncate">{user.displayName || 'User'}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Guest</span>
                  <NavLink to="/settings" className="text-xs text-indigo-400 hover:underline">Sign In</NavLink>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden w-full">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
          <button 
            className="text-muted-foreground hover:text-foreground mr-3"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            <Bot className="w-5 h-5 text-indigo-500 mr-2" />
            <span className="font-semibold tracking-tight">ResearchPilot</span>
          </div>
        </header>
        
        {children}
      </main>
    </div>
  );
}
