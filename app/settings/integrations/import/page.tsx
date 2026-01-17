'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SquareVariation {
  id: string;
  squareId: string;
  name: string;
  priceMoney: number | null;
  sku: string | null;
}

interface SquareCatalogItem {
  id: string;
  squareId: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  variations: SquareVariation[];
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
}

type ImportType = 'recipe' | 'item' | 'skip';

interface ImportSelection {
  catalogItemId: string;
  importAs: ImportType;
  useDescription: boolean;
  useCategory: boolean;
  usePrice: boolean;
  categoryId: string | null;
}

export default function ImportSquareItemsPage() {
  const [catalogItems, setCatalogItems] = useState<SquareCatalogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selections, setSelections] = useState<Map<string, ImportSelection>>(new Map());
  const [selectAll, setSelectAll] = useState<ImportType>('skip');
  const [result, setResult] = useState<{ recipes: number; items: number; skipped: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('/api/square/catalog'),
        fetch('/api/categories'),
      ]);

      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setCatalogItems(items);
        // Initialize selections
        const newSelections = new Map<string, ImportSelection>();
        items.forEach((item: SquareCatalogItem) => {
          newSelections.set(item.id, {
            catalogItemId: item.id,
            importAs: 'skip',
            useDescription: true,
            useCategory: true,
            usePrice: true,
            categoryId: null,
          });
        });
        setSelections(newSelections);
      }

      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSelection = (itemId: string, updates: Partial<ImportSelection>) => {
    setSelections((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId);
      if (existing) {
        newMap.set(itemId, { ...existing, ...updates });
      }
      return newMap;
    });
  };

  const handleSelectAll = (type: ImportType) => {
    setSelectAll(type);
    setSelections((prev) => {
      const newMap = new Map(prev);
      prev.forEach((selection, id) => {
        newMap.set(id, { ...selection, importAs: type });
      });
      return newMap;
    });
  };

  const handleImport = async () => {
    const itemsToImport = Array.from(selections.values()).filter(
      (s) => s.importAs !== 'skip'
    );

    if (itemsToImport.length === 0) {
      alert('Please select at least one item to import');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/square/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToImport }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to import items');
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('An error occurred during import');
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = Array.from(selections.values()).filter(
    (s) => s.importAs !== 'skip'
  ).length;

  const recipeCount = Array.from(selections.values()).filter(
    (s) => s.importAs === 'recipe'
  ).length;

  const itemCount = Array.from(selections.values()).filter(
    (s) => s.importAs === 'item'
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading Square catalog...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Link href="/settings/integrations" className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Import Complete</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful</h2>
            <p className="text-gray-600 mb-4">
              Created {result.recipes} recipes and {result.items} inventory items from Square.
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-yellow-600 mb-6">
                {result.skipped} items were skipped (already exist with the same name).
              </p>
            )}
            <div className="flex justify-center gap-4">
              {result.recipes > 0 && (
                <Link
                  href="/recipes"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  View Recipes
                </Link>
              )}
              {result.items > 0 && (
                <Link
                  href="/items"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  View Items
                </Link>
              )}
              <Link
                href="/settings/integrations"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                Back to Integrations
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/settings/integrations" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Import from Square</h1>
            </div>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${selectedCount} Items`}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-1">How to Import</h3>
          <p className="text-sm text-blue-800">
            Select which Square catalog items you want to import. Choose &quot;Recipe&quot; for menu items
            (dishes you sell) or &quot;Inventory Item&quot; for ingredients you track stock of.
          </p>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Bulk select:</span>
              <button
                onClick={() => handleSelectAll('recipe')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  selectAll === 'recipe'
                    ? 'bg-purple-100 text-purple-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All as Recipes
              </button>
              <button
                onClick={() => handleSelectAll('item')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  selectAll === 'item'
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All as Items
              </button>
              <button
                onClick={() => handleSelectAll('skip')}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  selectAll === 'skip'
                    ? 'bg-gray-200 text-gray-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Skip All
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {recipeCount > 0 && <span className="text-purple-600 mr-3">{recipeCount} recipes</span>}
              {itemCount > 0 && <span className="text-green-600">{itemCount} items</span>}
            </div>
          </div>
        </div>

        {/* Catalog Items */}
        {catalogItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Square Items Found</h3>
            <p className="text-gray-500 mb-4">
              Sync your catalog from Square first to see items here.
            </p>
            <Link
              href="/settings/integrations"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Go to Integrations
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {catalogItems.map((item) => {
              const selection = selections.get(item.id);
              if (!selection) return null;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 transition ${
                    selection.importAs !== 'skip'
                      ? 'border-blue-200 ring-1 ring-blue-100'
                      : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        {item.categoryName && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {item.categoryName}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                      )}
                      {item.variations.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.variations.map((v) => (
                            <span
                              key={v.id}
                              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded"
                            >
                              {v.name}
                              {v.priceMoney && ` - €${(v.priceMoney / 100).toFixed(2)}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Import Type Selection */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSelection(item.id, { importAs: 'recipe' })}
                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                          selection.importAs === 'recipe'
                            ? 'bg-purple-100 text-purple-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Recipe
                      </button>
                      <button
                        onClick={() => updateSelection(item.id, { importAs: 'item' })}
                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                          selection.importAs === 'item'
                            ? 'bg-green-100 text-green-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Item
                      </button>
                      <button
                        onClick={() => updateSelection(item.id, { importAs: 'skip' })}
                        className={`px-3 py-1.5 text-sm rounded-lg transition ${
                          selection.importAs === 'skip'
                            ? 'bg-gray-200 text-gray-700 font-medium'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>

                  {/* Options when selected */}
                  {selection.importAs !== 'skip' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={selection.useDescription}
                            onChange={(e) =>
                              updateSelection(item.id, { useDescription: e.target.checked })
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Include description
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={selection.useCategory}
                            onChange={(e) =>
                              updateSelection(item.id, { useCategory: e.target.checked })
                            }
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Use Square category
                        </label>
                        {selection.importAs === 'item' && (
                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={selection.usePrice}
                              onChange={(e) =>
                                updateSelection(item.id, { usePrice: e.target.checked })
                              }
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Import price as cost
                          </label>
                        )}
                        {!selection.useCategory && (
                          <select
                            value={selection.categoryId || ''}
                            onChange={(e) =>
                              updateSelection(item.id, {
                                categoryId: e.target.value || null,
                              })
                            }
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">No category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
