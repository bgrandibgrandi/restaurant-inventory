'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout, { Card, Button, LinkButton, Badge, StatCard } from '@/components/ui/PageLayout';

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
      <PageLayout title="Integrations" backHref="/dashboard">
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
    <PageLayout title="Integrations" backHref="/dashboard">
      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200/50 rounded-2xl text-green-800">
          {decodeURIComponent(successMessage)}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200/50 rounded-2xl text-red-800">
          {decodeURIComponent(errorMessage)}
        </div>
      )}

      {/* Square Integration Section */}
      <Card className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.5 2A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2h-15zM8 7h8a1 1 0 011 1v8a1 1 0 01-1 1H8a1 1 0 01-1-1V8a1 1 0 011-1z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Square POS
            </h2>
            <p className="text-sm text-gray-500">
              Connect your Square account to sync menu items and track sales
            </p>
          </div>
        </div>

        {/* Store Connections */}
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Store Connections
        </h3>
        <div className="space-y-4">
          {stores.map((store) => {
            const connection = getConnectionForStore(store.id);
            return (
              <div
                key={store.id}
                className="p-4 bg-gray-50/50 border border-gray-200/50 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{store.name}</span>
                      {connection && (
                        <Badge variant="success">Connected</Badge>
                      )}
                    </div>
                    {connection ? (
                      <div className="text-sm text-gray-500 mt-1">
                        {connection.name || connection.merchantId} • {connection.catalogItemsCount} items synced
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 mt-1">Not connected</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {connection ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncCatalog(connection.id)}
                          disabled={syncing === connection.id}
                        >
                          {syncing === connection.id ? 'Syncing...' : 'Sync Catalog'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncOrders(connection.id)}
                          disabled={syncingOrders === connection.id}
                          className="text-green-600 hover:text-green-700"
                        >
                          {syncingOrders === connection.id ? 'Syncing...' : 'Sync Orders'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnect(connection.id)}
                          disabled={disconnecting === connection.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {disconnecting === connection.id ? '...' : 'Disconnect'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleConnect(store.id)}
                        disabled={connecting === store.id}
                        size="sm"
                      >
                        {connecting === store.id ? 'Connecting...' : 'Connect Square'}
                      </Button>
                    )}
                  </div>
                </div>
                {connection && (
                  <div className="mt-3 pt-3 border-t border-gray-200/50 flex gap-6 text-xs text-gray-500">
                    <span>Last catalog sync: {formatDate(connection.lastCatalogSync)}</span>
                    <span>Last order sync: {formatDate(connection.lastOrderSync)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Connected Stores with Catalog */}
      {connections.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Square Catalog Items
            </h3>
            <div className="flex gap-2">
              <LinkButton
                href="/settings/integrations/import"
                size="sm"
              >
                Import Items
              </LinkButton>
              <LinkButton
                href="/recipes/mappings"
                variant="secondary"
                size="sm"
              >
                Manage Mappings
              </LinkButton>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            After syncing, import items or map them to recipes.
          </p>

          {connections.map((connection) => (
            <div key={connection.id} className="mb-6 last:mb-0">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                {connection.store.name}
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100/50">
                  <div className="text-2xl font-bold text-gray-900">
                    {connection.catalogItemsCount}
                  </div>
                  <div className="text-xs text-gray-500">Items Synced</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-xl border border-purple-100/50">
                  <div className="text-2xl font-bold text-gray-900">
                    {connection.orderSyncsCount}
                  </div>
                  <div className="text-xs text-gray-500">Orders Processed</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-xl border border-green-100/50">
                  <div className={`text-2xl font-bold ${connection.syncEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {connection.syncEnabled ? 'Active' : 'Paused'}
                  </div>
                  <div className="text-xs text-gray-500">Sync Status</div>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </PageLayout>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <PageLayout title="Integrations" backHref="/dashboard">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          </div>
        </PageLayout>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
