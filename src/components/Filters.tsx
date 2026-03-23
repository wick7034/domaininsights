import React, { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterState } from '../types/domain';

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  tlds: string[];
}

export const Filters: React.FC<FiltersProps> = ({ filters, onFilterChange, tlds }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 bg-slate-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Filter size={14} />
              <span>Filters</span>
            </div>
            
            {/* Quick Summary of active filters */}
            <div className="flex gap-2">
              {filters.tlds.length > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                  {filters.tlds.length} TLDs
                </span>
              )}
              {(filters.minLength > 1 || filters.maxLength < 63) && (
                <span className="flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                  Len: {filters.minLength}-{filters.maxLength}
                </span>
              )}
              {filters.numbers !== 'any' && (
                <span className="flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                  Nums: {filters.numbers}
                </span>
              )}
            </div>
          </div>

          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-600"
          >
            {isOpen ? 'Close' : 'Expand'}
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {isOpen && (
          <div className="grid grid-cols-1 gap-8 py-6 md:grid-cols-4 border-t border-slate-200">
            {/* TLDs */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">TLDs</label>
              <div className="flex flex-wrap gap-2">
                {tlds.map((tld) => {
                  const isSelected = filters.tlds.includes(tld);

                  return (
                    <button
                      key={tld}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        const newTlds = isSelected
                          ? filters.tlds.filter((value) => value !== tld)
                          : [...filters.tlds, tld];
                        onFilterChange({ tlds: newTlds });
                      }}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      .{tld}
                    </button>
                  );
                })}
                {tlds.length === 0 && (
                  <span className="text-xs text-slate-400">No TLDs available</span>
                )}
              </div>
            </div>

            {/* Length & Numbers */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Length Range</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    value={filters.minLength}
                    onChange={(e) => onFilterChange({ minLength: parseInt(e.target.value) || 1 })}
                    className="w-16 rounded-md border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-slate-400"
                  />
                  <span className="text-slate-300">—</span>
                  <input 
                    type="number" 
                    value={filters.maxLength}
                    onChange={(e) => onFilterChange({ maxLength: parseInt(e.target.value) || 63 })}
                    className="w-16 rounded-md border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Numbers</label>
                <select 
                  value={filters.numbers}
                  onChange={(e) => onFilterChange({ numbers: e.target.value as any })}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-2 text-xs outline-none focus:border-slate-400"
                >
                  <option value="any">Any</option>
                  <option value="none">No numbers</option>
                  <option value="only">Only numbers</option>
                  <option value="contains">Contains numbers</option>
                </select>
              </div>
            </div>

            {/* Hyphens & Keywords */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hyphens</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onFilterChange({ hyphens: 'include' })}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-all ${filters.hyphens === 'include' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    Include
                  </button>
                  <button 
                    onClick={() => onFilterChange({ hyphens: 'exclude' })}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-medium transition-all ${filters.hyphens === 'exclude' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    Exclude
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Keywords (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. ai, gpt, agent" 
                  value={filters.keywords.join(', ')}
                  onChange={(e) => onFilterChange({ keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-3 text-xs outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {/* Starts/Ends With */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Starts With</label>
                <input 
                  type="text" 
                  placeholder="Prefix..." 
                  value={filters.startsWith}
                  onChange={(e) => onFilterChange({ startsWith: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-3 text-xs outline-none focus:border-slate-400"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ends With</label>
                <input 
                  type="text" 
                  placeholder="Suffix..." 
                  value={filters.endsWith}
                  onChange={(e) => onFilterChange({ endsWith: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white py-1.5 px-3 text-xs outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
