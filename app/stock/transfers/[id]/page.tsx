'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Transfer {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
  createdBy: string | null;
  completedBy: string | null;
  fromStore: { id: string; name: string };
  toStore: { id: string; name: string };
  items: {
    id: string;
    quantity: number;
    item: { id: string; name: string; unit: string; costPrice: number | null };
  }[];
}

export default function TransferDetail() {
  const params = useParams();
  const router = useRouter();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTransfer();
  }, [params.id]);

  const fetchTransfer = async () => {
    try {
      const response = await fetch(`/api/transfers/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTransfer(data);
      } else {
        router.push('/stock/transfers');
      }
    } catch (error) {
      console.error('Error fetching transfer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    const messages: Record<string, string> = {
      complete: 'Mark this transfer as completed? Stock will be moved between stores.',
      cancel: 'Are you sure you want to cancel this transfer?',
      in_transit: 'Mark this transfer as in transit?',
    };

    if (!confirm(messages[action])) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/transfers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchTransfer();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update transfer');
      }
    } catch (error) {
      console.error('Error updating transfer:', error);
      alert('An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this transfer?')) return;

    setProcessing(true);
    try {
      const response = await fetch(`/api/transfers/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/stock/transfers');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete transfer');
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
      alert('An error occurred');
    } finally {
      setProcessing(false);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return null;
  }

  const totalValue = transfer.items.reduce(
    (sum, item) => sum + item.quantity * (item.item.costPrice || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/stock/transfers" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Transfer Details</h1>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transfer.status)}`}>
              {transfer.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Transfer Route */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transfer Route</h2>
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                  </svg>
                </div>
                <div className="font-medium text-gray-900">{transfer.fromStore.name}</div>
                <div className="text-sm text-gray-500">Source</div>
              </div>
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                  </svg>
                </div>
                <div className="font-medium text-gray-900">{transfer.toStore.name}</div>
                <div className="text-sm text-gray-500">Destination</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
            <div className="space-y-3">
              {transfer.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{item.item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.quantity} {item.item.unit}
                    </div>
                  </div>
                  {item.item.costPrice && (
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        €{(item.quantity * item.item.costPrice).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        @€{item.item.costPrice.toFixed(2)}/{item.item.unit}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {totalValue > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <span className="font-medium text-gray-900">Total Value</span>
                <span className="font-bold text-gray-900">€{totalValue.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-900">Created</div>
                  <div className="text-sm text-gray-500">{formatDate(transfer.createdAt)}</div>
                </div>
              </div>
              {transfer.completedAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-900">Completed</div>
                    <div className="text-sm text-gray-500">{formatDate(transfer.completedAt)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-600">{transfer.notes}</p>
            </div>
          )}

          {/* Actions */}
          {transfer.status === 'PENDING' && (
            <div className="flex gap-4">
              <button
                onClick={() => handleAction('complete')}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                Complete Transfer
              </button>
              <button
                onClick={() => handleAction('cancel')}
                disabled={processing}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
          {transfer.status === 'IN_TRANSIT' && (
            <button
              onClick={() => handleAction('complete')}
              disabled={processing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50"
            >
              Receive Transfer
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
