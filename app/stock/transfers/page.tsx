'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Transfer {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  fromStore: { id: string; name: string };
  toStore: { id: string; name: string };
  items: {
    id: string;
    quantity: number;
    item: { id: string; name: string; unit: string };
  }[];
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const response = await fetch(`/api/transfers?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransfers(data.transfers);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTransfer = async (id: string) => {
    if (!confirm('Mark this transfer as completed? Stock will be moved between stores.')) return;

    try {
      const response = await fetch(`/api/transfers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (response.ok) {
        fetchTransfers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to complete transfer');
      }
    } catch (error) {
      console.error('Error completing transfer:', error);
      alert('An error occurred');
    }
  };

  const handleCancelTransfer = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;

    try {
      const response = await fetch(`/api/transfers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (response.ok) {
        fetchTransfers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel transfer');
      }
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      alert('An error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_TRANSIT: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Stock Transfers</h1>
            </div>
            <Link
              href="/stock/transfers/new"
              className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Transfer
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {['', 'PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                statusFilter === status
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>

        {/* Transfers List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transfers found</h3>
              <p className="text-gray-500 mb-6">Create your first transfer to move stock between stores</p>
              <Link
                href="/stock/transfers/new"
                className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition"
              >
                Create Transfer
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}>
                          {transfer.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">{formatDate(transfer.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-lg font-medium text-gray-900 mb-3">
                        <span>{transfer.fromStore.name}</span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span>{transfer.toStore.name}</span>
                      </div>
                      <div className="space-y-1">
                        {transfer.items.map((item) => (
                          <div key={item.id} className="text-sm text-gray-600">
                            {item.item.name}: {item.quantity} {item.item.unit}
                          </div>
                        ))}
                      </div>
                      {transfer.notes && (
                        <p className="mt-2 text-sm text-gray-500">Note: {transfer.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {transfer.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleCompleteTransfer(transfer.id)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleCancelTransfer(transfer.id)}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {transfer.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => handleCompleteTransfer(transfer.id)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition"
                        >
                          Receive
                        </button>
                      )}
                      <Link
                        href={`/stock/transfers/${transfer.id}`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
