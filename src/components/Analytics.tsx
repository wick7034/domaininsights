import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Calendar, TrendingUp, Globe, Hash } from 'lucide-react';
import { NewAnalyticsSection } from './analytics/NewAnalyticsSection';

const COLORS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f97316', '#84cc16'];

export const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<'1d' | '7d' | '30d'>('7d');
  const [selectedTld, setSelectedTld] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableTlds, setAvailableTlds] = useState<string[]>(['ai', 'app', 'com', 'io', 'net', 'org', 'xyz']);

  useEffect(() => {
    const fetchTlds = async () => {
      try {
        const res = await fetch('/api/tlds');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Merge fetched TLDs with our core set to ensure all requested are present
          const coreTlds = ['ai', 'app', 'com', 'io', 'net', 'org', 'xyz'];
          const combined = Array.from(new Set([...coreTlds, ...data])).sort();
          setAvailableTlds(combined);
        }
      } catch (err) {
        console.error('Failed to fetch TLDs for analytics:', err);
      }
    };
    fetchTlds();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append('period', period);
        if (selectedTld) params.append('tld', selectedTld);
        params.append('intelligenceVersion', '2');

        const res = await fetch(`/api/analytics?${params.toString()}`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError(err.message || 'Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period, selectedTld]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="text-sm font-medium text-red-500">{error}</div>
        <button 
          onClick={() => setPeriod(period)}
          className="rounded-full bg-slate-900 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Market Analytics</h2>
          <p className="text-sm text-slate-500">Insights into registration trends and keyword popularity.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(['1d', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  period === p ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p === '1d' ? 'Yesterday' : p === '7d' ? 'Last 7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {data?.totalCount === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
          <Globe className="mb-2 text-slate-300" size={32} />
          <p className="text-sm font-semibold text-slate-900">No data found</p>
          <p className="text-xs text-slate-500">Try selecting a different TLD or a longer time period.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <Calendar size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Total Registered</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">{data?.totalCount?.toLocaleString()}</span>
                <span className="text-xs font-medium text-emerald-600">domains</span>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <Globe size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Top TLD</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">.{data?.tldStats?.[0]?.name || 'N/A'}</span>
                <span className="text-xs font-medium text-slate-400">dominant</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <TrendingUp size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Hot Keyword</span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">{data?.keywordStats?.[0]?.name || 'N/A'}</span>
                <span className="text-xs font-medium text-slate-400">trending</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Keyword Trends */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Top 20 Trending Keywords</h3>
                <select
                  value={selectedTld}
                  onChange={(e) => setSelectedTld(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-900 outline-none focus:border-slate-400"
                >
                  <option value="">Global Keywords</option>
                  {availableTlds.map(tld => (
                    <option key={tld} value={tld}>.{tld} only</option>
                  ))}
                </select>
              </div>
              <div className="h-[600px] w-full">
                {data?.keywordStats?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.keywordStats} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                        width={120}
                        interval={0}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {data?.keywordStats?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Hash className="mb-2 text-slate-200" size={32} />
                    <p className="text-xs font-medium text-slate-400">No keywords found for this selection</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-8">
            <NewAnalyticsSection data={data?.intelligence} />
          </div>
        </>
      )}
    </div>
  );
};
