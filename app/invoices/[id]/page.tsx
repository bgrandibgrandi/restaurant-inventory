'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CategorySelector } from '@/components/CategorySelector';

type Category = {
  id: string;
  name: string;
  icon?: string | null;
  level: number;
  parentId: string | null;
};

type Item = {
  id: string;
  name: string;
  unit: string;
};

type Supplier = {
  id: string;
  name: string;
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
  suggestedCategoryName: string | null;
  status: string;
};

type Store = {
  id: string;
  name: string;
};

type Invoice = {
  id: string;
  fileName: string | null;
  fileUrl: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  supplierId: string | null;
  supplier: Supplier | null;
  invoiceDate: string | null;
  status: string;
  totalAmount: number | null;
  currency: string;
  store: { id: string; name: string };
  items: InvoiceItem[];
  createdAt: string;
  newSupplierDetected?: boolean;
  suggestedSupplierMatch?: Supplier | null;
  // Mismatch detection fields
  potentialMismatch?: boolean;
  detectedRecipient?: string | null;
  mismatchReason?: string | null;
  mismatchDismissed?: boolean;
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [existingItems, setExistingItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showMismatchDialog, setShowMismatchDialog] = useState(false);
  const [changingStore, setChangingStore] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierDialogType, setSupplierDialogType] = useState<'new' | 'match' | null>(null);
  const [pendingSupplierName, setPendingSupplierName] = useState<string | null>(null);
  const [suggestedSupplierMatch, setSuggestedSupplierMatch] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [invoiceId]);

  const handleDownloadInvoice = () => {
    if (!invoice?.fileUrl) return;

    // Create a download link from base64
    const link = document.createElement('a');
    link.href = invoice.fileUrl;
    link.download = invoice.fileName || 'invoice';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImageFile = (fileUrl: string | null) => {
    if (!fileUrl) return false;
    return fileUrl.startsWith('data:image/');
  };

  const isPdfFile = (fileUrl: string | null) => {
    if (!fileUrl) return false;
    return fileUrl.startsWith('data:application/pdf');
  };

  const fetchData = async () => {
    try {
      const [invoiceRes, itemsRes, suppliersRes, storesRes] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}`),
        fetch('/api/items'),
        fetch('/api/suppliers'),
        fetch('/api/stores'),
      ]);

      if (!invoiceRes.ok) {
        router.push('/invoices');
        return;
      }

      const [invoiceData, itemsData, suppliersData, storesData] = await Promise.all([
        invoiceRes.json(),
        itemsRes.json(),
        suppliersRes.json(),
        storesRes.json(),
      ]);

      setInvoice(invoiceData);
      setExistingItems(itemsData);
      setSuppliers(suppliersData);
      setStores(storesData);

      // Check if we need to show mismatch warning
      if (invoiceData.potentialMismatch && !invoiceData.mismatchDismissed) {
        setShowMismatchDialog(true);
      }

      // Check if we need to show supplier dialog after extraction
      if (invoiceData.newSupplierDetected && invoiceData.supplierName) {
        setPendingSupplierName(invoiceData.supplierName);
        if (invoiceData.suggestedSupplierMatch) {
          setSuggestedSupplierMatch(invoiceData.suggestedSupplierMatch);
          setSupplierDialogType('match');
        } else {
          setSupplierDialogType('new');
        }
        setShowSupplierDialog(true);
      }
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

        // Check if there's a potential mismatch warning
        if (updatedInvoice.potentialMismatch && !updatedInvoice.mismatchDismissed) {
          setShowMismatchDialog(true);
        }

        // Check if we need to show supplier confirmation dialog
        if (updatedInvoice.newSupplierDetected && updatedInvoice.supplierName) {
          setPendingSupplierName(updatedInvoice.supplierName);
          if (updatedInvoice.suggestedSupplierMatch) {
            setSuggestedSupplierMatch(updatedInvoice.suggestedSupplierMatch);
            setSupplierDialogType('match');
          } else {
            setSupplierDialogType('new');
          }
          setShowSupplierDialog(true);
        }
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

  const handleUpdateSupplier = async (supplierId: string) => {
    setSavingSupplier(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_supplier',
          supplierId,
        }),
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        setInvoice(updatedInvoice);
        // Refresh suppliers list
        const suppliersRes = await fetch('/api/suppliers');
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData);
        }
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
    } finally {
      setSavingSupplier(false);
      setShowSupplierDialog(false);
      setSupplierDialogType(null);
      setPendingSupplierName(null);
      setSuggestedSupplierMatch(null);
    }
  };

  const handleCreateNewSupplier = async () => {
    if (!pendingSupplierName) return;

    setSavingSupplier(true);
    try {
      // Create the new supplier
      const createRes = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pendingSupplierName }),
      });

      if (createRes.ok) {
        const newSupplier = await createRes.json();
        // Link to invoice
        await handleUpdateSupplier(newSupplier.id);
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      setSavingSupplier(false);
    }
  };

  const handleDismissSupplierDialog = async () => {
    // Clear the newSupplierDetected flag
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss_supplier_dialog',
        }),
      });
    } catch (error) {
      console.error('Error dismissing dialog:', error);
    }
    setShowSupplierDialog(false);
    setSupplierDialogType(null);
    setPendingSupplierName(null);
    setSuggestedSupplierMatch(null);
  };

  const handleDismissMismatch = async () => {
    try {
      await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_mismatch' }),
      });
      setInvoice((prev) => prev ? { ...prev, mismatchDismissed: true } : null);
    } catch (error) {
      console.error('Error dismissing mismatch:', error);
    }
    setShowMismatchDialog(false);
  };

  const handleChangeStore = async (newStoreId: string) => {
    setChangingStore(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_store', newStoreId }),
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        setInvoice(updatedInvoice);
        setShowMismatchDialog(false);
      } else {
        const error = await response.json();
        alert(`Failed to change store: ${error.error}`);
      }
    } catch (error) {
      console.error('Error changing store:', error);
      alert('Failed to change store');
    } finally {
      setChangingStore(false);
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/invoices');
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    } finally {
      setDeleting(false);
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
      {/* Mismatch Warning Dialog */}
      {showMismatchDialog && invoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Possible Wrong Venue
            </h3>
            <p className="text-gray-600 text-center mb-4">
              This invoice might have been uploaded to the wrong venue.
            </p>

            <div className="bg-orange-50 rounded-lg p-3 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Selected venue:</span>
                <span className="font-medium text-gray-900">{invoice.store.name}</span>
              </div>
              {invoice.detectedRecipient && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Detected on invoice:</span>
                  <span className="font-medium text-orange-700">{invoice.detectedRecipient}</span>
                </div>
              )}
            </div>

            {invoice.mismatchReason && (
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
                {invoice.mismatchReason}
              </p>
            )}

            <div className="space-y-3">
              <div className="text-sm text-gray-500 mb-2">Move to correct venue:</div>
              <div className="grid grid-cols-2 gap-2">
                {stores
                  .filter((s) => s.id !== invoice.store.id)
                  .map((store) => (
                    <button
                      key={store.id}
                      onClick={() => handleChangeStore(store.id)}
                      disabled={changingStore}
                      className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition text-sm disabled:opacity-50"
                    >
                      {changingStore ? '...' : store.name}
                    </button>
                  ))}
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <button
                  onClick={handleDismissMismatch}
                  className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Ignore, this is correct
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Confirmation Dialog */}
      {showSupplierDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            {supplierDialogType === 'new' ? (
              <>
                <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  New Supplier Detected
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  The supplier &quot;<strong>{pendingSupplierName}</strong>&quot; was found on this invoice but doesn&apos;t exist in your system.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleCreateNewSupplier}
                    disabled={savingSupplier}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {savingSupplier ? 'Creating...' : `Create "${pendingSupplierName}"`}
                  </button>
                  <div className="text-center text-gray-500 text-sm">or map to existing supplier</div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select existing supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {selectedSupplierId && (
                    <button
                      onClick={() => handleUpdateSupplier(selectedSupplierId)}
                      disabled={savingSupplier}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                    >
                      Map to Selected Supplier
                    </button>
                  )}
                  <button
                    onClick={handleDismissSupplierDialog}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Skip for now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Confirm Supplier Match
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  &quot;<strong>{pendingSupplierName}</strong>&quot; looks similar to an existing supplier. Is this the same?
                </p>
                {suggestedSupplierMatch && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-500">Suggested match:</div>
                    <div className="font-medium text-gray-900">{suggestedSupplierMatch.name}</div>
                  </div>
                )}
                <div className="space-y-3">
                  {suggestedSupplierMatch && (
                    <button
                      onClick={() => handleUpdateSupplier(suggestedSupplierMatch.id)}
                      disabled={savingSupplier}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                    >
                      {savingSupplier ? 'Linking...' : `Yes, use "${suggestedSupplierMatch.name}"`}
                    </button>
                  )}
                  <button
                    onClick={handleCreateNewSupplier}
                    disabled={savingSupplier}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {savingSupplier ? 'Creating...' : `No, create "${pendingSupplierName}"`}
                  </button>
                  <div className="text-center text-gray-500 text-sm">or select different supplier</div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select different supplier...</option>
                    {suppliers.filter(s => s.id !== suggestedSupplierMatch?.id).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {selectedSupplierId && (
                    <button
                      onClick={() => handleUpdateSupplier(selectedSupplierId)}
                      disabled={savingSupplier}
                      className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                    >
                      Map to Selected Supplier
                    </button>
                  )}
                  <button
                    onClick={handleDismissSupplierDialog}
                    className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Skip for now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                {invoice.supplier?.name || invoice.supplierName || 'Invoice'}
              </h1>
              <p className="text-xs text-gray-500">{invoice.store.name}</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-400 hover:text-red-600 transition disabled:opacity-50"
              title="Delete invoice"
            >
              {deleting ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-red-600 border-r-transparent"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Mismatch Warning Banner */}
        {invoice.potentialMismatch && !invoice.mismatchDismissed && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-orange-800">Possible wrong venue</h4>
                <p className="text-sm text-orange-700 mt-1">
                  {invoice.mismatchReason || `This invoice may belong to a different venue. Detected: ${invoice.detectedRecipient || 'Unknown'}`}
                </p>
              </div>
              <button
                onClick={() => setShowMismatchDialog(true)}
                className="flex-shrink-0 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* Invoice Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm flex-1">
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

            {/* View/Download buttons */}
            {invoice.fileUrl && (
              <div className="flex gap-2 ml-4">
                {isImageFile(invoice.fileUrl) && (
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                )}
                <button
                  onClick={handleDownloadInvoice}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            )}
          </div>

          {/* Manual Supplier Mapping */}
          {invoice.status !== 'pending' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Supplier:</span>
                <select
                  value={invoice.supplierId || ''}
                  onChange={(e) => handleUpdateSupplier(e.target.value)}
                  disabled={savingSupplier}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  <option value="">No supplier linked</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {invoice.supplierName && !invoice.supplierId && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    Extracted: {invoice.supplierName}
                  </span>
                )}
              </div>
            </div>
          )}
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

      {/* Image Preview Modal */}
      {showImageModal && invoice.fileUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={invoice.fileUrl}
              alt={invoice.fileName || 'Invoice'}
              className="max-w-full max-h-[85vh] mx-auto rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadInvoice();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Invoice Item Card Component
function InvoiceItemCard({
  item,
  existingItems,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onSkip,
}: {
  item: InvoiceItem;
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
              <CategorySelector
                value={editData.categoryId || null}
                onChange={(categoryId) => setEditData({ ...editData, categoryId: categoryId || '' })}
                placeholder="Sin categoría"
              />
              {item.suggestedCategoryName && !editData.categoryId && (
                <p className="mt-1 text-xs text-blue-600">
                  Suggested: {item.suggestedCategoryName}
                </p>
              )}
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
          <div className="mt-1 flex items-center gap-2">
            {item.category ? (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {item.category.name}
              </span>
            ) : item.suggestedCategoryName ? (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                Suggested: {item.suggestedCategoryName}
              </span>
            ) : null}
          </div>
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
