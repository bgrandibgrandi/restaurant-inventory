'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PageLayout, { Card, StatCard, LinkButton, Badge } from '@/components/ui/PageLayout';
import { useTranslation } from '@/lib/i18n';

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
  const { t } = useTranslation();
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

  const getMovementBadgeVariant = (type: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      PURCHASE: 'success',
      WASTE: 'danger',
      TRANSFER_IN: 'info',
      TRANSFER_OUT: 'warning',
      ADJUSTMENT: 'default',
      SALE: 'default',
    };
    return variants[type] || 'default';
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

  const headerActions = (
    <div className="flex items-center gap-2">
      <LinkButton href="/invoices" variant="secondary" size="sm">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {t('nav.invoices')}
      </LinkButton>
      <LinkButton href="/count" variant="primary" size="sm">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        {t('nav.count')}
      </LinkButton>
    </div>
  );

  return (
    <PageLayout title={t('dashboard.title')} actions={headerActions}>
      {/* Welcome Header with Store Filter */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent mb-2">
            {t('dashboard.welcome')}, {session?.user?.name?.split(' ')[0] || 'there'}!
          </h2>
          <p className="text-gray-600">{t('dashboard.overview')}</p>
        </div>
        {stores.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{t('common.filter')}:</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="px-4 py-2 bg-white/80 border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="">{t('store.allStores')}</option>
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
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={t('dashboard.inventoryValue')}
              value={`${currency} ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={`${totalItems} ${t('nav.items').toLowerCase()}`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              iconBg="bg-gradient-to-br from-blue-100 to-indigo-100"
              iconColor="text-blue-600"
            />

            <Card className={alertsSummary.critical > 0 ? 'bg-red-50/70 border-red-200/50' : alertsSummary.warning > 0 ? 'bg-yellow-50/70 border-yellow-200/50' : ''}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-600">Stock Alerts</div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alertsSummary.critical > 0 ? 'bg-red-100' : alertsSummary.warning > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
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
                {alertsSummary.critical === 0 && alertsSummary.warning === 0 && <span className="text-green-600 font-medium">All good!</span>}
              </div>
            </Card>

            <StatCard
              title="Pending Transfers"
              value={pendingTransfers.length}
              subtitle={
                <Link href="/stock/transfers" className="text-orange-600 hover:underline">
                  View transfers
                </Link>
              }
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              }
              iconBg="bg-gradient-to-br from-orange-100 to-amber-100"
              iconColor="text-orange-600"
            />

            {/* Quick Actions Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 border-0 text-white">
              <div className="text-sm font-medium mb-4 opacity-90">Quick Actions</div>
              <div className="space-y-2.5 text-sm">
                <Link href="/stock/waste/new" className="flex items-center hover:translate-x-1 transition-transform">
                  <svg className="w-4 h-4 mr-2.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Record waste
                </Link>
                <Link href="/stock/transfers/new" className="flex items-center hover:translate-x-1 transition-transform">
                  <svg className="w-4 h-4 mr-2.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  New transfer
                </Link>
                <Link href="/recipes/new" className="flex items-center hover:translate-x-1 transition-transform">
                  <svg className="w-4 h-4 mr-2.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create recipe
                </Link>
                <Link href="/items/new" className="flex items-center hover:translate-x-1 transition-transform">
                  <svg className="w-4 h-4 mr-2.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Add item
                </Link>
              </div>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Low Stock Alerts */}
            <Card padding={false}>
              <div className="px-6 py-4 border-b border-gray-100/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                {alerts.length > 0 && (
                  <Link href="/items" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View all
                  </Link>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">All stock levels are healthy</p>
                  <p className="text-sm text-gray-500 mt-1">No items need restocking</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100/50">
                  {alerts.map((alert) => (
                    <div key={`${alert.itemId}-${alert.storeId}`} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition">
                      <div>
                        <div className="font-medium text-gray-900">{alert.itemName}</div>
                        <div className="text-sm text-gray-500">{alert.storeName}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
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
            </Card>

            {/* Recent Movements */}
            <Card padding={false}>
              <div className="px-6 py-4 border-b border-gray-100/50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Movements</h3>
                <Link href="/stock/movements" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all
                </Link>
              </div>
              {movements.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No movements recorded yet</p>
                  <p className="text-sm text-gray-500 mt-1">Start tracking your inventory</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100/50">
                  {movements.map((movement) => (
                    <div key={movement.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition">
                      <div className="flex items-center gap-3">
                        <Badge variant={getMovementBadgeVariant(movement.type)}>
                          {getMovementTypeLabel(movement.type)}
                        </Badge>
                        <div>
                          <div className="font-medium text-gray-900">{movement.item.name}</div>
                          <div className="text-sm text-gray-500">{movement.store.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.item.unit}
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(movement.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { href: '/recipes', label: 'Recipes', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', color: 'from-purple-500 to-indigo-500' },
              { href: '/categories', label: 'Categories', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'from-pink-500 to-rose-500' },
              { href: '/stores', label: 'Venues', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'from-cyan-500 to-blue-500' },
              { href: '/suppliers', label: 'Suppliers', icon: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4', color: 'from-emerald-500 to-teal-500' },
              { href: '/users', label: 'Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'from-amber-500 to-orange-500' },
              { href: '/reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'from-violet-500 to-purple-500' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-5 hover:shadow-lg hover:border-gray-300/50 transition-all duration-300 text-center"
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition">{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </PageLayout>
  );
}
