'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout, { Card, Button, Badge, EmptyState } from '@/components/ui/PageLayout';

interface Store {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  supplierName: string | null;
  invoiceDate: string | null;
  totalAmount: number | null;
  fileName: string | null;
}

interface StockMovement {
  id: string;
  quantity: number;
  type: string;
  reason: string | null;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  costPrice: number | null;
  createdAt: string;
  item: {
    id: string;
    name: string;
    unit: string;
    category: { id: string; name: string } | null;
  };
  store: {
    id: string;
    name: string;
  };
  invoice: Invoice | null;
}

const MOVEMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'WASTE', label: 'Waste' },
  { value: 'TRANSFER_IN', label: 'Transfer In' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'SALE', label: 'Sale' },
];

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  // Edit modal state
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    costPrice: 0,
    reason: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Detail modal state
  const [detailMovement, setDetailMovement] = useState<StockMovement | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    setOffset(0);
    fetchMovements();
  }, [typeFilter, storeFilter, startDate, endDate]);

  useEffect(() => {
    fetchMovements();
  }, [offset]);

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

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (storeFilter) params.append('storeId', storeFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/stock/movements?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovementDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/stock/movements/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDetailMovement(data);
      }
    } catch (error) {
      console.error('Error fetching movement detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditClick = (movement: StockMovement) => {
    setEditingMovement(movement);
    setEditForm({
      quantity: Math.abs(movement.quantity),
      costPrice: movement.costPrice || 0,
      reason: movement.reason || '',
      notes: movement.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMovement) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/stock/movements/${editingMovement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setEditingMovement(null);
        fetchMovements();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update movement');
      }
    } catch (error) {
      console.error('Error updating movement:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this movement?')) return;

    try {
      const response = await fetch(`/api/stock/movements/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMovements();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete movement');
      }
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('An error occurred');
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
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <PageLayout
      title="Stock Movements"
      subtitle={`${total} movements recorded`}
      backHref="/dashboard"
      showNav={false}
      actions={
        <div className="flex gap-2">
          <Link
            href="/stock/waste/new"
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-red-500/25"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Record Waste
          </Link>
          <Link
            href="/stock/transfers/new"
            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-orange-500/25"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            New Transfer
          </Link>
        </div>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {MOVEMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Store</label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Movements Table */}
      <Card padding={false}>
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading movements...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="No movements found"
              description={typeFilter || storeFilter || startDate || endDate ? 'Try adjusting your filters' : 'Stock movements will appear here'}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Store</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Source</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(movement.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getMovementBadgeVariant(movement.type)}>
                          {getMovementTypeLabel(movement.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{movement.item.name}</div>
                        <div className="text-xs text-gray-500">{movement.item.category?.name || 'No category'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {movement.store.name}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">
                        {movement.costPrice ? formatCurrency(movement.costPrice) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {movement.invoice ? (
                          <button
                            onClick={() => fetchMovementDetail(movement.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Invoice
                          </button>
                        ) : movement.referenceType === 'transfer' ? (
                          <span className="text-xs text-blue-600">Transfer</span>
                        ) : movement.referenceType === 'count' ? (
                          <span className="text-xs text-orange-600">Count</span>
                        ) : (
                          <span className="text-xs text-gray-400">Manual</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(movement)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {movement.referenceType === 'manual' && (
                            <button
                              onClick={() => handleDeleteMovement(movement.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100/50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Edit Modal */}
      {editingMovement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Movement</h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingMovement.item.name} - {getMovementTypeLabel(editingMovement.type)}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({editingMovement.item.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Cost (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.costPrice}
                  onChange={(e) => setEditForm({ ...editForm, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingMovement(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {detailMovement && detailMovement.invoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Invoice Details</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Movement source for {detailMovement.item.name}
                </p>
              </div>
              <button
                onClick={() => setDetailMovement(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
              {loadingDetail ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Invoice Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Invoice Number</div>
                      <div className="font-semibold text-gray-900">
                        {detailMovement.invoice.invoiceNumber || 'N/A'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Supplier</div>
                      <div className="font-semibold text-gray-900">
                        {detailMovement.invoice.supplierName || 'Unknown'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Invoice Date</div>
                      <div className="font-semibold text-gray-900">
                        {detailMovement.invoice.invoiceDate
                          ? new Date(detailMovement.invoice.invoiceDate).toLocaleDateString()
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                      <div className="font-semibold text-gray-900">
                        {detailMovement.invoice.totalAmount
                          ? formatCurrency(detailMovement.invoice.totalAmount)
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Movement Details */}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-sm font-semibold text-blue-900 mb-3">Movement Entry</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-blue-600/70">Item</div>
                        <div className="font-medium text-blue-900">{detailMovement.item.name}</div>
                      </div>
                      <div>
                        <div className="text-blue-600/70">Quantity</div>
                        <div className="font-medium text-blue-900">
                          {detailMovement.quantity > 0 ? '+' : ''}{detailMovement.quantity} {detailMovement.item.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-blue-600/70">Unit Cost</div>
                        <div className="font-medium text-blue-900">
                          {detailMovement.costPrice ? formatCurrency(detailMovement.costPrice) : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Link to Invoice */}
                  <div className="flex justify-center">
                    <Link
                      href={`/invoices/${detailMovement.invoice.id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg shadow-blue-500/25"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Full Invoice
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
