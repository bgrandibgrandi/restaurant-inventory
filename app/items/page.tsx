'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  category: Category | null;
  categoryId: string | null;
  supplier: Supplier | null;
  supplierId: string | null;
  unit: string;
  description: string | null;
  sku: string | null;
  costPrice: number | null;
  createdAt: string;
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Item>>({});
  const [saving, setSaving] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, suppliersRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/categories'),
        fetch('/api/suppliers'),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique units for filter
  const uniqueUnits = useMemo(() => {
    return [...new Set(items.map((item) => item.unit))].sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !filterCategory ||
        (filterCategory === 'none' && !item.categoryId) ||
        item.categoryId === filterCategory;

      const matchesSupplier =
        !filterSupplier ||
        (filterSupplier === 'none' && !item.supplierId) ||
        item.supplierId === filterSupplier;

      const matchesUnit = !filterUnit || item.unit === filterUnit;

      return matchesSearch && matchesCategory && matchesSupplier && matchesUnit;
    });
  }, [items, searchQuery, filterCategory, filterSupplier, filterUnit]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setItems(items.filter((item) => item.id !== id));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('An error occurred');
    }
  };

  const startEditing = (item: Item) => {
    setEditingId(item.id);
    setEditData({
      name: item.name,
      categoryId: item.categoryId,
      supplierId: item.supplierId,
      unit: item.unit,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEditing = async () => {
    if (!editingId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/items/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map((item) => (item.id === editingId ? updatedItem : item)));
        setEditingId(null);
        setEditData({});
      } else {
        alert('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterSupplier('');
    setFilterUnit('');
  };

  const hasFilters = searchQuery || filterCategory || filterSupplier || filterUnit;

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
              <h1 className="text-xl font-semibold text-gray-900">Manage Items</h1>
            </div>
            <Link
              href="/items/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Item
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, description, SKU..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category filter */}
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="none">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier filter */}
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Suppliers</option>
                <option value="none">No Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit filter */}
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Units</option>
                {uniqueUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-500">
            Showing {filteredItems.length} of {items.length} items
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading items...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasFilters ? 'No items match your filters' : 'No items yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {hasFilters ? 'Try adjusting your filters' : 'Create your first item to get started'}
              </p>
              {!hasFilters && (
                <Link
                  href="/items/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Create First Item
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((item) => {
                    const isEditing = editingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50 transition'}
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.name || ''}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              {item.sku && (
                                <div className="text-xs text-gray-400">SKU: {item.sku}</div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={editData.categoryId || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, categoryId: e.target.value || null })
                              }
                              className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">No Category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.category
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {item.category?.name || 'None'}
                            </span>
                          )}
                        </td>

                        {/* Supplier */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={editData.supplierId || ''}
                              onChange={(e) =>
                                setEditData({ ...editData, supplierId: e.target.value || null })
                              }
                              className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">No Supplier</option>
                              {suppliers.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                  {sup.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.supplier
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {item.supplier?.name || 'None'}
                            </span>
                          )}
                        </td>

                        {/* Unit */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <select
                              value={editData.unit || ''}
                              onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                              className="w-24 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="L">L</option>
                              <option value="mL">mL</option>
                              <option value="pieces">pieces</option>
                              <option value="boxes">boxes</option>
                              <option value="cases">cases</option>
                              <option value="bottles">bottles</option>
                              <option value="cans">cans</option>
                              <option value="packs">packs</option>
                            </select>
                          ) : (
                            <span className="text-sm text-gray-600">{item.unit}</span>
                          )}
                        </td>

                        {/* Cost */}
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.costPrice ? `€${item.costPrice.toFixed(2)}` : '-'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={saveEditing}
                                disabled={saving}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition disabled:opacity-50"
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditing(item)}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition"
                              >
                                Edit
                              </button>
                              <Link
                                href={`/items/${item.id}/edit`}
                                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition"
                              >
                                Full Edit
                              </Link>
                              <button
                                onClick={() => setDeleteConfirm(item.id)}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded transition"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Item?</h3>
            <p className="text-gray-600 mb-6">
              This will also delete all associated stock entries. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
