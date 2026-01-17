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

interface WasteReason {
  id: string;
  name: string;
  description: string | null;
}

export default function RecordWaste() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    storeId: '',
    itemId: '',
    quantity: '',
    wasteReasonId: '',
    notes: '',
  });

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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
      const [storesRes, itemsRes, reasonsRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/items'),
        fetch('/api/waste-reasons'),
      ]);

      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data);
        if (data.length === 1) {
          setFormData((prev) => ({ ...prev, storeId: data[0].id }));
        }
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
        setFilteredItems(data);
      }

      if (reasonsRes.ok) {
        const data = await reasonsRes.json();
        setWasteReasons(data.filter((r: WasteReason & { isActive?: boolean }) => r.isActive !== false));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setFormData((prev) => ({ ...prev, itemId: item.id }));
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeId || !formData.itemId || !formData.quantity || !formData.wasteReasonId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/stock/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: formData.storeId,
          itemId: formData.itemId,
          quantity: parseFloat(formData.quantity),
          wasteReasonId: formData.wasteReasonId,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to record waste');
      }
    } catch (error) {
      console.error('Error recording waste:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
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
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Record Waste</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
            <div>
              <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 mb-2">
                Store *
              </label>
              <select
                id="storeId"
                value={formData.storeId}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Item</h2>

            {selectedItem ? (
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <div className="font-medium text-gray-900">{selectedItem.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedItem.category?.name || 'No category'} • {selectedItem.unit}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setFormData((prev) => ({ ...prev, itemId: '' }));
                  }}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition"
                    >
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.category?.name || 'No category'} • {item.unit}
                      </div>
                    </button>
                  ))}
                  {filteredItems.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No items found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Waste Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Waste Details</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity {selectedItem && `(${selectedItem.unit})`} *
                </label>
                <input
                  type="number"
                  id="quantity"
                  step="0.01"
                  min="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter quantity wasted"
                  required
                />
              </div>

              <div>
                <label htmlFor="wasteReasonId" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  id="wasteReasonId"
                  value={formData.wasteReasonId}
                  onChange={(e) => setFormData({ ...formData, wasteReasonId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="">Select reason</option>
                  {wasteReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.name}
                    </option>
                  ))}
                </select>
                {formData.wasteReasonId && (
                  <p className="mt-1 text-sm text-gray-500">
                    {wasteReasons.find((r) => r.id === formData.wasteReasonId)?.description}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Optional notes about the waste..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || !selectedItem}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Recording...' : 'Record Waste'}
            </button>
            <Link
              href="/dashboard"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
