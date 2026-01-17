'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { LogoWithText } from '@/components/Logo';

type Store = {
  id: string;
  name: string;
};

type StockAlert = {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  currentQuantity: number;
  minStockLevel: number;
  unit: string;
  alertType: 'LOW_STOCK' | 'OVER_STOCK';
  severity: 'warning' | 'critical';
};

type StockMovement = {
  id: string;
  quantity: number;
  type: string;
  reason: string | null;
  notes: string | null;
  createdAt: string;
  item: {
    id: string;
    name: string;
    unit: string;
  };
  store: {
    id: string;
    name: string;
  };
};

type Transfer = {
  id: string;
  status: string;
  createdAt: string;
  fromStore: { name: string };
  toStore: { name: string };
  items: { quantity: number; item: { name: string } }[];
};

export default function Dashboard() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalValue, setTotalValue] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [currency, setCurrency] = useState('EUR');

  // Alerts
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [alertsSummary, setAlertsSummary] = useState({ critical: 0, warning: 0 });

  // Recent movements
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Pending transfers
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (stores.length > 0 || selectedStoreId === '') {
      fetchDashboardData();
    }
  }, [selectedStoreId, stores]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const storeParam = selectedStoreId ? `?storeId=${selectedStoreId}` : '';

      const [valueRes, alertsRes, movementsRes, transfersRes] = await Promise.all([
        fetch(`/api/stock/value${storeParam}`),
        fetch(`/api/stock/alerts${storeParam}`),
        fetch(`/api/stock/movements${storeParam}&limit=10`),
        fetch('/api/transfers?status=PENDING&limit=5'),
      ]);

      if (valueRes.ok) {
        const data = await valueRes.json();
        setTotalValue(data.totalValue);
        setTotalItems(data.totalItems);
        setCurrency(data.currency);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts.slice(0, 5));
        setAlertsSummary({
          critical: data.summary.critical,
          warning: data.summary.warning,
        });
      }

      if (movementsRes.ok) {
        const data = await movementsRes.json();
        setMovements(data.movements);
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        setPendingTransfers(data.transfers);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: 'Purchase',
      WASTE: 'Waste',
      TRANSFER_IN: 'Transfer In',
      TRANSFER_OUT: 'Transfer Out',
      ADJUSTMENT: 'Adjustment',
      SALE: 'Sale',
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PURCHASE: 'bg-green-100 text-green-800',
      WASTE: 'bg-red-100 text-red-800',
      TRANSFER_IN: 'bg-blue-100 text-blue-800',
      TRANSFER_OUT: 'bg-orange-100 text-orange-800',
      ADJUSTMENT: 'bg-purple-100 text-purple-800',
      SALE: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <LogoWithText size="md" />
            <div className="flex items-center gap-4">
              <Link
                href="/invoices"
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Invoices
              </Link>
              <Link
                href="/count"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Count
              </Link>
              <Link
                href="/stock/waste/new"
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Waste
              </Link>
              <Link
                href="/settings/integrations"
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                title="Settings & Integrations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              {session?.user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{session.user.email}</span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header with Store Filter */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening in your inventory today
            </p>
          </div>
          {stores.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">View:</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Total Value Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Inventory Value</div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {currency} {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-500">{totalItems} items tracked</div>
              </div>

              {/* Low Stock Alerts Card */}
              <div className={`rounded-xl shadow-sm border p-6 hover:shadow-md transition ${alertsSummary.critical > 0 ? 'bg-red-50 border-red-200' : alertsSummary.warning > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Stock Alerts</div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alertsSummary.critical > 0 ? 'bg-red-100' : alertsSummary.warning > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                    <svg className={`w-5 h-5 ${alertsSummary.critical > 0 ? 'text-red-600' : alertsSummary.warning > 0 ? 'text-yellow-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {alertsSummary.critical + alertsSummary.warning}
                </div>
                <div className="text-sm text-gray-500">
                  {alertsSummary.critical > 0 && <span className="text-red-600 font-medium">{alertsSummary.critical} critical</span>}
                  {alertsSummary.critical > 0 && alertsSummary.warning > 0 && ' / '}
                  {alertsSummary.warning > 0 && <span className="text-yellow-600 font-medium">{alertsSummary.warning} warning</span>}
                  {alertsSummary.critical === 0 && alertsSummary.warning === 0 && <span className="text-green-600">All good!</span>}
                </div>
              </div>

              {/* Pending Transfers Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Pending Transfers</div>
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{pendingTransfers.length}</div>
                <Link href="/stock/transfers" className="text-sm text-orange-600 hover:underline">
                  View transfers
                </Link>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl shadow-sm p-6 text-white hover:shadow-md transition">
                <div className="text-sm font-medium mb-3 opacity-90">Quick Actions</div>
                <div className="space-y-2 text-sm">
                  <Link href="/stock/waste/new" className="flex items-center hover:underline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Record waste
                  </Link>
                  <Link href="/stock/transfers/new" className="flex items-center hover:underline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    New transfer
                  </Link>
                  <Link href="/items" className="flex items-center hover:underline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Manage items
                  </Link>
                  <Link href="/stock/movements" className="flex items-center hover:underline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View movements
                  </Link>
                  <Link href="/settings/integrations" className="flex items-center hover:underline">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Square Integration
                  </Link>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Low Stock Alerts */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h2>
                  {alerts.length > 0 && (
                    <Link href="/stock/movements?type=PURCHASE" className="text-sm text-blue-600 hover:underline">
                      Restock now
                    </Link>
                  )}
                </div>
                {alerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-500">All stock levels are healthy</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {alerts.map((alert) => (
                      <div key={`${alert.itemId}-${alert.storeId}`} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{alert.itemName}</div>
                          <div className="text-sm text-gray-500">{alert.storeName}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {alert.currentQuantity} {alert.unit}
                          </div>
                          <div className="text-sm text-gray-500">
                            Min: {alert.minStockLevel} {alert.unit}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Movements */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Movements</h2>
                  <Link href="/stock/movements" className="text-sm text-blue-600 hover:underline">
                    View all
                  </Link>
                </div>
                {movements.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No movements recorded yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {movements.map((movement) => (
                      <div key={movement.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.type)}`}>
                            {getMovementTypeLabel(movement.type)}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{movement.item.name}</div>
                            <div className="text-sm text-gray-500">{movement.store.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.item.unit}
                          </div>
                          <div className="text-sm text-gray-500">{formatDate(movement.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* More Links */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Link href="/categories" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Categories</span>
              </Link>
              <Link href="/stores" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Venues</span>
              </Link>
              <Link href="/suppliers" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Suppliers</span>
              </Link>
              <Link href="/users" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Team</span>
              </Link>
              <Link href="/roles" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Roles</span>
              </Link>
              <Link href="/stock/new" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Add Stock</span>
              </Link>
              <Link href="/reports" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition text-center">
                <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Reports</span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
