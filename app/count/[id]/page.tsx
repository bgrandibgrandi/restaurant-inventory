'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Item = {
  id: string;
  name: string;
  unit: string;
  category: { id: string; name: string } | null;
};

type Category = {
  id: string;
  name: string;
};

const COMMON_UNITS = ['kg', 'g', 'L', 'ml', 'units', 'boxes', 'bags', 'bottles', 'cans', 'packs'];

type StockEntry = {
  id: string;
  quantity: number;
  unitCost: number | null;
  currency: string;
  item: Item;
  createdAt: string;
};

type StockCount = {
  id: string;
  name: string;
  status: string;
  itemsCounted: number;
  totalValue: number | null;
  store: { id: string; name: string };
  user: { name: string | null; email: string };
  entries: StockEntry[];
  createdAt: string;
  completedAt: string | null;
};

export default function ActiveCountPage() {
  const router = useRouter();
  const params = useParams();
  const countId = params.id as string;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [count, setCount] = useState<StockCount | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quick entry state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showItemList, setShowItemList] = useState(true);

  // Edit mode
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  // Create item modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: '',
    categoryId: '',
  });

  useEffect(() => {
    fetchData();
  }, [countId]);

  const fetchData = async () => {
    try {
      const [countRes, itemsRes, categoriesRes] = await Promise.all([
        fetch(`/api/counts/${countId}`),
        fetch('/api/items'),
        fetch('/api/categories'),
      ]);

      if (!countRes.ok) {
        router.push('/count');
        return;
      }

      const [countData, itemsData, categoriesData] = await Promise.all([
        countRes.json(),
        itemsRes.json(),
        categoriesRes.json(),
      ]);

      setCount(countData);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addEntry = async () => {
    if (!selectedItem || !quantity) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/counts/${countId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_entry',
          itemId: selectedItem.id,
          quantity: parseFloat(quantity),
        }),
      });

      if (response.ok) {
        const newEntry = await response.json();
        setCount((prev) =>
          prev
            ? {
                ...prev,
                entries: [newEntry, ...prev.entries],
                itemsCounted: prev.itemsCounted + 1,
              }
            : null
        );
        // Reset for next entry
        setSelectedItem(null);
        setQuantity('');
        setSearchQuery('');
        setShowItemList(true);
        searchInputRef.current?.focus();
      }
    } catch (error) {
      console.error('Error adding entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateEntry = async (entryId: string) => {
    if (!editQuantity) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/counts/${countId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_entry',
          entryId,
          quantity: parseFloat(editQuantity),
        }),
      });

      if (response.ok) {
        const updatedEntry = await response.json();
        setCount((prev) =>
          prev
            ? {
                ...prev,
                entries: prev.entries.map((e) =>
                  e.id === entryId ? updatedEntry : e
                ),
              }
            : null
        );
        setEditingEntry(null);
        setEditQuantity('');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Remove this item from count?')) return;

    try {
      const response = await fetch(`/api/counts/${countId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_entry',
          entryId,
        }),
      });

      if (response.ok) {
        setCount((prev) =>
          prev
            ? {
                ...prev,
                entries: prev.entries.filter((e) => e.id !== entryId),
                itemsCounted: prev.itemsCounted - 1,
              }
            : null
        );
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const completeCount = async () => {
    if (!confirm('Complete this count? You can still view it afterwards.')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/counts/${countId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (response.ok) {
        router.push('/count');
      }
    } catch (error) {
      console.error('Error completing count:', error);
    } finally {
      setSaving(false);
    }
  };

  const selectItem = (item: Item) => {
    setSelectedItem(item);
    setShowItemList(false);
    setSearchQuery(item.name);
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
        selectItem(newItem);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading count...</p>
        </div>
      </div>
    );
  }

  if (!count) {
    return null;
  }

  const isCompleted = count.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/count" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">{count.store.name}</h1>
              <p className="text-xs text-gray-500">{count.itemsCounted} items counted</p>
            </div>
            {!isCompleted ? (
              <button
                onClick={completeCount}
                disabled={saving}
                className="text-green-600 font-medium text-sm"
              >
                Done
              </button>
            ) : (
              <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full">
                Completed
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Quick Entry Section - only show if not completed */}
      {!isCompleted && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-[57px] z-10">
          {/* Search */}
          <div className="relative mb-3">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowItemList(true);
                setSelectedItem(null);
              }}
              onFocus={() => setShowItemList(true)}
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                !selectedCategory
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Item selection dropdown */}
          {showItemList && searchQuery && !selectedItem && (
            <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto z-30">
              {filteredItems.length > 0 ? (
                filteredItems.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.unit} {item.category && `• ${item.category.name}`}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-4 text-center">
                  <p className="text-gray-500 mb-3">No items found for "{searchQuery}"</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create "{searchQuery}"
                  </button>
                </div>
              )}
              {/* Always show create new item option at bottom */}
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 border-t border-gray-200 flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium text-blue-600">Create new item</span>
              </button>
            </div>
          )}

          {/* Quantity entry - show when item is selected */}
          {selectedItem && (
            <div className="mt-3 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">{selectedItem.name}</div>
                  <div className="text-sm text-gray-500">{selectedItem.unit}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setSearchQuery('');
                    setShowItemList(true);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantity"
                  autoFocus
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-center"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && quantity) {
                      addEntry();
                    }
                  }}
                />
                <button
                  onClick={addEntry}
                  disabled={!quantity || saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 transition"
                >
                  {saving ? '...' : 'Add'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Counted Items List */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Counted Items ({count.entries.length})
        </h2>

        {count.entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No items counted yet</p>
            <p className="text-sm mt-1">Search for an item above to start</p>
          </div>
        ) : (
          <div className="space-y-2">
            {count.entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                {editingEntry === entry.id ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{entry.item.name}</div>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => updateEntry(entry.id)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingEntry(null);
                        setEditQuantity('');
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{entry.item.name}</div>
                      <div className="text-sm text-gray-500">
                        {entry.item.category?.name || 'Uncategorized'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {entry.quantity}
                        </div>
                        <div className="text-xs text-gray-500">{entry.item.unit}</div>
                      </div>
                      {!isCompleted && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingEntry(entry.id);
                              setEditQuantity(entry.quantity.toString());
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar for quick item selection */}
      {!isCompleted && !selectedItem && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-inset-bottom">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {items.slice(0, 7).map((item) => {
              const alreadyCounted = count.entries.some((e) => e.item.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${
                    alreadyCounted
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
            {/* Add new item button in quick actions */}
            <button
              onClick={handleOpenCreateModal}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-dashed border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>
        </div>
      )}

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
