'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  unit: string;
  category: { id: string; name: string } | null;
  isRecipe?: boolean;
}

interface WasteReason {
  id: string;
  name: string;
  description: string | null;
}

const COMMON_UNITS = ['kg', 'g', 'L', 'ml', 'units', 'boxes', 'bags', 'bottles', 'cans', 'packs'];

export default function RecordWaste() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wasteReasons, setWasteReasons] = useState<WasteReason[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Create item modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: '',
    categoryId: '',
  });

  const [formData, setFormData] = useState({
    storeId: '',
    itemId: '',
    quantity: '',
    wasteReasonId: '',
    notes: '',
    isRecipe: false,
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
      const [storesRes, itemsRes, recipesRes, reasonsRes, categoriesRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/items'),
        fetch('/api/recipes'),
        fetch('/api/waste-reasons'),
        fetch('/api/categories'),
      ]);

      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data);
        if (data.length === 1) {
          setFormData((prev) => ({ ...prev, storeId: data[0].id }));
        }
      }

      let allItems: Item[] = [];

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        allItems = data.map((item: Item) => ({ ...item, isRecipe: false }));
      }

      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        const recipeItems: Item[] = recipesData.map((recipe: { id: string; name: string; yieldUnit: string; category?: { id: string; name: string } | null }) => ({
          id: recipe.id,
          name: recipe.name,
          unit: recipe.yieldUnit || 'portions',
          category: recipe.category || null,
          isRecipe: true,
        }));
        allItems = [...allItems, ...recipeItems];
      }

      // Sort all items alphabetically
      allItems.sort((a, b) => a.name.localeCompare(b.name));
      setItems(allItems);
      setFilteredItems(allItems);

      if (reasonsRes.ok) {
        const data = await reasonsRes.json();
        setWasteReasons(data.filter((r: WasteReason & { isActive?: boolean }) => r.isActive !== false));
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setFormData((prev) => ({ ...prev, itemId: item.id, isRecipe: item.isRecipe || false }));
    setSearchQuery('');
  };

  const handleOpenCreateModal = () => {
    setNewItemData({
      name: searchQuery,
      unit: '',
      categoryId: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.name || !newItemData.unit) {
      alert('Name and unit are required');
      return;
    }

    setCreatingItem(true);
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemData.name,
          unit: newItemData.unit,
          categoryId: newItemData.categoryId || null,
        }),
      });

      if (response.ok) {
        const createdItem = await response.json();
        const newItem: Item = {
          id: createdItem.id,
          name: createdItem.name,
          unit: createdItem.unit,
          category: createdItem.category,
        };
        setItems((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        setFilteredItems((prev) => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
        handleSelectItem(newItem);
        setShowCreateModal(false);
        setNewItemData({ name: '', unit: '', categoryId: '' });
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create item');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      alert('An error occurred');
    } finally {
      setCreatingItem(false);
    }
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
          isRecipe: formData.isRecipe,
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
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {selectedItem.name}
                    {selectedItem.isRecipe && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        Recipe
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedItem.category?.name || 'No category'} • {selectedItem.unit}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    setFormData((prev) => ({ ...prev, itemId: '', isRecipe: false }));
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
                      key={`${item.isRecipe ? 'recipe' : 'item'}-${item.id}`}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition"
                    >
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {item.name}
                        {item.isRecipe && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            Recipe
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.category?.name || 'No category'} • {item.unit}
                      </div>
                    </button>
                  ))}
                  {filteredItems.length === 0 && searchQuery && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-3">No items found for "{searchQuery}"</p>
                      <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create "{searchQuery}"
                      </button>
                    </div>
                  )}
                  {filteredItems.length === 0 && !searchQuery && (
                    <p className="text-center text-gray-500 py-4">Start typing to search items</p>
                  )}
                </div>
                {/* Always show create new item button */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="w-full text-left p-3 rounded-lg border border-dashed border-gray-300 hover:border-red-400 hover:bg-red-50 transition flex items-center gap-2"
                  >
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium text-gray-700">Create new item</span>
                  </button>
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

      {/* Create Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New Item</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="p-6 space-y-4">
              <div>
                <label htmlFor="newItemName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="newItemName"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Item name"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="newItemUnit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <div className="flex gap-2">
                  <select
                    id="newItemUnit"
                    value={newItemData.unit}
                    onChange={(e) => setNewItemData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select unit</option>
                    {COMMON_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {COMMON_UNITS.slice(0, 5).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setNewItemData((prev) => ({ ...prev, unit }))}
                      className={`px-2 py-1 text-xs rounded-full border transition ${
                        newItemData.unit === unit
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-red-300'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="newItemCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="newItemCategory"
                  value={newItemData.categoryId}
                  onChange={(e) => setNewItemData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creatingItem || !newItemData.name || !newItemData.unit}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingItem ? 'Creating...' : 'Create Item'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
