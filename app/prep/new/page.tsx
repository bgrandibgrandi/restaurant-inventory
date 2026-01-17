'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface Recipe {
  id: string;
  name: string;
  imageUrl: string | null;
  yieldQuantity: number;
  yieldUnit: string;
  isSubRecipe: boolean;
  costPerPortion?: number | null;
}

interface Store {
  id: string;
  name: string;
}

interface PlanItem {
  recipeId: string;
  recipe: Recipe;
  targetQuantity: number;
  notes: string;
}

export default function NewPrepPlanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [storeId, setStoreId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PlanItem[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storesRes, recipesRes] = await Promise.all([
          fetch('/api/stores'),
          fetch('/api/recipes?isSubRecipe=true'),
        ]);

        if (storesRes.ok) {
          const storesData = await storesRes.json();
          setStores(storesData);
          if (storesData.length > 0) {
            setStoreId(storesData[0].id);
          }
        }

        if (recipesRes.ok) {
          const recipesData = await recipesRes.json();
          // Get all recipes that can be prepped (sub-recipes are prep items)
          setRecipes(recipesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !items.some((item) => item.recipeId === recipe.id)
  );

  const addRecipe = (recipe: Recipe) => {
    setItems((prev) => [
      ...prev,
      {
        recipeId: recipe.id,
        recipe,
        targetQuantity: 1,
        notes: '',
      },
    ]);
    setSearchTerm('');
    setShowRecipeSearch(false);
  };

  const removeItem = (recipeId: string) => {
    setItems((prev) => prev.filter((item) => item.recipeId !== recipeId));
  };

  const updateItemQuantity = (recipeId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.recipeId === recipeId ? { ...item, targetQuantity: quantity } : item
      )
    );
  };

  const updateItemNotes = (recipeId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.recipeId === recipeId ? { ...item, notes } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !planDate || !storeId) {
      alert('Please fill in all required fields');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one recipe to the prep plan');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/prep-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          planDate,
          storeId,
          notes: notes || null,
          items: items.map((item) => ({
            recipeId: item.recipeId,
            targetQuantity: item.targetQuantity,
            notes: item.notes || null,
          })),
        }),
      });

      if (res.ok) {
        const newPlan = await res.json();
        router.push(`/prep/${newPlan.id}`);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create prep plan');
      }
    } catch (error) {
      console.error('Error creating prep plan:', error);
      alert('Failed to create prep plan');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/prep"
            className="p-2 hover:bg-white/50 rounded-xl transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              New Prep Plan
            </h1>
            <p className="text-gray-600 mt-1">Plan your daily prep work</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Plan Details */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Morning Prep - Monday"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store *
                </label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Recipe Items */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Prep Items</h2>
              <button
                type="button"
                onClick={() => setShowRecipeSearch(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Recipe
              </button>
            </div>

            {/* Recipe Search Modal */}
            {showRecipeSearch && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search recipes..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {filteredRecipes.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        {searchTerm ? 'No recipes found' : 'No recipes available'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredRecipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => addRecipe(recipe)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              {recipe.imageUrl ? (
                                <img
                                  src={recipe.imageUrl}
                                  alt={recipe.name}
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                <span className="text-lg font-semibold text-indigo-600">
                                  {recipe.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {recipe.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                Yield: {recipe.yieldQuantity} {recipe.yieldUnit}
                                {recipe.isSubRecipe && (
                                  <span className="ml-2 text-amber-600">• Sub-recipe</span>
                                )}
                              </p>
                            </div>
                            <PlusIcon className="h-5 w-5 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecipeSearch(false);
                        setSearchTerm('');
                      }}
                      className="w-full py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Items */}
            {items.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500">No recipes added yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Add Recipe" to add items to this prep plan
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.recipeId}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.recipe.imageUrl ? (
                        <img
                          src={item.recipe.imageUrl}
                          alt={item.recipe.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-indigo-600">
                          {item.recipe.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.recipe.name}</p>
                      <p className="text-sm text-gray-500">
                        Yield: {item.recipe.yieldQuantity} {item.recipe.yieldUnit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Qty:</label>
                        <input
                          type="number"
                          value={item.targetQuantity}
                          onChange={(e) =>
                            updateItemQuantity(item.recipeId, parseFloat(e.target.value) || 0)
                          }
                          min="0.1"
                          step="0.1"
                          className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.recipeId)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl p-6 text-white mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Items</p>
                  <p className="text-3xl font-bold">{items.length}</p>
                </div>
                <div>
                  <p className="text-white/80 text-sm">Total Batches</p>
                  <p className="text-3xl font-bold">
                    {items.reduce((sum, item) => sum + item.targetQuantity, 0).toFixed(1)}
                  </p>
                </div>
                {items.some((item) => item.recipe.costPerPortion) && (
                  <div>
                    <p className="text-white/80 text-sm">Est. Total Cost</p>
                    <p className="text-3xl font-bold">
                      €
                      {items
                        .reduce(
                          (sum, item) =>
                            sum + (item.recipe.costPerPortion || 0) * item.targetQuantity,
                          0
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/prep"
              className="px-6 py-3 text-gray-700 font-medium hover:bg-white/50 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || items.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-5 w-5" />
                  Create Prep Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
