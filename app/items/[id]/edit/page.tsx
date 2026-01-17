'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function EditItem() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'kg',
    categoryId: '',
    supplierId: '',
    sku: '',
    barcode: '',
    minStockLevel: '',
    maxStockLevel: '',
    costPrice: '',
  });

  useEffect(() => {
    fetchItem();
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        console.log('Categories loaded:', data);
        setCategories(Array.isArray(data) ? data : []);
      } else {
        console.error('Categories fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers');
      if (response.ok) {
        const data = await response.json();
        console.log('Suppliers loaded:', data);
        setSuppliers(Array.isArray(data) ? data : []);
      } else {
        console.error('Suppliers fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/items/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || '',
          description: data.description || '',
          unit: data.unit || 'kg',
          categoryId: data.categoryId || '',
          supplierId: data.supplierId || '',
          sku: data.sku || '',
          barcode: data.barcode || '',
          minStockLevel: data.minStockLevel?.toString() || '',
          maxStockLevel: data.maxStockLevel?.toString() || '',
          costPrice: data.costPrice?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/items/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          unit: formData.unit,
          categoryId: formData.categoryId || null,
          supplierId: formData.supplierId || null,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          minStockLevel: formData.minStockLevel ? parseFloat(formData.minStockLevel) : null,
          maxStockLevel: formData.maxStockLevel ? parseFloat(formData.maxStockLevel) : null,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        }),
      });

      if (response.ok) {
        router.push('/items');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/items" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Edit Item</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

            {/* Item Name */}
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Chicken Breast"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description"
              />
            </div>

            {/* Unit & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  id="unit"
                  name="unit"
                  required
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              </div>
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Supplier Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Supplier</h2>

            <div>
              <label htmlFor="supplierId" className="block text-sm font-medium text-gray-700 mb-2">
                Default Supplier
              </label>
              <select
                id="supplierId"
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                The default supplier for this item
              </p>
            </div>
          </div>

          {/* Identification Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Identification</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                  SKU / Product Code
                </label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CHKN-001"
                />
              </div>
              <div>
                <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                  Barcode
                </label>
                <input
                  type="text"
                  id="barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1234567890123"
                />
              </div>
            </div>
          </div>

          {/* Stock & Pricing Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels & Pricing</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="minStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Min Stock Level
                </label>
                <input
                  type="number"
                  id="minStockLevel"
                  name="minStockLevel"
                  step="0.01"
                  value={formData.minStockLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">Alert when below this</p>
              </div>
              <div>
                <label htmlFor="maxStockLevel" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Stock Level
                </label>
                <input
                  type="number"
                  id="maxStockLevel"
                  name="maxStockLevel"
                  step="0.01"
                  value={formData.maxStockLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">Maximum to keep in stock</p>
              </div>
              <div>
                <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Cost Price
                </label>
                <input
                  type="number"
                  id="costPrice"
                  name="costPrice"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-500">Per unit cost</p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/items"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
