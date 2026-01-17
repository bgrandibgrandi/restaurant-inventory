'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DashboardData = {
  summary: {
    totalInventoryValue: number;
    totalItems: number;
    lowStockCount: number;
    wasteValue: number;
    varianceValue: number;
    varianceItemCount: number;
  };
  lowStockItems: { id: string; name: string; current: number; min: number; unit: string }[];
  wasteByReason: { reason: string; value: number }[];
  movementsByType: { type: string; count: number; value: number }[];
  recentCounts: {
    id: string;
    name: string;
    completedAt: string | null;
    totalValue: number | null;
    discrepancyValue: number | null;
    itemsCounted: number | null;
  }[];
  period: { days: number; startDate: string };
};

type Store = {
  id: string;
  name: string;
};

export default function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedStoreId, days]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (response.ok) {
        const storeData = await response.json();
        setStores(storeData);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStoreId) params.set('storeId', selectedStoreId);
      params.set('days', days.toString());

      const response = await fetch(`/api/reports/dashboard?${params}`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: 'Purchases',
      WASTE: 'Waste',
      TRANSFER_IN: 'Transfers In',
      TRANSFER_OUT: 'Transfers Out',
      ADJUSTMENT: 'Adjustments',
      SALE: 'Sales',
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PURCHASE: 'bg-green-500',
      WASTE: 'bg-red-500',
      TRANSFER_IN: 'bg-blue-500',
      TRANSFER_OUT: 'bg-orange-500',
      ADJUSTMENT: 'bg-purple-500',
      SALE: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Reports & Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          {stores.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Store:</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Period:</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Inventory Value */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Inventory Value</div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.totalInventoryValue)}</div>
                <div className="text-sm text-gray-500">{data.summary.totalItems} items tracked</div>
              </div>

              {/* Waste Value */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Waste ({days}d)</div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.wasteValue)}</div>
                <Link href="/stock/waste" className="text-sm text-red-600 hover:underline">View waste log</Link>
              </div>

              {/* Variance */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Count Variance</div>
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${data.summary.varianceValue < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(data.summary.varianceValue)}
                </div>
                <div className="text-sm text-gray-500">{data.summary.varianceItemCount} items with discrepancies</div>
              </div>

              {/* Low Stock */}
              <div className={`rounded-xl shadow-sm border p-6 ${data.summary.lowStockCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">Low Stock Alerts</div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data.summary.lowStockCount > 0 ? 'bg-orange-100' : 'bg-green-100'}`}>
                    <svg className={`w-5 h-5 ${data.summary.lowStockCount > 0 ? 'text-orange-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{data.summary.lowStockCount}</div>
                <div className="text-sm text-gray-500">items below minimum</div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Waste by Reason */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Waste by Reason</h2>
                </div>
                {data.wasteByReason.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No waste recorded in this period</div>
                ) : (
                  <div className="p-6">
                    <div className="space-y-4">
                      {data.wasteByReason.map((item) => {
                        const maxValue = Math.max(...data.wasteByReason.map((w) => w.value));
                        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                        return (
                          <div key={item.reason}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">{item.reason}</span>
                              <span className="text-gray-600">{formatCurrency(item.value)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Movements by Type */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Stock Movements</h2>
                </div>
                {data.movementsByType.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No movements in this period</div>
                ) : (
                  <div className="p-6">
                    <div className="space-y-4">
                      {data.movementsByType.map((item) => (
                        <div key={item.type} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getMovementTypeColor(item.type)}`}></div>
                            <span className="font-medium text-gray-700">{getMovementTypeLabel(item.type)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(item.value)}</div>
                            <div className="text-xs text-gray-500">{item.count} transactions</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Link href="/stock/movements" className="text-sm text-blue-600 hover:underline">
                        View all movements
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Low Stock Items Table */}
            {data.lowStockItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">Low Stock Items</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.lowStockItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-medium">
                            {item.current} {item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                            {item.min} {item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                            -{(item.min - item.current).toFixed(2)} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Counts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Stock Counts</h2>
                <Link href="/count" className="text-sm text-blue-600 hover:underline">View all</Link>
              </div>
              {data.recentCounts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No counts completed in this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.recentCounts.map((count) => (
                        <tr key={count.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/count/${count.id}`} className="font-medium text-blue-600 hover:underline">
                              {count.name || 'Unnamed Count'}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {formatDate(count.completedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {count.itemsCounted || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {count.totalValue ? formatCurrency(count.totalValue) : '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${count.discrepancyValue && count.discrepancyValue < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {count.discrepancyValue ? formatCurrency(count.discrepancyValue) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">Failed to load report data</div>
        )}
      </main>
    </div>
  );
}
