import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Filters } from './components/Filters';
import { DomainList } from './components/DomainList';
import { Analytics } from './components/Analytics';
import { Footer } from './components/Footer';
import { Domain, FilterState } from './types/domain';
import { ArrowUpRight, Calendar, Globe, Hash, RotateCcw, TrendingUp } from 'lucide-react';

type ExploreAnalyticsPreview = {
  totalCount: number;
  topTld: string;
  hotKeyword: string;
};

const INITIAL_FILTERS: FilterState = {
  trendingOnly: false,
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
  const [analyticsPreview, setAnalyticsPreview] = useState<ExploreAnalyticsPreview | null>(null);
  const [analyticsPreviewLoading, setAnalyticsPreviewLoading] = useState(true);

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
      
      if (currentFilters.trendingOnly) params.append('trending', 'true');
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
    let isMounted = true;

    const fetchAnalyticsPreview = async () => {
      setAnalyticsPreviewLoading(true);

      try {
        const res = await fetch('/api/analytics?period=1d&previewVersion=4');
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Server error: ${res.status}` }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }

        const result = await res.json();
        if (!isMounted) return;

        setAnalyticsPreview({
          totalCount: result?.totalCount || 0,
          topTld: result?.tldStats?.[0]?.name || 'N/A',
          hotKeyword: result?.keywordStats?.[0]?.name || 'N/A',
        });
      } catch (err) {
        console.error('Failed to fetch analytics preview:', err);

        if (isMounted) {
          setAnalyticsPreview(null);
        }
      } finally {
        if (isMounted) {
          setAnalyticsPreviewLoading(false);
        }
      }
    };

    fetchAnalyticsPreview();

    return () => {
      isMounted = false;
    };
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

  const openAnalytics = () => {
    setActiveTab('analytics');

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {activeTab === 'explore' ? (
          <>
            <div className="flex flex-col gap-4 py-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Explore Registry</h1>
                <p className="text-sm text-slate-500">Real-time database of newly registered domains</p>
              </div>

              <button
                type="button"
                onClick={openAnalytics}
                className="w-full rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md lg:max-w-2xl"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex items-center justify-between gap-3 lg:min-w-[12rem] lg:max-w-[12rem]">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Yesterday Snapshot</div>
                      <p className="mt-0.5 text-[11px] text-slate-500">Open analytics</p>
                    </div>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
                      <ArrowUpRight size={14} />
                    </span>
                  </div>

                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        <Calendar size={12} />
                        <span>Total Registered</span>
                      </div>
                      <div className="mt-1.5 text-base font-bold text-slate-900">
                        {analyticsPreviewLoading
                          ? '...'
                          : analyticsPreview
                            ? analyticsPreview.totalCount.toLocaleString()
                            : 'N/A'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        <Globe size={12} />
                        <span>Top TLD</span>
                      </div>
                      <div className="mt-1.5 text-base font-bold text-slate-900">
                        {analyticsPreviewLoading
                          ? '...'
                          : analyticsPreview
                            ? analyticsPreview.topTld === 'N/A'
                              ? 'N/A'
                              : `.${analyticsPreview.topTld}`
                            : 'N/A'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        <TrendingUp size={12} />
                        <span>Hot Keyword</span>
                      </div>
                      <div className="mt-1.5 truncate text-base font-bold text-slate-900">
                        {analyticsPreviewLoading
                          ? '...'
                          : analyticsPreview
                            ? analyticsPreview.hotKeyword
                            : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Quick Filters</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Trending matches names containing the top 20 keywords from the last 7 days.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleFilterChange({ trendingOnly: !filters.trendingOnly })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all ${
                      filters.trendingOnly
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp size={12} />
                    Trending
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange({ numbers: filters.numbers === 'none' ? 'any' : 'none' })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all ${
                      filters.numbers === 'none'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Hash size={12} />
                    No Numbers
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange({ hyphens: filters.hyphens === 'exclude' ? 'include' : 'exclude' })}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all ${
                      filters.hyphens === 'exclude'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-sm leading-none">-</span>
                    No Hyphen
                  </button>
                </div>
              </div>
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
