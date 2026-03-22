import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Filters } from './components/Filters';
import { DomainList } from './components/DomainList';
import { Analytics } from './components/Analytics';
import { Footer } from './components/Footer';
import { Domain, FilterState } from './types/domain';
import { Search, RotateCcw } from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  tlds: [],
  minLength: 1,
  maxLength: 63,
  numbers: 'any',
  hyphens: 'include',
  keywords: [],
  startsWith: '',
  endsWith: '',
  sortBy: 'created_at',
  sortOrder: 'desc',
};

function getInitialNavigationState() {
  if (typeof window === 'undefined') {
    return {
      activeTab: 'explore' as const,
      filters: INITIAL_FILTERS,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get('view');
  const activeTab = requestedView === 'analytics' ? 'analytics' : 'explore';

  const tlds = params
    .get('tlds')
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const keywords = params
    .get('keywords')
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return {
    activeTab,
    filters: {
      ...INITIAL_FILTERS,
      tlds: tlds && tlds.length > 0 ? tlds : INITIAL_FILTERS.tlds,
      keywords: keywords && keywords.length > 0 ? keywords : INITIAL_FILTERS.keywords,
    },
  };
}

export default function App() {
  const initialNavigationState = getInitialNavigationState();
  const [activeTab, setActiveTab] = useState<'explore' | 'analytics'>(initialNavigationState.activeTab);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [tlds, setTlds] = useState<string[]>(['ai', 'app', 'com', 'io', 'net', 'org', 'xyz']);
  const [loading, setLoading] = useState(true);
  const [domainsError, setDomainsError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialNavigationState.filters);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTlds = async () => {
    try {
      const res = await fetch('/api/tlds');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        // Merge fetched TLDs with our core set to ensure all requested are present
        const coreTlds = ['ai', 'app', 'com', 'io', 'net', 'org', 'xyz'];
        const combined = Array.from(new Set([...coreTlds, ...data])).sort();
        setTlds(combined);
      }
    } catch (err) {
      console.error('Failed to fetch TLDs:', err);
    }
  };

  const fetchDomains = useCallback(async (currentFilters: FilterState, currentPage: number) => {
    setLoading(true);
    setDomainsError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '100');
      
      if (currentFilters.tlds.length > 0) params.append('tlds', currentFilters.tlds.join(','));
      params.append('minLength', currentFilters.minLength.toString());
      params.append('maxLength', currentFilters.maxLength.toString());
      params.append('numbers', currentFilters.numbers);
      params.append('hyphens', currentFilters.hyphens);
      if (currentFilters.keywords.length > 0) params.append('keywords', currentFilters.keywords.join(','));
      if (currentFilters.startsWith) params.append('startsWith', currentFilters.startsWith);
      if (currentFilters.endsWith) params.append('endsWith', currentFilters.endsWith);
      params.append('sortBy', currentFilters.sortBy);
      params.append('sortOrder', currentFilters.sortOrder);

      const res = await fetch(`/api/domains?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      const { data, count } = await res.json();
      
      if (currentPage === 0) {
        setDomains(data || []);
      } else {
        setDomains(prev => [...prev, ...(data || [])]);
      }
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Failed to fetch domains:', err);
      setDomainsError(err.message || 'Failed to connect to the server');
      if (currentPage === 0) {
        setDomains([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTlds();
  }, []);

  useEffect(() => {
    setPage(0);
    fetchDomains(filters, 0);
  }, [filters, fetchDomains]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDomains(filters, nextPage);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {activeTab === 'explore' ? (
          <>
            <div className="flex flex-col gap-1 py-8">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Explore Registry</h1>
              <p className="text-sm text-slate-500">Real-time insights into newly registered domains</p>
            </div>

            <div className="sticky top-14 z-40 -mx-4 bg-white sm:-mx-6">
              <div className="flex flex-col border-b border-slate-100">
                <Filters 
                  filters={filters} 
                  onFilterChange={handleFilterChange} 
                  tlds={tlds}
                />
                <div className="flex items-center justify-end px-4 py-2 sm:px-6">
                  <button 
                    onClick={() => setFilters(INITIAL_FILTERS)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-900"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {domainsError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {domainsError}
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {loading ? 'Updating results...' : `${totalCount.toLocaleString()} Domains Found`}
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                    className="rounded-md border border-slate-200 bg-white py-1 px-2 text-[10px] font-bold uppercase outline-none focus:border-slate-400"
                  >
                    <option value="created_at">Date</option>
                    <option value="domain">Name</option>
                    <option value="length">Length</option>
                  </select>
                  <button 
                    onClick={() => handleFilterChange({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase hover:bg-slate-50"
                  >
                    {filters.sortOrder}
                  </button>
                </div>
              </div>

              <DomainList domains={domains} loading={loading} />

              {domains.length < totalCount && !loading && (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={loadMore}
                    className="rounded-full border border-slate-200 bg-white px-8 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
                  >
                    Load More Domains
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Analytics />
        )}
      </main>

      <Footer />
    </div>
  );
}
