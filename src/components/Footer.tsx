import React from 'react';
import { Globe, Github, Twitter } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Globe size={18} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">c</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-slate-500">
              Real-time domain registration analytics and registry insights. Track trends, discover keywords, and explore the global domain landscape.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Platform</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Explore</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Analytics</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">API Access</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Registry Data</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-50 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            © {currentYear} DomainInsights. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Registry Live
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
