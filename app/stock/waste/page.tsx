'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  unit: string;
  costPrice: number | null;
}

interface WasteReason {
  id: string;
  name: string;
  description: string | null;
}

interface Store {
  id: string;
  name: string;
}

interface WasteEntry {
  itemId: string;
  quantity: number;
  reasonId: string;
  notes: string;
}

export default function WastePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [reasons, setReasons] = useState<WasteReason[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<WasteEntry[]>([
    { itemId: '', quantity: 0, reasonId: '', notes: '' },
  ]);
  const [success, setSuccess] = useState<{ count: number; totalValue: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, reasonsRes, storesRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/waste-reasons'),
        fetch('/api/stores'),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (reasonsRes.ok) setReasons(await reasonsRes.json());
      if (storesRes.ok) {
        const storeData = await storesRes.json();
        setStores(storeData);
        if (storeData.length > 0) setSelectedStore(storeData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    setEntries([...entries, { itemId: '', quantity: 0, reasonId: '', notes: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof WasteEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSubmit = async () => {
    const validEntries = entries.filter((e) => e.itemId && e.quantity > 0);

    if (validEntries.length === 0) {
      alert('Please add at least one item with quantity');
      return;
    }

    if (!selectedStore) {
      alert('Please select a store');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/stock/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
          items: validEntries,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess({ count: data.count, totalValue: data.totalValue });
        setEntries([{ itemId: '', quantity: 0, reasonId: '', notes: '' }]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to record waste');
      }
    } catch (error) {
      console.error('Error recording waste:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getItemCost = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    return item?.costPrice || 0;
  };

  const getTotalWasteValue = () => {
    return entries.reduce((sum, entry) => {
      return sum + entry.quantity * getItemCost(entry.itemId);
    }, 0);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">Record Waste</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Waste Recorded</h2>
            <p className="text-gray-600 mb-4">
              {success.count} item(s) recorded with total value of €{success.totalValue.toFixed(2)}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setSuccess(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Record More Waste
              </button>
              <Link
                href="/reports/waste"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                View Waste Report
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Record Waste</h1>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Waste Value</div>
              <div className="text-lg font-semibold text-red-600">€{getTotalWasteValue().toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Store</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Waste Entries */}
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-500">Item #{index + 1}</span>
                {entries.length > 1 && (
                  <button
                    onClick={() => removeEntry(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Item Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                  <select
                    value={entry.itemId}
                    onChange={(e) => updateEntry(index, 'itemId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.quantity || ''}
                      onChange={(e) => updateEntry(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                    {entry.itemId && (
                      <span className="text-sm text-gray-500">
                        {items.find((i) => i.id === entry.itemId)?.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <select
                    value={entry.reasonId}
                    onChange={(e) => updateEntry(index, 'reasonId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select reason...</option>
                    {reasons.map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional details..."
                  />
                </div>
              </div>

              {/* Cost Preview */}
              {entry.itemId && entry.quantity > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-right">
                  <span className="text-sm text-gray-500">Cost: </span>
                  <span className="text-sm font-medium text-red-600">
                    €{(entry.quantity * getItemCost(entry.itemId)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add More Button */}
        <button
          onClick={addEntry}
          className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Item
        </button>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || entries.every((e) => !e.itemId || e.quantity <= 0)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Recording...' : 'Record Waste'}
          </button>
        </div>
      </main>
    </div>
  );
}
