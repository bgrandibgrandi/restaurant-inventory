'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Store = {
  id: string;
  name: string;
};

type StockCount = {
  id: string;
  name: string;
  status: string;
  itemsCounted: number;
  totalValue: number | null;
  store: { name: string };
  user: { name: string | null; email: string };
  createdAt: string;
  completedAt: string | null;
};

export default function CountPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesRes, countsRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/counts'),
      ]);

      const [storesData, countsData] = await Promise.all([
        storesRes.json(),
        countsRes.json(),
      ]);

      setStores(storesData);
      setCounts(countsData);

      if (storesData.length > 0) {
        setSelectedStore(storesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewCount = async () => {
    if (!selectedStore) return;

    setCreating(true);
    try {
      const response = await fetch('/api/counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStore }),
      });

      if (response.ok) {
        const newCount = await response.json();
        router.push(`/count/${newCount.id}`);
      } else {
        alert('Failed to start count');
      }
    } catch (error) {
      console.error('Error starting count:', error);
      alert('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const inProgressCounts = counts.filter((c) => c.status === 'in_progress');
  const completedCounts = counts.filter((c) => c.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Stock Counts</h1>
            <div className="w-6"></div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Start New Count */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start New Count</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Venue
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={startNewCount}
            disabled={creating || !selectedStore}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-xl transition shadow-lg shadow-blue-500/30 disabled:opacity-50 text-lg"
          >
            {creating ? 'Starting...' : 'Start Counting'}
          </button>
        </div>

        {/* In Progress Counts */}
        {inProgressCounts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              In Progress
            </h2>
            <div className="space-y-3">
              {inProgressCounts.map((count) => (
                <Link
                  key={count.id}
                  href={`/count/${count.id}`}
                  className="block bg-white rounded-xl border border-orange-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{count.store.name}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      In Progress
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {count.itemsCounted} items counted
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Started {new Date(count.createdAt).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Counts */}
        {completedCounts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Completed
            </h2>
            <div className="space-y-3">
              {completedCounts.slice(0, 10).map((count) => (
                <Link
                  key={count.id}
                  href={`/count/${count.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{count.store.name}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{count.itemsCounted} items</span>
                    {count.totalValue && (
                      <span className="font-medium text-gray-900">
                        EUR {count.totalValue.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {count.completedAt && new Date(count.completedAt).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {counts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No counts yet</h3>
            <p className="text-gray-500">Start your first inventory count above</p>
          </div>
        )}
      </main>
    </div>
  );
}
