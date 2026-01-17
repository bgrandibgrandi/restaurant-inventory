'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
}

interface SquareConnection {
  id: string;
  storeId: string;
  store: Store;
  name: string | null;
  merchantId: string;
  squareLocationId: string | null;
  lastCatalogSync: string | null;
  lastOrderSync: string | null;
  syncEnabled: boolean;
  catalogItemsCount: number;
  orderSyncsCount: number;
  createdAt: string;
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [stores, setStores] = useState<Store[]>([]);
  const [connections, setConnections] = useState<SquareConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingOrders, setSyncingOrders] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const successMessage = searchParams.get('success');
  const errorMessage = searchParams.get('error');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesRes, connectionsRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/square'),
      ]);

      if (storesRes.ok) {
        setStores(await storesRes.json());
      }
      if (connectionsRes.ok) {
        setConnections(await connectionsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (storeId: string) => {
    setConnecting(storeId);
    try {
      const response = await fetch('/api/square/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Square OAuth
        window.location.href = data.authUrl;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to start connection');
      }
    } catch (error) {
      console.error('Error connecting:', error);
      alert('An error occurred');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this Square account? This will remove all synced catalog data.')) {
      return;
    }

    setDisconnecting(connectionId);
    try {
      const response = await fetch(`/api/square?id=${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('An error occurred');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSyncCatalog = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const response = await fetch('/api/square/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Synced ${data.totalItems} items (${data.created} new, ${data.updated} updated)`);
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to sync catalog');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('An error occurred');
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncOrders = async (connectionId: string) => {
    setSyncingOrders(connectionId);
    try {
      const response = await fetch('/api/square/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          `Processed ${data.processedOrders} orders, created ${data.createdMovements} stock movements. ${data.skippedOrders} orders skipped (already processed or no mappings).`
        );
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to sync orders');
      }
    } catch (error) {
      console.error('Error syncing orders:', error);
      alert('An error occurred');
    } finally {
      setSyncingOrders(null);
    }
  };

  const getConnectionForStore = (storeId: string) => {
    return connections.find((c) => c.storeId === storeId);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Integrations</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {decodeURIComponent(successMessage)}
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {decodeURIComponent(errorMessage)}
          </div>
        )}

        {/* Square Integration Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 2A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2h-15zM8 7h8a1 1 0 011 1v8a1 1 0 01-1 1H8a1 1 0 01-1-1V8a1 1 0 011-1z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Square POS</h2>
              <p className="text-sm text-gray-500">
                Connect your Square account to sync menu items and track sales
              </p>
            </div>
          </div>


          {/* Store Connections */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Store Connections
          </h3>
          <div className="space-y-3">
            {stores.map((store) => {
              const connection = getConnectionForStore(store.id);
              return (
                <div
                  key={store.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{store.name}</div>
                      {connection ? (
                        <div className="text-sm text-gray-500">
                          Connected to {connection.name || connection.merchantId}
                          {' '}&middot;{' '}
                          {connection.catalogItemsCount} items synced
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Not connected</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {connection ? (
                        <>
                          <button
                            onClick={() => handleSyncCatalog(connection.id)}
                            disabled={syncing === connection.id}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                          >
                            {syncing === connection.id ? 'Syncing...' : 'Sync Catalog'}
                          </button>
                          <button
                            onClick={() => handleSyncOrders(connection.id)}
                            disabled={syncingOrders === connection.id}
                            className="px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                          >
                            {syncingOrders === connection.id ? 'Syncing...' : 'Sync Orders'}
                          </button>
                          <button
                            onClick={() => handleDisconnect(connection.id)}
                            disabled={disconnecting === connection.id}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          >
                            {disconnecting === connection.id ? '...' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConnect(store.id)}
                          disabled={connecting === store.id}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                        >
                          {connecting === store.id ? 'Connecting...' : 'Connect Square'}
                        </button>
                      )}
                    </div>
                  </div>
                  {connection && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                      <span>Last catalog sync: {formatDate(connection.lastCatalogSync)}</span>
                      <span>Last order sync: {formatDate(connection.lastOrderSync)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Connected Stores with Catalog */}
        {connections.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Square Catalog Items
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              After syncing, map your Square items to recipes.{' '}
              <Link href="/recipes/mappings" className="text-blue-600 hover:underline">
                Manage Mappings
              </Link>
            </p>
            {connections.map((connection) => (
              <div key={connection.id} className="mb-4 last:mb-0">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {connection.store.name}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {connection.catalogItemsCount}
                    </div>
                    <div className="text-xs text-gray-500">Items Synced</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">
                      {connection.orderSyncsCount}
                    </div>
                    <div className="text-xs text-gray-500">Orders Processed</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {connection.syncEnabled ? 'Active' : 'Paused'}
                    </div>
                    <div className="text-xs text-gray-500">Sync Status</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
