'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TranslationProvider, Language } from '@/lib/i18n';
import { StoreProvider } from '@/lib/store-context';

interface Store {
  id: string;
  name: string;
  color: string | null;
}

interface UserPreferences {
  preferredLanguage: string;
  selectedStoreId: string | null;
  selectedStore: Store | null;
}

// Pages that don't require store selection
const PUBLIC_PAGES = ['/', '/select-store'];

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    // Fetch user preferences and stores
    const fetchData = async () => {
      try {
        const [prefsResponse, storesResponse] = await Promise.all([
          fetch('/api/user/preferences'),
          fetch('/api/stores'),
        ]);

        let prefsData: UserPreferences | null = null;

        if (prefsResponse.ok) {
          prefsData = await prefsResponse.json();
          setPreferences(prefsData);
        }

        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          setStores(storesData);

          // Check if user needs to select a store
          if (!prefsData?.selectedStoreId && storesData.length > 0 && !PUBLIC_PAGES.includes(pathname)) {
            router.push('/select-store');
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status, pathname, router]);

  // Show loading state
  if (isLoading && status === 'authenticated' && !PUBLIC_PAGES.includes(pathname)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const initialLanguage = (preferences?.preferredLanguage as Language) || 'en';
  const initialStore = preferences?.selectedStore || null;

  return (
    <TranslationProvider initialLanguage={initialLanguage}>
      <StoreProvider initialStore={initialStore} initialStores={stores}>
        {children}
      </StoreProvider>
    </TranslationProvider>
  );
}
