'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Item = {
  id: string;
  name: string;
  unit: string;
  sku?: string | null;
  barcode?: string | null;
  costPrice?: number | null;
  category: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
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
  notes: string | null;
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

type SortField = 'name' | 'category' | 'supplier' | 'quantity' | 'unitCost' | 'totalValue' | 'createdAt';
type SortDirection = 'asc' | 'desc';

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

  // View mode
  const [viewMode, setViewMode] = useState<'entry' | 'sheet'>('entry');

  // Quick entry state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('');
  const [showItemList, setShowItemList] = useState(true);

  // Sheet view filters and sorting
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetCategoryFilter, setSheetCategoryFilter] = useState<string>('');
  const [sheetSupplierFilter, setSheetSupplierFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  // Get unique suppliers from entries
  const suppliers = useMemo(() => {
    if (!count) return [];
    const supplierMap = new Map<string, { id: string; name: string }>();
    count.entries.forEach(entry => {
      if (entry.item.supplier) {
        supplierMap.set(entry.item.supplier.id, entry.item.supplier);
      }
    });
    return Array.from(supplierMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [count]);

  // Filtered and sorted entries for sheet view
  const filteredEntries = useMemo(() => {
    if (!count) return [];

    let entries = [...count.entries];

    // Apply filters
    if (sheetSearch) {
      const search = sheetSearch.toLowerCase();
      entries = entries.filter(e =>
        e.item.name.toLowerCase().includes(search) ||
        e.item.sku?.toLowerCase().includes(search) ||
        e.item.barcode?.toLowerCase().includes(search)
      );
    }

    if (sheetCategoryFilter) {
      entries = entries.filter(e => e.item.category?.id === sheetCategoryFilter);
    }

    if (sheetSupplierFilter) {
      entries = entries.filter(e => e.item.supplier?.id === sheetSupplierFilter);
    }

    // Apply sorting
    entries.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.item.name.localeCompare(b.item.name);
          break;
        case 'category':
          comparison = (a.item.category?.name || '').localeCompare(b.item.category?.name || '');
          break;
        case 'supplier':
          comparison = (a.item.supplier?.name || '').localeCompare(b.item.supplier?.name || '');
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'unitCost':
          comparison = (a.unitCost || a.item.costPrice || 0) - (b.unitCost || b.item.costPrice || 0);
          break;
        case 'totalValue':
          const aValue = a.quantity * (a.unitCost || a.item.costPrice || 0);
          const bValue = b.quantity * (b.unitCost || b.item.costPrice || 0);
          comparison = aValue - bValue;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return entries;
  }, [count, sheetSearch, sheetCategoryFilter, sheetSupplierFilter, sortField, sortDirection]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!count) return null;

    const entries = count.entries;
    const totalItems = entries.length;
    const totalQuantity = entries.reduce((sum, e) => sum + e.quantity, 0);
    const totalValue = entries.reduce((sum, e) => {
      const cost = e.unitCost || e.item.costPrice || 0;
      return sum + (e.quantity * cost);
    }, 0);

    // By category
    const byCategory: Record<string, { count: number; value: number }> = {};
    entries.forEach(e => {
      const cat = e.item.category?.name || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0 };
      byCategory[cat].count++;
      byCategory[cat].value += e.quantity * (e.unitCost || e.item.costPrice || 0);
    });

    // By supplier
    const bySupplier: Record<string, { count: number; value: number }> = {};
    entries.forEach(e => {
      const sup = e.item.supplier?.name || 'No Supplier';
      if (!bySupplier[sup]) bySupplier[sup] = { count: 0, value: 0 };
      bySupplier[sup].count++;
      bySupplier[sup].value += e.quantity * (e.unitCost || e.item.costPrice || 0);
    });

    // Items with no cost
    const noCostItems = entries.filter(e => !e.unitCost && !e.item.costPrice).length;

    return {
      totalItems,
      totalQuantity,
      totalValue,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value),
      bySupplier: Object.entries(bySupplier).sort((a, b) => b[1].value - a[1].value),
      noCostItems,
    };
  }, [count]);

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
          supplier: createdItem.supplier || null,
          costPrice: createdItem.costPrice,
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const exportToCSV = () => {
    if (!count) return;

    const headers = ['Item Name', 'SKU', 'Barcode', 'Category', 'Supplier', 'Quantity', 'Unit', 'Unit Cost', 'Total Value', 'Notes', 'Counted At'];
    const rows = filteredEntries.map(e => [
      e.item.name,
      e.item.sku || '',
      e.item.barcode || '',
      e.item.category?.name || '',
      e.item.supplier?.name || '',
      e.quantity,
      e.item.unit,
      e.unitCost || e.item.costPrice || '',
      (e.quantity * (e.unitCost || e.item.costPrice || 0)).toFixed(2),
      e.notes || '',
      new Date(e.createdAt).toLocaleString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stock-count-${count.store.name}-${new Date(count.createdAt).toISOString().split('T')[0]}.csv`;
    link.click();
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
              <p className="text-xs text-gray-500">{count.itemsCounted} items • {new Date(count.createdAt).toLocaleDateString()}</p>
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

          {/* View Mode Toggle */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setViewMode('entry')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                viewMode === 'entry'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Entry Mode
            </button>
            <button
              onClick={() => setViewMode('sheet')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                viewMode === 'sheet'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sheet View
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'entry' ? (
        <>
          {/* Quick Entry Section - only show if not completed */}
          {!isCompleted && (
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-[105px] z-10">
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
                      <p className="text-gray-500 mb-3">No items found for &quot;{searchQuery}&quot;</p>
                      <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create &quot;{searchQuery}&quot;
                      </button>
                    </div>
                  )}
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
                            {entry.item.supplier && ` • ${entry.item.supplier.name}`}
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
        </>
      ) : (
        /* Sheet View */
        <div className="px-4 py-4">
          {/* Analytics Summary */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold text-blue-600">{analytics.totalItems}</div>
                <div className="text-sm text-gray-500">Items Counted</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalValue)}</div>
                <div className="text-sm text-gray-500">Total Value</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold text-purple-600">{analytics.byCategory.length}</div>
                <div className="text-sm text-gray-500">Categories</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold text-orange-600">{analytics.noCostItems}</div>
                <div className="text-sm text-gray-500">Missing Cost</div>
              </div>
            </div>
          )}

          {/* Filters and Export */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <div className="flex flex-wrap gap-3 mb-3">
              <input
                type="text"
                value={sheetSearch}
                onChange={(e) => setSheetSearch(e.target.value)}
                placeholder="Search items..."
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={sheetCategoryFilter}
                onChange={(e) => setSheetCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={sheetSupplierFilter}
                onChange={(e) => setSheetSupplierFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Showing {filteredEntries.length} of {count.entries.length} entries
            </div>
          </div>

          {/* Spreadsheet Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th
                      className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Item Name
                        {sortField === 'name' && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Category
                        {sortField === 'category' && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('supplier')}
                    >
                      <div className="flex items-center gap-1">
                        Supplier
                        {sortField === 'supplier' && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Quantity
                        {sortField === 'quantity' && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Unit</th>
                    <th
                      className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('unitCost')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Unit Cost
                        {sortField === 'unitCost' && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalValue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Total Value
                        {sortField === 'totalValue' && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    {!isCompleted && <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => {
                    const unitCost = entry.unitCost || entry.item.costPrice || 0;
                    const totalValue = entry.quantity * unitCost;

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{entry.item.name}</div>
                          {(entry.item.sku || entry.item.barcode) && (
                            <div className="text-xs text-gray-400">
                              {entry.item.sku && `SKU: ${entry.item.sku}`}
                              {entry.item.sku && entry.item.barcode && ' • '}
                              {entry.item.barcode && `Barcode: ${entry.item.barcode}`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {entry.item.category?.name || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {entry.item.supplier?.name || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {editingEntry === entry.id ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateEntry(entry.id);
                                if (e.key === 'Escape') {
                                  setEditingEntry(null);
                                  setEditQuantity('');
                                }
                              }}
                            />
                          ) : (
                            entry.quantity
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{entry.item.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {unitCost > 0 ? formatCurrency(unitCost) : <span className="text-orange-500">No cost</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {unitCost > 0 ? formatCurrency(totalValue) : '-'}
                        </td>
                        {!isCompleted && (
                          <td className="px-4 py-3 text-center">
                            {editingEntry === entry.id ? (
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() => updateEntry(entry.id)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingEntry(null);
                                    setEditQuantity('');
                                  }}
                                  className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingEntry(entry.id);
                                    setEditQuantity(entry.quantity.toString());
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {filteredEntries.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-4 py-3 text-gray-700">Total</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {filteredEntries.reduce((sum, e) => sum + e.quantity, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatCurrency(filteredEntries.reduce((sum, e) => {
                          const cost = e.unitCost || e.item.costPrice || 0;
                          return sum + (e.quantity * cost);
                        }, 0))}
                      </td>
                      {!isCompleted && <td className="px-4 py-3"></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>No items match your filters</p>
              </div>
            )}
          </div>

          {/* Category & Supplier Breakdown */}
          {analytics && (
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {/* By Category */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Value by Category</h3>
                <div className="space-y-2">
                  {analytics.byCategory.slice(0, 8).map(([category, data]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{category}</span>
                        <span className="text-xs text-gray-400">({data.count} items)</span>
                      </div>
                      <span className="font-medium text-gray-900">{formatCurrency(data.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Supplier */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Value by Supplier</h3>
                <div className="space-y-2">
                  {analytics.bySupplier.slice(0, 8).map(([supplier, data]) => (
                    <div key={supplier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{supplier}</span>
                        <span className="text-xs text-gray-400">({data.count} items)</span>
                      </div>
                      <span className="font-medium text-gray-900">{formatCurrency(data.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
