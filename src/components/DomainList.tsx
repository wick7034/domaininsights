import React from 'react';
import { ChevronRight, ExternalLink, Copy, Check } from 'lucide-react';
import { Domain } from '../types/domain';
import { motion, AnimatePresence } from 'motion/react';

interface DomainListProps {
  domains: Domain[];
  loading: boolean;
}

export const DomainList: React.FC<DomainListProps> = ({ domains, loading }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (domain: string, id: string) => {
    navigator.clipboard.writeText(domain);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading && domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        <p className="mt-4 text-sm text-slate-500">Scanning registry...</p>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-slate-50 p-4 text-slate-400">
          <Activity size={32} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No domains match your filters</h3>
        <p className="mt-1 text-xs text-slate-500">Try adjusting your search criteria or clearing filters.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Header */}
      <div className="hidden grid-cols-12 border-b border-slate-100 bg-slate-50/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:grid">
        <div className="col-span-8">Domain</div>
        <div className="col-span-1">TLD</div>
        <div className="col-span-1">Length</div>
        <div className="col-span-2 text-right">Registered</div>
      </div>

      <div className="divide-y divide-slate-50">
        <AnimatePresence mode="popLayout">
          {domains.map((domain) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={domain.id}
              className="group relative flex flex-col border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50/50 md:grid md:grid-cols-12 md:items-center md:py-2.5"
            >
              {/* Mobile Layout */}
              <div className="flex items-center justify-between md:col-span-8">
                <div 
                  onClick={() => handleCopy(domain.domain, domain.id)}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <span className="text-sm font-bold text-slate-900 md:text-[13px]">{domain.domain}</span>
                  {copiedId === domain.id ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} className="opacity-0 transition-opacity group-hover:opacity-40" />
                  )}
                </div>
                <a 
                  href={`https://www.whois.com/whois/${domain.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-900 md:hidden"
                >
                  <ChevronRight size={18} />
                </a>
              </div>

              {/* Metadata - Mobile Inline / Desktop Columns */}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 md:mt-0 md:contents md:text-[12px]">
                <div className="md:col-span-1">
                  <span className="md:hidden"></span>
                  {domain.tld}
                </div>
                <div className="md:col-span-1">
                  <span className="md:hidden">• </span>
                  {domain.length}
                </div>
                <div className="hidden text-right text-[11px] text-slate-400 md:col-span-2 md:block">
                  {new Date(domain.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>

              {/* Desktop Action */}
              <div className="absolute right-4 hidden items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
                <a 
                  href={`https://www.whois.com/whois/${domain.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <ExternalLink size={10} />
                  WHOIS
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Re-import Activity for the empty state
import { Activity } from 'lucide-react';
