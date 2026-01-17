'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { LogoWithText } from '@/components/Logo';

type StockEntry = {
  id: string;
  quantity: number;
  unitCost: number | null;
  currency: string;
  notes: string | null;
  item: {
    id: string;
    name: string;
    unit: string;
    category: {
      name: string;
    } | null;
  };
  store: {
    name: string;
  };
  createdAt: string;
};

export default function Dashboard() {
  const { data: session } = useSession();
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    quantity: string;
    unitCost: string;
    currency: string;
    notes: string;
  }>({ quantity: '', unitCost: '', currency: 'EUR', notes: '' });

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await fetch('/api/stock');
      const data = await response.json();
      setStock(data);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: StockEntry) => {
    setEditingId(entry.id);
    setEditValues({
      quantity: entry.quantity.toString(),
      unitCost: entry.unitCost?.toString() || '',
      currency: entry.currency,
      notes: entry.notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({ quantity: '', unitCost: '', currency: 'EUR', notes: '' });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseFloat(editValues.quantity),
          unitCost: editValues.unitCost ? parseFloat(editValues.unitCost) : null,
          currency: editValues.currency,
          notes: editValues.notes || null,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setStock(stock.map((s) => (s.id === id ? updated : s)));
        setEditingId(null);
        setEditValues({ quantity: '', unitCost: '', currency: 'EUR', notes: '' });
      } else {
        alert('Failed to update stock entry');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock entry?')) return;

    try {
      const response = await fetch(`/api/stock/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStock(stock.filter((s) => s.id !== id));
      } else {
        alert('Failed to delete stock entry');
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      alert('An error occurred');
    }
  };

  const totalValue = stock.reduce((sum, entry) => {
    if (entry.unitCost) {
      return sum + entry.quantity * entry.unitCost;
    }
    return sum;
  }, 0);

  const itemsCount = stock.length;
  const itemsWithCost = stock.filter((s) => s.unitCost).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <LogoWithText size="md" />
            <div className="flex items-center gap-4">
              <Link
                href="/invoices"
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <svg
                  className="w-5 h-5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Invoices
              </Link>
              <Link
                href="/count"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <svg
                  className="w-5 h-5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Count
              </Link>
              <Link
                href="/stock/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <svg
                  className="w-5 h-5 mr-1.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Stock
              </Link>
              {session?.user && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{session.user.email}</span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening in your inventory today
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Value Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-600">
                Total Inventory Value
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              €{totalValue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              {itemsWithCost} of {itemsCount} items priced
            </div>
          </div>

          {/* Stock Items Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-600">
                Stock Items
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {itemsCount}
            </div>
            <div className="text-sm text-gray-500">
              Across all venues
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl shadow-sm p-6 text-white hover:shadow-md transition">
            <div className="text-sm font-medium mb-3 opacity-90">
              Quick Actions
            </div>
            <div className="space-y-2">
              <Link
                href="/stock/new"
                className="flex items-center text-sm hover:underline"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add new stock
              </Link>
              <Link
                href="/items"
                className="flex items-center text-sm hover:underline"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Manage items
              </Link>
              <Link
                href="/categories"
                className="flex items-center text-sm hover:underline"
              >
                <svg
                  className="w-4 h-4 mr-2"
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
                Categories
              </Link>
              <Link
                href="/stores"
                className="flex items-center text-sm hover:underline"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Venues
              </Link>
              <Link
                href="/users"
                className="flex items-center text-sm hover:underline"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Team
              </Link>
              <Link
                href="/roles"
                className="flex items-center text-sm hover:underline"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Roles
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Stock Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Stock Entries
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          ) : itemsCount === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No stock entries yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start by adding your first stock item
              </p>
              <Link
                href="/stock/new"
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Stock Entry
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Currency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stock.map((entry) => {
                    const isEditing = editingId === entry.id;
                    return (
                      <tr
                        key={entry.id}
                        className={isEditing ? 'bg-red-50' : 'hover:bg-gray-50 transition'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.item.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {entry.item.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.quantity}
                              onChange={(e) =>
                                setEditValues({ ...editValues, quantity: e.target.value })
                              }
                              className="w-24 px-2 py-1 border border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                          ) : (
                            `${entry.quantity} ${entry.item.unit}`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues.unitCost}
                              onChange={(e) =>
                                setEditValues({ ...editValues, unitCost: e.target.value })
                              }
                              className="w-24 px-2 py-1 border border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          ) : entry.unitCost ? (
                            entry.unitCost.toFixed(2)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <select
                              value={editValues.currency}
                              onChange={(e) =>
                                setEditValues({ ...editValues, currency: e.target.value })
                              }
                              className="w-20 px-2 py-1 border border-red-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                              <option value="DKK">DKK</option>
                              <option value="GBP">GBP</option>
                            </select>
                          ) : (
                            entry.currency
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.unitCost
                            ? `${entry.currency} ${(entry.quantity * entry.unitCost).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.store.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleSaveEdit(entry.id)}
                                className="text-green-600 hover:text-green-900 font-medium"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-900 font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="text-red-600 hover:text-red-900 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-gray-600 hover:text-gray-900 font-medium"
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
    </div>
  );
}
