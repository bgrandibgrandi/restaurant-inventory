'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import PageLayout, { Card, LinkButton, Badge, EmptyState } from '@/components/ui/PageLayout';
import { CategorySelector } from '@/components/CategorySelector';
import { DuplicateReviewModal } from '@/components/DuplicateReviewModal';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  level: number;
  parentId: string | null;
  children?: Category[];
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
  needsReview?: boolean;
}

interface DuplicateSummary {
  pendingDuplicates: number;
  totalItems: number;
  itemsNeedingReview: number;
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterReview, setFilterReview] = useState(false);

  // Duplicate summary
  const [duplicateSummary, setDuplicateSummary] = useState<DuplicateSummary | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (editingItemId && editingField && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editingItemId, editingField]);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, suppliersRes, duplicatesRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/categories?flat=true'),
        fetch('/api/suppliers'),
        fetch('/api/items/scan-duplicates'),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      if (duplicatesRes.ok) setDuplicateSummary(await duplicatesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanDuplicates = async () => {
    setScanning(true);
    try {
      const response = await fetch('/api/items/scan-duplicates', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        // Refresh data
        fetchData();
      }
    } catch (error) {
      console.error('Error scanning duplicates:', error);
    } finally {
      setScanning(false);
    }
  };

  const uniqueUnits = useMemo(() => {
    return [...new Set(items.map((item) => item.unit))].sort();
  }, [items]);

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
      const matchesReview = !filterReview || item.needsReview === true;

      return matchesSearch && matchesCategory && matchesSupplier && matchesUnit && matchesReview;
    });
  }, [items, searchQuery, filterCategory, filterSupplier, filterUnit, filterReview]);

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
  };

  const saveEditing = async () => {
    if (!editingItemId || !editingField) return;
    await saveEditingWithValue(editValue);
  };

  const saveEditingWithValue = async (value: string) => {
    if (!editingItemId || !editingField) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};

      switch (editingField) {
        case 'name':
          updateData.name = value;
          break;
        case 'category':
          updateData.categoryId = value || null;
          break;
        case 'supplier':
          updateData.supplierId = value || null;
          break;
        case 'unit':
          updateData.unit = value;
          break;
        case 'cost':
          updateData.costPrice = value ? parseFloat(value) : null;
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

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterSupplier('');
    setFilterUnit('');
    setFilterReview(false);
  };

  const hasFilters = searchQuery || filterCategory || filterSupplier || filterUnit || filterReview;

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
        className={`cursor-pointer hover:bg-blue-50/50 rounded-lg px-2 py-1 -mx-2 transition ${className || ''}`}
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
            className="w-full px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
          />
        );

      case 'category':
        return (
          <div className="min-w-[300px]">
            <CategorySelector
              value={editValue || null}
              onChange={(categoryId) => {
                setEditValue(categoryId || '');
                // Auto-save after selection
                setTimeout(() => {
                  if (editingItemId && editingField === 'category') {
                    saveEditingWithValue(categoryId || '');
                  }
                }, 100);
              }}
              placeholder="Sin categoría"
            />
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
            className="w-full px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
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
            className="w-28 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
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
              className="w-24 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const headerActions = (
    <div className="flex gap-2">
      <button
        onClick={handleScanDuplicates}
        disabled={scanning}
        className="inline-flex items-center px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-medium rounded-xl transition disabled:opacity-50"
      >
        {scanning ? (
          <>
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-1.5"></div>
            Escaneando...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar duplicados
          </>
        )}
      </button>
      <LinkButton href="/items/new" variant="primary" size="sm">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Item
      </LinkButton>
    </div>
  );

  return (
    <PageLayout title="Inventory Items" subtitle="Manage your inventory items" backHref="/dashboard" actions={headerActions}>
      {/* Duplicate alert banner */}
      {duplicateSummary && duplicateSummary.pendingDuplicates > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200/50 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-orange-700">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p><strong>{duplicateSummary.pendingDuplicates} posible(s) duplicado(s)</strong> encontrados. Revisa los items marcados para fusionarlos o descartarlos.</p>
            </div>
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
            >
              Revisar duplicados
            </button>
          </div>
        </Card>
      )}

      {/* Info banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50 mb-6">
        <div className="flex items-center gap-3 text-sm text-blue-700">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p><strong>Tip:</strong> Double-click any cell to edit it directly. Press Enter to save or Escape to cancel.</p>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, description, SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="w-56">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="">All Categories</option>
              <option value="none">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.level === 0 ? (cat.icon ? `${cat.icon} ` : '') + cat.name.toUpperCase() :
                   cat.level === 1 ? `  └ ${cat.icon ? cat.icon + ' ' : ''}${cat.name}` :
                   `      └ ${cat.icon ? cat.icon + ' ' : ''}${cat.name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier filter */}
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Supplier</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Unit</label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="">All Units</option>
              {uniqueUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          {/* Review filter */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-white/80 border border-gray-200/50 rounded-xl cursor-pointer hover:bg-orange-50 transition">
              <input
                type="checkbox"
                checked={filterReview}
                onChange={(e) => setFilterReview(e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">Pendientes de revisión</span>
              {duplicateSummary && duplicateSummary.itemsNeedingReview > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                  {duplicateSummary.itemsNeedingReview}
                </span>
              )}
            </label>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 rounded-xl transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-100/50 text-sm text-gray-500">
          Showing <span className="font-medium text-gray-700">{filteredItems.length}</span> of <span className="font-medium text-gray-700">{items.length}</span> items
        </div>
      </Card>

      {/* Items Table */}
      <Card padding={false}>
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              title={hasFilters ? 'No items match your filters' : 'No items yet'}
              description={hasFilters ? 'Try adjusting your filters to find what you\'re looking for' : 'Create your first item to get started tracking inventory'}
              action={
                !hasFilters && (
                  <LinkButton href="/items/new" variant="primary">
                    Create First Item
                  </LinkButton>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-100/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    {/* Name */}
                    <td className="px-6 py-4">
                      {renderEditableCell(
                        item,
                        'name',
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                            {item.needsReview && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                                Revisar
                              </span>
                            )}
                          </div>
                          {item.sku && (
                            <div className="text-xs text-gray-400 mt-0.5">SKU: {item.sku}</div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      {renderEditableCell(
                        item,
                        'category',
                        <Badge variant={item.category ? 'info' : 'default'}>
                          {item.category?.name || 'None'}
                        </Badge>
                      )}
                    </td>

                    {/* Supplier */}
                    <td className="px-6 py-4">
                      {renderEditableCell(
                        item,
                        'supplier',
                        <Badge variant={item.supplier ? 'default' : 'default'}>
                          {item.supplier?.name || 'None'}
                        </Badge>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="px-6 py-4">
                      {renderEditableCell(
                        item,
                        'unit',
                        <span className="text-sm text-gray-600">{item.unit}</span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-6 py-4">
                      {renderEditableCell(
                        item,
                        'cost',
                        <span className="text-sm font-medium text-gray-700">
                          {item.costPrice ? `€${item.costPrice.toFixed(2)}` : '-'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/items/${item.id}/edit`}
                          className="px-3 py-1.5 bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 text-sm font-medium rounded-lg transition"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition"
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
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Item?</h3>
            <p className="text-gray-600 text-center mb-6">
              This will also delete all associated stock entries. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition shadow-lg shadow-red-500/25"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Review Modal */}
      <DuplicateReviewModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onResolved={() => {
          fetchData();
        }}
      />
    </PageLayout>
  );
}
