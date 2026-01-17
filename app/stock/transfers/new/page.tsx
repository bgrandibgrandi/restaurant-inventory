'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  unit: string;
  category: { name: string } | null;
}

interface TransferItem {
  itemId: string;
  item: Item;
  quantity: string;
}

export default function NewTransfer() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showItemPicker, setShowItemPicker] = useState(false);

  const [formData, setFormData] = useState({
    fromStoreId: '',
    toStoreId: '',
    notes: '',
  });

  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const fetchData = async () => {
    try {
      const [storesRes, itemsRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/items'),
      ]);

      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data);
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
        setFilteredItems(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (item: Item) => {
    if (transferItems.find((ti) => ti.itemId === item.id)) {
      alert('Item already added');
      return;
    }
    setTransferItems([...transferItems, { itemId: item.id, item, quantity: '1' }]);
    setShowItemPicker(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (itemId: string) => {
    setTransferItems(transferItems.filter((ti) => ti.itemId !== itemId));
  };

  const handleQuantityChange = (itemId: string, quantity: string) => {
    setTransferItems(
      transferItems.map((ti) => (ti.itemId === itemId ? { ...ti, quantity } : ti))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromStoreId || !formData.toStoreId) {
      alert('Please select both source and destination stores');
      return;
    }

    if (formData.fromStoreId === formData.toStoreId) {
      alert('Source and destination stores must be different');
      return;
    }

    if (transferItems.length === 0) {
      alert('Please add at least one item to transfer');
      return;
    }

    const invalidItems = transferItems.filter(
      (ti) => !ti.quantity || parseFloat(ti.quantity) <= 0
    );
    if (invalidItems.length > 0) {
      alert('All items must have a positive quantity');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStoreId: formData.fromStoreId,
          toStoreId: formData.toStoreId,
          notes: formData.notes || null,
          items: transferItems.map((ti) => ({
            itemId: ti.itemId,
            quantity: parseFloat(ti.quantity),
          })),
        }),
      });

      if (response.ok) {
        router.push('/stock/transfers');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create transfer');
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
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

  if (stores.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Link href="/stock/transfers" className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">New Transfer</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Multiple Stores Required</h3>
            <p className="text-gray-500 mb-6">You need at least 2 stores to create transfers between them.</p>
            <Link
              href="/stores"
              className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition"
            >
              Manage Stores
            </Link>
          </div>
        </main>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold text-gray-900">New Transfer</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transfer Route</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="fromStoreId" className="block text-sm font-medium text-gray-700 mb-2">
                  From Store *
                </label>
                <select
                  id="fromStoreId"
                  value={formData.fromStoreId}
                  onChange={(e) => setFormData({ ...formData, fromStoreId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id} disabled={store.id === formData.toStoreId}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="toStoreId" className="block text-sm font-medium text-gray-700 mb-2">
                  To Store *
                </label>
                <select
                  id="toStoreId"
                  value={formData.toStoreId}
                  onChange={(e) => setFormData({ ...formData, toStoreId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id} disabled={store.id === formData.fromStoreId}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Items to Transfer</h2>
              <button
                type="button"
                onClick={() => setShowItemPicker(true)}
                className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-sm font-medium transition"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>

            {transferItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet</p>
                <button
                  type="button"
                  onClick={() => setShowItemPicker(true)}
                  className="mt-2 text-orange-600 hover:underline"
                >
                  Add your first item
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {transferItems.map((ti) => (
                  <div
                    key={ti.itemId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{ti.item.name}</div>
                      <div className="text-sm text-gray-500">
                        {ti.item.category?.name || 'No category'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={ti.quantity}
                          onChange={(e) => handleQuantityChange(ti.itemId, e.target.value)}
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center"
                        />
                        <span className="text-sm text-gray-500">{ti.item.unit}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(ti.itemId)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Optional notes about this transfer..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || transferItems.length === 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Transfer'}
            </button>
            <Link
              href="/stock/transfers"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Item Picker Modal */}
        {showItemPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Add Item</h3>
                <button
                  onClick={() => {
                    setShowItemPicker(false);
                    setSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto max-h-[50vh]">
                {filteredItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No items found</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAddItem(item)}
                        disabled={transferItems.some((ti) => ti.itemId === item.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.category?.name || 'No category'} • {item.unit}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
