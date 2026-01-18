'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  color: string | null;
}

interface StoreContextType {
  selectedStore: Store | null;
  setSelectedStore: (store: Store) => Promise<void>;
  stores: Store[];
  setStores: (stores: Store[]) => void;
  isLoading: boolean;
  requiresStoreSelection: boolean;
  showStoreSwitchConfirm: boolean;
  setShowStoreSwitchConfirm: (show: boolean) => void;
  pendingStore: Store | null;
  confirmStoreSwitch: () => Promise<void>;
  cancelStoreSwitch: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: React.ReactNode;
  initialStore?: Store | null;
  initialStores?: Store[];
}

export function StoreProvider({
  children,
  initialStore = null,
  initialStores = []
}: StoreProviderProps) {
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(initialStore);
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isLoading, setIsLoading] = useState(false);
  const [showStoreSwitchConfirm, setShowStoreSwitchConfirm] = useState(false);
  const [pendingStore, setPendingStore] = useState<Store | null>(null);

  // Check if user needs to select a store
  const requiresStoreSelection = !selectedStore && stores.length > 0;

  // Request to switch store (shows confirmation dialog)
  const setSelectedStore = useCallback(async (store: Store) => {
    // If no store is selected yet (first time), switch immediately
    if (!selectedStore) {
      await switchStore(store);
      return;
    }

    // If same store, do nothing
    if (selectedStore.id === store.id) {
      return;
    }

    // Show confirmation dialog
    setPendingStore(store);
    setShowStoreSwitchConfirm(true);
  }, [selectedStore]);

  // Actually perform the store switch
  const switchStore = async (store: Store) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedStoreId: store.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch store');
      }

      setSelectedStoreState(store);

      // Refresh the page to reload all data with new store filter
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch store:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm the store switch from dialog
  const confirmStoreSwitch = useCallback(async () => {
    if (pendingStore) {
      await switchStore(pendingStore);
      setShowStoreSwitchConfirm(false);
      setPendingStore(null);
    }
  }, [pendingStore]);

  // Cancel the store switch
  const cancelStoreSwitch = useCallback(() => {
    setShowStoreSwitchConfirm(false);
    setPendingStore(null);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        selectedStore,
        setSelectedStore,
        stores,
        setStores,
        isLoading,
        requiresStoreSelection,
        showStoreSwitchConfirm,
        setShowStoreSwitchConfirm,
        pendingStore,
        confirmStoreSwitch,
        cancelStoreSwitch,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
