'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogoWithText } from '@/components/Logo';

type Item = {
  id: string;
  name: string;
  unit: string;
  category: { name: string } | null;
};

type Category = {
  id: string;
  name: string;
};

type Store = {
  id: string;
  name: string;
};

export default function NewStock() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [formData, setFormData] = useState({
    itemId: '',
    newItemName: '',
    newItemUnit: 'kg',
    categoryId: '',
    newCategoryName: '',
    storeId: '',
    quantity: '',
    unitCost: '',
    currency: 'EUR',
    notes: '',
  });

  const [mode, setMode] = useState<'select' | 'create'>('select');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, storesRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/categories'),
        fetch('/api/stores'),
      ]);

      const [itemsData, categoriesData, storesData] = await Promise.all([
        itemsRes.json(),
        categoriesRes.json(),
        storesRes.json(),
      ]);

      setItems(itemsData);
      setCategories(categoriesData);
      setStores(storesData);

      // Set default store if available
      if (typeof window !== 'undefined') {
        const currentStore = localStorage.getItem('currentStore');
        if (currentStore) {
          const store = JSON.parse(currentStore);
          setFormData((prev) => ({ ...prev, storeId: store.id }));
        } else if (storesData.length > 0) {
          setFormData((prev) => ({ ...prev, storeId: storesData[0].id }));
        }
      } else if (storesData.length > 0) {
        setFormData((prev) => ({ ...prev, storeId: storesData[0].id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get accountId from the selected store
      const storeRes = await fetch(`/api/stores/${formData.storeId}`);
      if (!storeRes.ok) {
        alert('Failed to get store information');
        return;
      }
      const store = await storeRes.json();
      const accountId = store.accountId;

      let itemId = formData.itemId;

      // Create new item if in create mode
      if (mode === 'create') {
        // Create category first if needed
        let categoryId = formData.categoryId;
        if (formData.newCategoryName) {
          const catRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.newCategoryName,
              accountId: accountId,
            }),
          });
          const newCategory = await catRes.json();
          categoryId = newCategory.id;
        }

        // Create item
        const itemRes = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newItemName,
            unit: formData.newItemUnit,
            categoryId: categoryId || null,
            accountId: accountId,
          }),
        });
        const newItem = await itemRes.json();
        itemId = newItem.id;
      }

      // Create stock entry
      const stockRes = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          storeId: formData.storeId,
          quantity: parseFloat(formData.quantity),
          unitCost: formData.unitCost ? parseFloat(formData.unitCost) : null,
          currency: formData.currency,
          notes: formData.notes || null,
          accountId: accountId,
        }),
      });

      if (stockRes.ok) {
        router.push('/dashboard');
      } else {
        const errorData = await stockRes.json();
        alert(`Failed to add stock: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find((i) => i.id === formData.itemId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard">
              <LogoWithText size="md" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Add Stock Entry
          </h1>
          <p className="text-gray-600 mb-8">
            Add inventory to your stock. Cost is optional.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Selection Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Item
              </label>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition ${
                    mode === 'select'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setMode('create')}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition ${
                    mode === 'create'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Create New
                </button>
              </div>

              {mode === 'select' ? (
                <select
                  required
                  value={formData.itemId}
                  onChange={(e) =>
                    setFormData({ ...formData, itemId: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an item...</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                      {item.category ? ` - ${item.category.name}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    value={formData.newItemName}
                    onChange={(e) =>
                      setFormData({ ...formData, newItemName: e.target.value })
                    }
                    placeholder="Item name (e.g., Chicken Breast)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={formData.newItemUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, newItemUnit: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="L">Liters (L)</option>
                    <option value="mL">Milliliters (mL)</option>
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                    <option value="cases">Cases</option>
                    <option value="bottles">Bottles</option>
                  </select>

                  {/* Category for new item */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category (optional)
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    >
                      <option value="">Choose or create new...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={formData.newCategoryName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newCategoryName: e.target.value,
                        })
                      }
                      placeholder="Or type new category name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue *
              </label>
              <select
                required
                value={formData.storeId}
                onChange={(e) =>
                  setFormData({ ...formData, storeId: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select venue...</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <div className="relative">
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="50"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedItem && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    {selectedItem.unit}
                  </div>
                )}
              </div>
            </div>

            {/* Unit Cost - Optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Cost{' '}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost}
                  onChange={(e) =>
                    setFormData({ ...formData, unitCost: e.target.value })
                  }
                  placeholder="4.50"
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="DKK">DKK (kr)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              {formData.quantity && formData.unitCost && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">
                    Total Value
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formData.currency}{' '}
                    {(
                      parseFloat(formData.quantity) *
                      parseFloat(formData.unitCost)
                    ).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes{' '}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Stock Entry'}
              </button>
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl text-center transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
