'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageLayout, { Card, Button, Select, Badge, EmptyState } from '@/components/ui/PageLayout';

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
      <PageLayout title="Stock Counts" backHref="/dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Stock Counts" backHref="/dashboard">
      <div className="max-w-lg mx-auto">
        {/* Start New Count */}
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Start New Count</h2>

          <Select
            label="Select Venue"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="mb-4"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </Select>

          <Button
            onClick={startNewCount}
            disabled={creating || !selectedStore}
            size="lg"
            className="w-full"
          >
            {creating ? 'Starting...' : 'Start Counting'}
          </Button>
        </Card>

        {/* In Progress Counts */}
        {inProgressCounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              In Progress
            </h2>
            <div className="space-y-3">
              {inProgressCounts.map((count) => (
                <Link
                  key={count.id}
                  href={`/count/${count.id}`}
                  className="block bg-white/70 backdrop-blur-sm rounded-2xl border border-orange-200/80 p-4 hover:shadow-lg hover:border-orange-300 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">{count.store.name}</span>
                    </div>
                    <Badge variant="warning">In Progress</Badge>
                  </div>
                  <div className="text-sm text-gray-500 ml-13">
                    {count.itemsCounted} items counted
                  </div>
                  <div className="text-xs text-gray-400 mt-1 ml-13">
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Completed
            </h2>
            <div className="space-y-3">
              {completedCounts.slice(0, 10).map((count) => (
                <Link
                  key={count.id}
                  href={`/count/${count.id}`}
                  className="block bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-4 hover:shadow-lg hover:border-gray-300/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-900">{count.store.name}</span>
                    </div>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm ml-13">
                    <span className="text-gray-500">{count.itemsCounted} items</span>
                    {count.totalValue && (
                      <span className="font-medium text-gray-900">
                        EUR {count.totalValue.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 ml-13">
                    {count.completedAt && new Date(count.completedAt).toLocaleString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {counts.length === 0 && (
          <Card>
            <EmptyState
              icon={
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
              title="No counts yet"
              description="Start your first inventory count above"
            />
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
