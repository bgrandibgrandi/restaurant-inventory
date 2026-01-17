'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
}

interface Variation {
  id: string;
  name: string;
  priceMoney: number | null;
  sku: string | null;
}

interface Mapping {
  id: string;
  variationId: string | null;
  multiplier: number;
  recipe: {
    id: string;
    name: string;
  };
  variation: {
    id: string;
    name: string;
  } | null;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  squareConnection: {
    store: Store;
  };
  variations: Variation[];
  mappings: Mapping[];
}

interface Recipe {
  id: string;
  name: string;
  isSubRecipe: boolean;
}

export default function SquareMappingsPage() {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [mappingItem, setMappingItem] = useState<{
    catalogItem: CatalogItem;
    variationId: string | null;
  } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [selectedStore, showUnmappedOnly]);

  const fetchInitialData = async () => {
    try {
      const [storesRes, recipesRes] = await Promise.all([
        fetch('/api/stores'),
        fetch('/api/recipes'),
      ]);

      if (storesRes.ok) {
        setStores(await storesRes.json());
      }
      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setRecipes(recipesData.filter((r: Recipe) => !r.isSubRecipe));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore) params.set('storeId', selectedStore);
      if (showUnmappedOnly) params.set('unmappedOnly', 'true');

      const response = await fetch(`/api/square/catalog?${params}`);
      if (response.ok) {
        setCatalogItems(await response.json());
      }
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!mappingItem || !selectedRecipe) return;

    setSaving(true);
    try {
      const response = await fetch('/api/square/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItemId: mappingItem.catalogItem.id,
          variationId: mappingItem.variationId,
          recipeId: selectedRecipe,
        }),
      });

      if (response.ok) {
        setMappingItem(null);
        setSelectedRecipe('');
        fetchCatalog();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create mapping');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Remove this recipe mapping?')) return;

    try {
      const response = await fetch(`/api/square/mappings?id=${mappingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCatalog();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove mapping');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const getItemMappingStatus = (item: CatalogItem) => {
    if (item.variations.length === 0) {
      return item.mappings.length > 0 ? 'mapped' : 'unmapped';
    }
    const mappedVariations = item.mappings.filter((m) => m.variationId).length;
    if (mappedVariations === 0 && item.mappings.length === 0) return 'unmapped';
    if (mappedVariations >= item.variations.length) return 'mapped';
    return 'partial';
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return '';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents);
  };

  const filteredItems = catalogItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: catalogItems.length,
    mapped: catalogItems.filter((i) => getItemMappingStatus(i) === 'mapped').length,
    partial: catalogItems.filter((i) => getItemMappingStatus(i) === 'partial').length,
    unmapped: catalogItems.filter((i) => getItemMappingStatus(i) === 'unmapped').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/recipes" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Square Item Mappings</h1>
            </div>
            <Link
              href="/settings/integrations"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Manage Connections
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {catalogItems.length === 0 && !loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Square Items Found</h2>
            <p className="text-gray-500 mb-4">
              Connect your Square account and sync your catalog to map items to recipes.
            </p>
            <Link
              href="/settings/integrations"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Integrations
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Items</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-bold text-green-600">{stats.mapped}</div>
                <div className="text-sm text-gray-500">Mapped</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
                <div className="text-sm text-gray-500">Partial</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="text-2xl font-bold text-red-600">{stats.unmapped}</div>
                <div className="text-sm text-gray-500">Unmapped</div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {stores.length > 1 && (
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Stores</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnmappedOnly}
                    onChange={(e) => setShowUnmappedOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Unmapped only</span>
                </label>
              </div>
            </div>

            {/* Catalog Items */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const status = getItemMappingStatus(item);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                status === 'mapped'
                                  ? 'bg-green-100 text-green-700'
                                  : status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {status === 'mapped'
                                ? 'Mapped'
                                : status === 'partial'
                                ? 'Partial'
                                : 'Unmapped'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.categoryName && <span>{item.categoryName} &middot; </span>}
                            {item.squareConnection.store.name}
                          </div>
                        </div>
                        {item.variations.length === 0 && item.mappings.length === 0 && (
                          <button
                            onClick={() =>
                              setMappingItem({ catalogItem: item, variationId: null })
                            }
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            Map to Recipe
                          </button>
                        )}
                      </div>

                      {/* Variations or single item mapping */}
                      {item.variations.length > 0 ? (
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          {item.variations.map((variation) => {
                            const mapping = item.mappings.find(
                              (m) => m.variationId === variation.id
                            );
                            return (
                              <div
                                key={variation.id}
                                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                              >
                                <div>
                                  <span className="font-medium text-gray-800">
                                    {variation.name}
                                  </span>
                                  {variation.priceMoney && (
                                    <span className="ml-2 text-sm text-gray-500">
                                      {formatPrice(variation.priceMoney)}
                                    </span>
                                  )}
                                </div>
                                {mapping ? (
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/recipes/${mapping.recipe.id}`}
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      {mapping.recipe.name}
                                    </Link>
                                    <button
                                      onClick={() => handleDeleteMapping(mapping.id)}
                                      className="text-gray-400 hover:text-red-600 p-1"
                                      title="Remove mapping"
                                    >
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setMappingItem({
                                        catalogItem: item,
                                        variationId: variation.id,
                                      })
                                    }
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    Map
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        item.mappings.length > 0 && (
                          <div className="border-t border-gray-100 pt-3">
                            {item.mappings.map((mapping) => (
                              <div
                                key={mapping.id}
                                className="flex items-center justify-between py-2"
                              >
                                <Link
                                  href={`/recipes/${mapping.recipe.id}`}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  {mapping.recipe.name}
                                </Link>
                                <button
                                  onClick={() => handleDeleteMapping(mapping.id)}
                                  className="text-gray-400 hover:text-red-600 p-1"
                                  title="Remove mapping"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No items found matching your search.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Mapping Modal */}
      {mappingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Map to Recipe</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">
                {mappingItem.catalogItem.name}
              </div>
              {mappingItem.variationId && (
                <div className="text-sm text-gray-500">
                  Variation:{' '}
                  {
                    mappingItem.catalogItem.variations.find(
                      (v) => v.id === mappingItem.variationId
                    )?.name
                  }
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Recipe
              </label>
              <select
                value={selectedRecipe}
                onChange={(e) => setSelectedRecipe(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a recipe...</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
              {recipes.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  No recipes found.{' '}
                  <Link href="/recipes/new" className="text-blue-600 hover:underline">
                    Create one first
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setMappingItem(null);
                  setSelectedRecipe('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMapping}
                disabled={!selectedRecipe || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
