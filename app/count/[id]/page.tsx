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
            <div className="absolute left-4 right-4 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-30">
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
                <div className="px-4 py-3 text-gray-500 text-center">No items found</div>
              )}
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
            {items.slice(0, 8).map((item) => {
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
          </div>
        </div>
      )}
    </div>
  );
}
