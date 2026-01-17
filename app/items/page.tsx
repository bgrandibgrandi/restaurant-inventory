'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

type EditingField = 'name' | 'category' | 'supplier' | 'unit' | 'cost' | null;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Double-click editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // New category creation
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Focus input when editing starts
    if (editingItemId && editingField && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editingItemId, editingField]);

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

  const startEditing = (item: Item, field: EditingField) => {
    setEditingItemId(item.id);
    setEditingField(field);

    switch (field) {
      case 'name':
        setEditValue(item.name);
        break;
      case 'category':
        setEditValue(item.categoryId || '');
        break;
      case 'supplier':
        setEditValue(item.supplierId || '');
        break;
      case 'unit':
        setEditValue(item.unit);
        break;
      case 'cost':
        setEditValue(item.costPrice?.toString() || '');
        break;
    }
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingField(null);
    setEditValue('');
    setShowNewCategory(false);
    setNewCategoryName('');
  };

  const saveEditing = async () => {
    if (!editingItemId || !editingField) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};

      switch (editingField) {
        case 'name':
          updateData.name = editValue;
          break;
        case 'category':
          updateData.categoryId = editValue || null;
          break;
        case 'supplier':
          updateData.supplierId = editValue || null;
          break;
        case 'unit':
          updateData.unit = editValue;
          break;
        case 'cost':
          updateData.costPrice = editValue ? parseFloat(editValue) : null;
          break;
      }

      const response = await fetch(`/api/items/${editingItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map((item) => (item.id === editingItemId ? updatedItem : item)));
        cancelEditing();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories([...categories, newCategory]);
        setEditValue(newCategory.id);
        setShowNewCategory(false);
        setNewCategoryName('');
      } else {
        alert('Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('An error occurred');
    } finally {
      setCreatingCategory(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterSupplier('');
    setFilterUnit('');
  };

  const hasFilters = searchQuery || filterCategory || filterSupplier || filterUnit;

  const renderEditableCell = (
    item: Item,
    field: EditingField,
    content: React.ReactNode,
    className?: string
  ) => {
    const isEditing = editingItemId === item.id && editingField === field;

    if (isEditing) {
      return renderEditInput(item, field);
    }

    return (
      <div
        onDoubleClick={() => startEditing(item, field)}
        className={`cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 -mx-1 transition ${className || ''}`}
        title="Double-click to edit"
      >
        {content}
      </div>
    );
  };

  const renderEditInput = (item: Item, field: EditingField) => {
    switch (field) {
      case 'name':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEditing}
            disabled={saving}
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        );

      case 'category':
        return (
          <div className="space-y-1">
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewCategory(true);
                } else {
                  setEditValue(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => !showNewCategory && saveEditing()}
              disabled={saving}
              className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">No Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value="__new__">+ Add New Category</option>
            </select>
            {showNewCategory && (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      createNewCategory();
                    } else if (e.key === 'Escape') {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                    }
                  }}
                  placeholder="Category name..."
                  autoFocus
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={createNewCategory}
                  disabled={creatingCategory || !newCategoryName.trim()}
                  className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                >
                  {creatingCategory ? '...' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        );

      case 'supplier':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEditing}
            disabled={saving}
            className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">No Supplier</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.name}
              </option>
            ))}
          </select>
        );

      case 'unit':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveEditing}
            disabled={saving}
            className="w-24 px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        );

      case 'cost':
        return (
          <div className="flex items-center gap-1">
            <span className="text-gray-500">€</span>
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEditing}
              disabled={saving}
              className="w-20 px-2 py-1 border border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

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
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-700">
          <strong>Tip:</strong> Double-click any cell to edit it directly. Press Enter to save or Escape to cancel.
        </div>

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
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      {/* Name */}
                      <td className="px-4 py-3">
                        {renderEditableCell(
                          item,
                          'name',
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
                        {renderEditableCell(
                          item,
                          'category',
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
                        {renderEditableCell(
                          item,
                          'supplier',
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
                        {renderEditableCell(
                          item,
                          'unit',
                          <span className="text-sm text-gray-600">{item.unit}</span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3">
                        {renderEditableCell(
                          item,
                          'cost',
                          <span className="text-sm text-gray-600">
                            {item.costPrice ? `€${item.costPrice.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
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
                      </td>
                    </tr>
                  ))}
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
