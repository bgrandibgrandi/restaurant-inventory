'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  accountId: string;
  parent?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export default function Categories() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [accountId, setAccountId] = useState<string>('');

  useEffect(() => {
    fetchCategories();
    fetchAccountId();
  }, []);

  const fetchAccountId = async () => {
    try {
      if (typeof window !== 'undefined') {
        const currentStore = localStorage.getItem('currentStore');
        if (currentStore) {
          const store = JSON.parse(currentStore);
          setAccountId(store.accountId);
          return;
        }
      }

      const storesRes = await fetch('/api/stores');
      if (storesRes.ok) {
        const stores = await storesRes.json();
        if (stores.length > 0) {
          setAccountId(stores[0].accountId);
        }
      }
    } catch (error) {
      console.error('Error fetching accountId:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    if (!accountId) {
      alert('Account information not loaded');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          accountId: accountId,
        }),
      });

      if (response.ok) {
        setNewCategoryName('');
        await fetchCategories();
      } else {
        const errorData = await response.json();
        alert(`Failed to create category: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('An error occurred');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditCategoryName(category.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditCategoryName('');
        await fetchCategories();
      } else {
        const errorData = await response.json();
        alert(`Failed to update category: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('An error occurred');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCategoryName('');
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(categories.filter((cat) => cat.id !== id));
        setDeleteConfirm(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to delete category: ${errorData.error || 'Unknown error'}`);
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('An error occurred');
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-xl font-bold text-gray-900"
              >
                Restaurant Inventory
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/items"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Items
              </Link>
              <Link
                href="/stores"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Venues
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">
            Organize your inventory items into categories
          </p>
        </div>

        {/* Add New Category */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add New Category
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCategory();
                }
              }}
              placeholder="Category name (e.g., Proteins, Vegetables, Beverages)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={adding}
            />
            <button
              onClick={handleAddCategory}
              disabled={adding}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              All Categories ({categories.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <p className="text-gray-600">No categories yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add your first category above to start organizing items
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className={editingId === category.id ? 'bg-red-50' : 'hover:bg-gray-50'}
                    >
                      <td className="px-6 py-4">
                        {editingId === category.id ? (
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(category.id);
                              }
                              if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="px-3 py-1 border border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900">
                            {category.name}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(category.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {editingId === category.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(category.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(category.id)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Category?
            </h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Items in this category will need to be reassigned.
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
