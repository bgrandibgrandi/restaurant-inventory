'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  _count: {
    invoices: number;
    items: number;
  };
  createdAt: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Merge state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState<string>('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Supplier name is required');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchSuppliers();
        setShowAddForm(false);
        setEditingId(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save supplier');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setEditingId(supplier.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuppliers(suppliers.filter((s) => s.id !== id));
        setDeleteConfirm(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete supplier');
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('An error occurred');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  const toggleMergeMode = () => {
    setMergeMode(!mergeMode);
    setSelectedForMerge([]);
    setShowMergeDialog(false);
  };

  const toggleSupplierSelection = (id: string) => {
    setSelectedForMerge((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const openMergeDialog = () => {
    if (selectedForMerge.length < 2) {
      alert('Please select at least 2 suppliers to merge');
      return;
    }
    setTargetSupplierId(selectedForMerge[0]);
    setShowMergeDialog(true);
  };

  const handleMerge = async () => {
    if (!targetSupplierId) {
      alert('Please select a target supplier');
      return;
    }

    const sourceIds = selectedForMerge.filter((id) => id !== targetSupplierId);
    if (sourceIds.length === 0) {
      alert('Please select at least one supplier to merge into the target');
      return;
    }

    setMerging(true);
    try {
      const response = await fetch('/api/suppliers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSupplierId,
          sourceSuppliersIds: sourceIds,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        await fetchSuppliers();
        setMergeMode(false);
        setSelectedForMerge([]);
        setShowMergeDialog(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to merge suppliers');
      }
    } catch (error) {
      console.error('Error merging suppliers:', error);
      alert('An error occurred');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold text-gray-900">Suppliers</h1>
            </div>
            <div className="flex items-center gap-2">
              {suppliers.length >= 2 && (
                <button
                  onClick={toggleMergeMode}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition shadow-sm ${
                    mergeMode
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {mergeMode ? 'Cancel Merge' : 'Merge Duplicates'}
                </button>
              )}
              {!mergeMode && (
                <button
                  onClick={() => {
                    resetForm();
                    setEditingId(null);
                    setShowAddForm(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
                >
                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Supplier
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Supplier name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="supplier@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main St, City"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about this supplier..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Supplier' : 'Add Supplier'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Merge Mode Banner */}
        {mergeMode && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Merge Mode: Select suppliers to merge
                  </p>
                  <p className="text-xs text-orange-600">
                    {selectedForMerge.length} supplier{selectedForMerge.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              {selectedForMerge.length >= 2 && (
                <button
                  onClick={openMergeDialog}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Merge Selected
                </button>
              )}
            </div>
          </div>
        )}

        {/* Suppliers List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              All Suppliers ({suppliers.length})
            </h2>
          </div>

          {suppliers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers yet</h3>
              <p className="text-gray-500 mb-4">Add your first supplier to start tracking vendors</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Add First Supplier
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {mergeMode && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoices
                    </th>
                    {!mergeMode && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      onClick={mergeMode ? () => toggleSupplierSelection(supplier.id) : undefined}
                      className={`transition ${
                        mergeMode
                          ? `cursor-pointer ${
                              selectedForMerge.includes(supplier.id)
                                ? 'bg-orange-50'
                                : 'hover:bg-gray-50'
                            }`
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {mergeMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedForMerge.includes(supplier.id)}
                            onChange={() => toggleSupplierSelection(supplier.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        {supplier.address && (
                          <div className="text-sm text-gray-500">{supplier.address}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {supplier.email && (
                          <div className="text-sm text-gray-900">{supplier.email}</div>
                        )}
                        {supplier.phone && (
                          <div className="text-sm text-gray-500">{supplier.phone}</div>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {supplier._count.items} items
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {supplier._count.invoices} invoices
                        </span>
                      </td>
                      {!mergeMode && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(supplier)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(supplier.id)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Supplier?
            </h3>
            <p className="text-gray-600 mb-6">
              This will unlink the supplier from any items and invoices. This action cannot be undone.
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

      {/* Merge Dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg mx-4 w-full">
            <div className="w-12 h-12 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Merge Suppliers
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Select which supplier to keep. All invoices and items from the other suppliers will be moved to this supplier.
            </p>

            <div className="space-y-2 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keep this supplier:
              </label>
              {selectedForMerge.map((id) => {
                const supplier = suppliers.find((s) => s.id === id);
                if (!supplier) return null;
                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      targetSupplierId === id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetSupplier"
                      value={id}
                      checked={targetSupplierId === id}
                      onChange={() => setTargetSupplierId(id)}
                      className="h-4 w-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-xs text-gray-500">
                        {supplier._count.items} items, {supplier._count.invoices} invoices
                      </div>
                    </div>
                    {targetSupplierId === id && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                        Keep
                      </span>
                    )}
                    {targetSupplierId !== id && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                        Delete
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="text-sm text-gray-600">
                <strong>Summary:</strong> Merge {selectedForMerge.length - 1} supplier
                {selectedForMerge.length - 1 !== 1 ? 's' : ''} into &quot;
                {suppliers.find((s) => s.id === targetSupplierId)?.name}&quot;
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMergeDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
                disabled={merging}
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={merging}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {merging ? 'Merging...' : 'Merge Suppliers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
