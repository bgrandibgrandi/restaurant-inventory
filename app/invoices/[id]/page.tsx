'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Category = {
  id: string;
  name: string;
};

type Item = {
  id: string;
  name: string;
  unit: string;
};

type InvoiceItem = {
  id: string;
  rawName: string;
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  suggestedName: string | null;
  suggestedUnit: string | null;
  matchedItem: Item | null;
  matchedItemId: string | null;
  category: Category | null;
  categoryId: string | null;
  status: string;
};

type Invoice = {
  id: string;
  fileName: string | null;
  fileUrl: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  invoiceDate: string | null;
  status: string;
  totalAmount: number | null;
  currency: string;
  store: { id: string; name: string };
  items: InvoiceItem[];
  createdAt: string;
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [invoiceId]);

  const fetchData = async () => {
    try {
      const [invoiceRes, categoriesRes, itemsRes] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}`),
        fetch('/api/categories'),
        fetch('/api/items'),
      ]);

      if (!invoiceRes.ok) {
        router.push('/invoices');
        return;
      }

      const [invoiceData, categoriesData, itemsData] = await Promise.all([
        invoiceRes.json(),
        categoriesRes.json(),
        itemsRes.json(),
      ]);

      setInvoice(invoiceData);
      setCategories(categoriesData);
      setExistingItems(itemsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract' }),
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        setInvoice(updatedInvoice);
      } else {
        const error = await response.json();
        alert(`Extraction failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<InvoiceItem>) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_item',
          itemId,
          ...updates,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setInvoice((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((item) =>
                  item.id === itemId ? { ...item, ...updatedItem } : item
                ),
              }
            : null
        );
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleSkipItem = async (itemId: string) => {
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip_item',
          itemId,
        }),
      });

      setInvoice((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === itemId ? { ...item, status: 'skipped' } : item
              ),
            }
          : null
      );
    } catch (error) {
      console.error('Skip error:', error);
    }
  };

  const handleConfirmAll = async () => {
    if (!confirm('Create items and add stock from this invoice?')) return;

    setConfirming(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Success! Created ${result.createdItems} new items and ${result.createdStockEntries} stock entries.`);
        router.push('/invoices');
      } else {
        const error = await response.json();
        alert(`Confirmation failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      alert('Confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const pendingItems = invoice.items.filter((item) => item.status === 'pending');
  const canConfirm = invoice.status === 'reviewed' && pendingItems.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/invoices" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {invoice.supplierName || 'Invoice'}
              </h1>
              <p className="text-xs text-gray-500">{invoice.store.name}</p>
            </div>
            <div className="w-6"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Invoice Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">File:</span>
              <span className="ml-2 font-medium">{invoice.fileName}</span>
            </div>
            {invoice.invoiceNumber && (
              <div>
                <span className="text-gray-500">Invoice #:</span>
                <span className="ml-2 font-medium">{invoice.invoiceNumber}</span>
              </div>
            )}
            {invoice.invoiceDate && (
              <div>
                <span className="text-gray-500">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(invoice.invoiceDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {invoice.totalAmount && (
              <div>
                <span className="text-gray-500">Total:</span>
                <span className="ml-2 font-medium">
                  {invoice.currency} {invoice.totalAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Extract Button - show if pending */}
        {invoice.status === 'pending' && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 mb-6 text-center">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Extract</h3>
            <p className="text-gray-500 mb-6">
              AI will analyze this invoice and extract all items, quantities, and prices
            </p>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50"
            >
              {extracting ? (
                <span className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  Extracting...
                </span>
              ) : (
                'Extract Items with AI'
              )}
            </button>
          </div>
        )}

        {/* Processing State */}
        {invoice.status === 'processing' && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 mb-6 text-center">
            <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Extracting Items</h3>
            <p className="text-gray-500">AI is analyzing your invoice...</p>
          </div>
        )}

        {/* Error State */}
        {invoice.status === 'error' && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">Extraction Failed</h3>
            <p className="text-red-700 mb-4">
              There was an error extracting items from this invoice. Please try again or upload a clearer image.
            </p>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Extracted Items */}
        {invoice.items.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Extracted Items ({invoice.items.length})
              </h2>
              {pendingItems.length > 0 && (
                <span className="text-sm text-gray-500">
                  {pendingItems.length} to review
                </span>
              )}
            </div>

            <div className="space-y-3">
              {invoice.items.map((item) => (
                <InvoiceItemCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  existingItems={existingItems}
                  isEditing={editingItem === item.id}
                  onEdit={() => setEditingItem(item.id)}
                  onCancelEdit={() => setEditingItem(null)}
                  onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                  onSkip={() => handleSkipItem(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {canConfirm && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 safe-area-inset-bottom">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleConfirmAll}
              disabled={confirming}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition disabled:opacity-50 text-lg"
            >
              {confirming ? 'Creating Items...' : `Confirm & Create ${pendingItems.length} Items`}
            </button>
          </div>
        </div>
      )}

      {/* Confirmed State */}
      {invoice.status === 'confirmed' && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-50 border-t border-green-200 px-4 py-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-green-700 font-medium">
              Invoice confirmed - items and stock have been created
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Invoice Item Card Component
function InvoiceItemCard({
  item,
  categories,
  existingItems,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onSkip,
}: {
  item: InvoiceItem;
  categories: Category[];
  existingItems: Item[];
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<InvoiceItem>) => void;
  onSkip: () => void;
}) {
  const [editData, setEditData] = useState({
    suggestedName: item.suggestedName || item.rawName,
    suggestedUnit: item.suggestedUnit || item.unit || 'pieces',
    categoryId: item.categoryId || '',
    matchedItemId: item.matchedItemId || '',
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice?.toString() || '',
  });

  const isSkipped = item.status === 'skipped';
  const isConfirmed = item.status === 'confirmed' || item.status === 'created';

  if (isEditing) {
    return (
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Item Name</label>
            <input
              type="text"
              value={editData.suggestedName}
              onChange={(e) => setEditData({ ...editData, suggestedName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                value={editData.quantity}
                onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={editData.suggestedUnit}
                onChange={(e) => setEditData({ ...editData, suggestedUnit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="mL">mL</option>
                <option value="pieces">pieces</option>
                <option value="boxes">boxes</option>
                <option value="cases">cases</option>
                <option value="bottles">bottles</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
              <input
                type="number"
                step="0.01"
                value={editData.unitPrice}
                onChange={(e) => setEditData({ ...editData, unitPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={editData.categoryId}
                onChange={(e) => setEditData({ ...editData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Match to Existing Item</label>
            <select
              value={editData.matchedItemId}
              onChange={(e) => setEditData({ ...editData, matchedItemId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Create new item</option>
              {existingItems.map((existing) => (
                <option key={existing.id} value={existing.id}>
                  {existing.name} ({existing.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onUpdate({
                suggestedName: editData.suggestedName,
                suggestedUnit: editData.suggestedUnit,
                categoryId: editData.categoryId || null,
                matchedItemId: editData.matchedItemId || null,
                quantity: parseFloat(editData.quantity) || 0,
                unitPrice: editData.unitPrice ? parseFloat(editData.unitPrice) : null,
              })}
              className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="flex-1 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border p-4 ${
        isSkipped
          ? 'border-gray-200 opacity-50'
          : isConfirmed
          ? 'border-green-200 bg-green-50'
          : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">
              {item.suggestedName || item.rawName}
            </span>
            {item.matchedItem && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Matched
              </span>
            )}
            {isSkipped && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                Skipped
              </span>
            )}
            {isConfirmed && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Created
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Original: {item.rawName}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span>
              <span className="font-medium">{item.quantity}</span>{' '}
              <span className="text-gray-500">{item.suggestedUnit || item.unit}</span>
            </span>
            {item.unitPrice && (
              <span className="text-gray-500">
                @ {item.unitPrice.toFixed(2)}/unit
              </span>
            )}
            {item.totalPrice && (
              <span className="font-medium text-gray-900">
                = {item.totalPrice.toFixed(2)}
              </span>
            )}
          </div>
          {item.category && (
            <div className="mt-1">
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {item.category.name}
              </span>
            </div>
          )}
        </div>

        {!isSkipped && !isConfirmed && (
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-blue-600"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onSkip}
              className="p-2 text-gray-400 hover:text-red-600"
              title="Skip"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
