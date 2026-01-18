'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogoWithText } from '@/components/Logo';

interface Store {
  id: string;
  name: string;
  color: string | null;
  address: string | null;
}

export default function SelectStorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchStores();
    }
  }, [status, router]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (!response.ok) throw new Error('Failed to fetch stores');
      const data = await response.json();
      setStores(data);

      // If only one store, auto-select it
      if (data.length === 1) {
        await selectStore(data[0]);
      }
    } catch (err) {
      setError('Failed to load stores. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectStore = async (store: Store) => {
    setIsSelecting(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedStoreId: store.id }),
      });

      if (!response.ok) throw new Error('Failed to select store');

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Failed to select store. Please try again.');
      setIsSelecting(false);
      console.error(err);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (stores.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-8">
            <LogoWithText size="lg" />
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Stores Available</h2>
            <p className="text-gray-600 mb-6">
              Your account doesn't have any stores configured yet. Please contact your administrator to set up a store.
            </p>
            <button
              onClick={() => router.push('/settings/stores')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <LogoWithText size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select Your Store</h1>
          <p className="text-gray-600">Choose the store you want to work with today</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => selectStore(store)}
              disabled={isSelecting}
              className="w-full bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-5 hover:shadow-lg hover:border-gray-300/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-left group"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${store.color}20` || '#6366f120' }}
                >
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: store.color || '#6366f1' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{store.name}</h3>
                  {store.address && (
                    <p className="text-sm text-gray-500 truncate">{store.address}</p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {session?.user?.name && (
          <p className="text-center text-sm text-gray-500 mt-8">
            Logged in as <span className="font-medium">{session.user.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}
