import React from 'react';
import { Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: 'explore' | 'analytics';
  onTabChange: (tab: 'explore' | 'analytics') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Activity size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">DomainInsights</span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <button 
              onClick={() => onTabChange('explore')}
              className={activeTab === 'explore' ? "text-slate-900" : "hover:text-slate-900"}
            >
              Explore
            </button>
            <button 
              onClick={() => onTabChange('analytics')}
              className={activeTab === 'analytics' ? "text-slate-900" : "hover:text-slate-900"}
            >
              Analytics
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
