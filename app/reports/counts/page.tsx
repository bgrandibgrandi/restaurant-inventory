'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageLayout, { Card, Button, Select, Badge, StatCard, EmptyState } from '@/components/ui/PageLayout';

interface Store {
  id: string;
  name: string;
}

interface CountEntry {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number | null;
  totalValue: number;
  expectedQuantity: number | null;
  discrepancy: number | null;
  unit: string;
}

interface Count {
  id: string;
  name: string | null;
  storeName: string;
  storeId: string;
  userName: string;
  status: string;
  itemsCounted: number;
  totalValue: number | null;
  expectedValue: number | null;
  discrepancyValue: number | null;
  createdAt: string;
  completedAt: string | null;
  entries: CountEntry[];
}

interface ReportData {
  summary: {
    totalCounts: number;
    completedCounts: number;
    inProgressCounts: number;
    totalValue: number;
    totalDiscrepancy: number;
    totalItemsCounted: number;
    avgCountValue: number;
  };
  stores: Store[];
  counts: Count[];
  countsByStore: { storeId: string; storeName: string; totalCounts: number; completedCounts: number; totalValue: number; totalDiscrepancy: number }[];
  countsByUser: { userId: string; userName: string; totalCounts: number; completedCounts: number }[];
  monthlyTrend: { month: string; count: number; value: number }[];
  topItems: { itemId: string; name: string; category: string; totalValue: number; totalQuantity: number; countAppearances: number }[];
  discrepancyItems: { itemId: string; name: string; category: string; discrepancy: number; expected: number; actual: number; countId: string; countDate: string; storeName: string }[];
  valueByCategory: { category: string; totalValue: number; itemCount: number }[];
}

export default function CountReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'counts' | 'items' | 'discrepancies'>('overview');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [expandedCount, setExpandedCount] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore !== 'all') params.append('storeId', selectedStore);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/reports/counts?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedStore, selectedStatus, startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('de-DE', {
      month: 'short',
      year: 'numeric',
    });
  };

  const exportToCSV = () => {
    if (!data) return;
    setExporting('csv');

    try {
      // Create CSV content for counts
      let csvContent = 'Stock Count Report\n';
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Summary section
      csvContent += 'SUMMARY\n';
      csvContent += `Total Counts,${data.summary.totalCounts}\n`;
      csvContent += `Completed Counts,${data.summary.completedCounts}\n`;
      csvContent += `In Progress,${data.summary.inProgressCounts}\n`;
      csvContent += `Total Value,${formatCurrency(data.summary.totalValue)}\n`;
      csvContent += `Total Discrepancy,${formatCurrency(data.summary.totalDiscrepancy)}\n`;
      csvContent += `Total Items Counted,${data.summary.totalItemsCounted}\n\n`;

      // Counts detail
      csvContent += 'STOCK COUNTS\n';
      csvContent += 'Date,Store,Counted By,Status,Items Counted,Total Value,Expected Value,Discrepancy\n';
      data.counts.forEach(count => {
        csvContent += `${formatDate(count.createdAt)},${count.storeName},${count.userName},${count.status},${count.itemsCounted},${count.totalValue || 0},${count.expectedValue || 0},${count.discrepancyValue || 0}\n`;
      });

      csvContent += '\nCOUNT ENTRIES DETAIL\n';
      csvContent += 'Count Date,Store,Item,Category,Quantity,Unit,Unit Cost,Total Value,Expected Qty,Discrepancy\n';
      data.counts.forEach(count => {
        count.entries.forEach(entry => {
          csvContent += `${formatDate(count.createdAt)},${count.storeName},${entry.itemName},${entry.category},${entry.quantity},${entry.unit},${entry.unitCost || 0},${entry.totalValue},${entry.expectedQuantity || ''},${entry.discrepancy || ''}\n`;
        });
      });

      csvContent += '\nVALUE BY CATEGORY\n';
      csvContent += 'Category,Total Value,Item Count\n';
      data.valueByCategory.forEach(cat => {
        csvContent += `${cat.category},${cat.totalValue},${cat.itemCount}\n`;
      });

      csvContent += '\nTOP ITEMS BY VALUE\n';
      csvContent += 'Item,Category,Total Value,Total Quantity,Count Appearances\n';
      data.topItems.forEach(item => {
        csvContent += `${item.name},${item.category},${item.totalValue},${item.totalQuantity},${item.countAppearances}\n`;
      });

      csvContent += '\nDISCREPANCIES\n';
      csvContent += 'Date,Store,Item,Category,Expected,Actual,Discrepancy\n';
      data.discrepancyItems.forEach(item => {
        csvContent += `${formatDate(item.countDate)},${item.storeName},${item.name},${item.category},${item.expected},${item.actual},${item.discrepancy}\n`;
      });

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stock-count-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = () => {
    if (!data) return;
    setExporting('pdf');

    try {
      // Create a printable HTML document
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stock Count Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
            tr:nth-child(even) { background: #f9fafb; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
            .summary-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
            .summary-value { font-size: 24px; font-weight: bold; color: #1e40af; }
            .summary-label { color: #6b7280; font-size: 12px; }
            .negative { color: #dc2626; }
            .positive { color: #16a34a; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .badge-completed { background: #dcfce7; color: #166534; }
            .badge-in_progress { background: #fef3c7; color: #92400e; }
            .page-break { page-break-before: always; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              Print / Save as PDF
            </button>
          </div>

          <h1>Stock Count Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${selectedStore !== 'all' ? `<p>Store: ${data.stores.find(s => s.id === selectedStore)?.name || 'All'}</p>` : ''}
          ${startDate || endDate ? `<p>Period: ${startDate || 'Start'} to ${endDate || 'Present'}</p>` : ''}

          <h2>Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-value">${data.summary.totalCounts}</div>
              <div class="summary-label">Total Counts</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${data.summary.completedCounts}</div>
              <div class="summary-label">Completed</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(data.summary.totalValue)}</div>
              <div class="summary-label">Total Value</div>
            </div>
            <div class="summary-card">
              <div class="summary-value ${data.summary.totalDiscrepancy < 0 ? 'negative' : ''}">${formatCurrency(data.summary.totalDiscrepancy)}</div>
              <div class="summary-label">Total Discrepancy</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${data.summary.totalItemsCounted}</div>
              <div class="summary-label">Items Counted</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${formatCurrency(data.summary.avgCountValue)}</div>
              <div class="summary-label">Avg Count Value</div>
            </div>
          </div>

          <h2>Value by Category</h2>
          <table>
            <thead>
              <tr><th>Category</th><th>Total Value</th><th>Item Count</th></tr>
            </thead>
            <tbody>
              ${data.valueByCategory.map(cat => `
                <tr>
                  <td>${cat.category}</td>
                  <td>${formatCurrency(cat.totalValue)}</td>
                  <td>${cat.itemCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Stock Counts</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Store</th><th>Counted By</th><th>Status</th><th>Items</th><th>Total Value</th><th>Discrepancy</th></tr>
            </thead>
            <tbody>
              ${data.counts.map(count => `
                <tr>
                  <td>${formatDate(count.createdAt)}</td>
                  <td>${count.storeName}</td>
                  <td>${count.userName}</td>
                  <td><span class="badge badge-${count.status}">${count.status}</span></td>
                  <td>${count.itemsCounted}</td>
                  <td>${count.totalValue ? formatCurrency(count.totalValue) : '-'}</td>
                  <td class="${(count.discrepancyValue || 0) < 0 ? 'negative' : ''}">${count.discrepancyValue ? formatCurrency(count.discrepancyValue) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="page-break"></div>

          <h2>Top 20 Items by Value</h2>
          <table>
            <thead>
              <tr><th>Item</th><th>Category</th><th>Total Value</th><th>Total Qty</th><th>Appearances</th></tr>
            </thead>
            <tbody>
              ${data.topItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${formatCurrency(item.totalValue)}</td>
                  <td>${item.totalQuantity.toFixed(2)}</td>
                  <td>${item.countAppearances}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${data.discrepancyItems.length > 0 ? `
            <h2>Discrepancies</h2>
            <table>
              <thead>
                <tr><th>Date</th><th>Store</th><th>Item</th><th>Expected</th><th>Actual</th><th>Discrepancy</th></tr>
              </thead>
              <tbody>
                ${data.discrepancyItems.slice(0, 30).map(item => `
                  <tr>
                    <td>${formatDate(item.countDate)}</td>
                    <td>${item.storeName}</td>
                    <td>${item.name}</td>
                    <td>${item.expected}</td>
                    <td>${item.actual}</td>
                    <td class="${item.discrepancy < 0 ? 'negative' : 'positive'}">${item.discrepancy > 0 ? '+' : ''}${item.discrepancy.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <h2>Counts by Store</h2>
          <table>
            <thead>
              <tr><th>Store</th><th>Total Counts</th><th>Completed</th><th>Total Value</th><th>Discrepancy</th></tr>
            </thead>
            <tbody>
              ${data.countsByStore.map(store => `
                <tr>
                  <td>${store.storeName}</td>
                  <td>${store.totalCounts}</td>
                  <td>${store.completedCounts}</td>
                  <td>${formatCurrency(store.totalValue)}</td>
                  <td class="${store.totalDiscrepancy < 0 ? 'negative' : ''}">${formatCurrency(store.totalDiscrepancy)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h2>Counts by User</h2>
          <table>
            <thead>
              <tr><th>User</th><th>Total Counts</th><th>Completed</th></tr>
            </thead>
            <tbody>
              ${data.countsByUser.map(user => `
                <tr>
                  <td>${user.userName}</td>
                  <td>${user.totalCounts}</td>
                  <td>${user.completedCounts}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } finally {
      setExporting(null);
    }
  };

  const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      completed: 'success',
      in_progress: 'warning',
      approved: 'info',
      cancelled: 'danger',
    };
    return variants[status] || 'default';
  };

  if (loading) {
    return (
      <PageLayout title="Stock Count Reports" subtitle="Analytics and insights" backHref="/dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout title="Stock Count Reports" backHref="/dashboard">
        <Card>
          <EmptyState
            icon={<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title="No data available"
            description="Start counting to see reports"
          />
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Stock Count Reports"
      subtitle="Analytics and insights"
      backHref="/dashboard"
     
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportToCSV} disabled={exporting === 'csv'}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="primary" size="sm" onClick={exportToPDF} disabled={exporting === 'pdf'}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Stores</option>
              {data.stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          title="Total Counts"
          value={data.summary.totalCounts}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          iconBg="bg-gradient-to-br from-blue-100 to-indigo-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Completed"
          value={data.summary.completedCounts}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          iconBg="bg-gradient-to-br from-green-100 to-emerald-100"
          iconColor="text-green-600"
        />
        <StatCard
          title="In Progress"
          value={data.summary.inProgressCounts}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          iconBg="bg-gradient-to-br from-orange-100 to-amber-100"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(data.summary.totalValue)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          iconBg="bg-gradient-to-br from-purple-100 to-pink-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Items Counted"
          value={data.summary.totalItemsCounted}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
          iconBg="bg-gradient-to-br from-cyan-100 to-blue-100"
          iconColor="text-cyan-600"
        />
        <StatCard
          title="Discrepancy"
          value={formatCurrency(data.summary.totalDiscrepancy)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          iconBg={data.summary.totalDiscrepancy < 0 ? "bg-gradient-to-br from-red-100 to-rose-100" : "bg-gradient-to-br from-gray-100 to-slate-100"}
          iconColor={data.summary.totalDiscrepancy < 0 ? "text-red-600" : "text-gray-600"}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl mb-6 w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'counts', label: 'All Counts' },
          { key: 'items', label: 'Top Items' },
          { key: 'discrepancies', label: 'Discrepancies' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Value by Category */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Value by Category</h3>
            <div className="space-y-3">
              {data.valueByCategory.slice(0, 8).map((cat, index) => {
                const maxValue = data.valueByCategory[0]?.totalValue || 1;
                const percentage = (cat.totalValue / maxValue) * 100;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{cat.category}</span>
                      <span className="text-gray-600">{formatCurrency(cat.totalValue)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Counts by Store */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Counts by Store</h3>
            <div className="space-y-3">
              {data.countsByStore.map((store) => (
                <div key={store.storeId} className="p-3 bg-gray-50/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{store.storeName}</span>
                    <Badge variant="default">{store.totalCounts} counts</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Value: {formatCurrency(store.totalValue)}</span>
                    <span className={store.totalDiscrepancy < 0 ? 'text-red-600' : ''}>
                      Discrepancy: {formatCurrency(store.totalDiscrepancy)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trend</h3>
            {data.monthlyTrend.length > 0 ? (
              <div className="space-y-3">
                {data.monthlyTrend.slice(-6).map((month) => (
                  <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                    <span className="font-medium text-gray-900">{formatMonth(month.month)}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{month.count} counts</div>
                      <div className="text-xs text-gray-500">{formatCurrency(month.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No trend data available</p>
            )}
          </Card>

          {/* Counts by User */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Counts by User</h3>
            <div className="space-y-3">
              {data.countsByUser.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{user.userName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{user.totalCounts} total</div>
                    <div className="text-xs text-gray-500">{user.completedCounts} completed</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'counts' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Store</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Counted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Discrepancy</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.counts.map((count) => (
                  <>
                    <tr key={count.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(count.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{count.storeName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{count.userName}</td>
                      <td className="px-4 py-3"><Badge variant={getStatusVariant(count.status)}>{count.status.replace('_', ' ')}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{count.itemsCounted}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{count.totalValue ? formatCurrency(count.totalValue) : '-'}</td>
                      <td className={`px-4 py-3 text-sm font-medium text-right ${(count.discrepancyValue || 0) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {count.discrepancyValue ? formatCurrency(count.discrepancyValue) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedCount(expandedCount === count.id ? null : count.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition"
                        >
                          <svg className={`w-5 h-5 transition-transform ${expandedCount === count.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {expandedCount === count.id && count.entries.length > 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-3 bg-gray-50/50">
                          <div className="rounded-xl border border-gray-200/50 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100/80">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Category</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Unit Cost</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Expected</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Discrepancy</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {count.entries.map((entry) => (
                                  <tr key={entry.id}>
                                    <td className="px-3 py-2 text-gray-900">{entry.itemName}</td>
                                    <td className="px-3 py-2 text-gray-600">{entry.category}</td>
                                    <td className="px-3 py-2 text-gray-900 text-right">{entry.quantity} {entry.unit}</td>
                                    <td className="px-3 py-2 text-gray-600 text-right">{entry.unitCost ? formatCurrency(entry.unitCost) : '-'}</td>
                                    <td className="px-3 py-2 text-gray-900 font-medium text-right">{formatCurrency(entry.totalValue)}</td>
                                    <td className="px-3 py-2 text-gray-600 text-right">{entry.expectedQuantity ?? '-'}</td>
                                    <td className={`px-3 py-2 text-right font-medium ${(entry.discrepancy || 0) < 0 ? 'text-red-600' : (entry.discrepancy || 0) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                      {entry.discrepancy ? (entry.discrepancy > 0 ? '+' : '') + entry.discrepancy.toFixed(2) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'items' && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Quantity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Count Appearances</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topItems.map((item, index) => (
                  <tr key={item.itemId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.totalValue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.totalQuantity.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.countAppearances}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'discrepancies' && (
        <Card padding={false}>
          {data.discrepancyItems.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                title="No discrepancies found"
                description="All counts match expected values"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Store</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Discrepancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.discrepancyItems.map((item, index) => (
                    <tr key={`${item.countId}-${item.itemId}-${index}`} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(item.countDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.storeName}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.expected.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.actual.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${item.discrepancy < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.discrepancy > 0 ? '+' : ''}{item.discrepancy.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageLayout>
  );
}
