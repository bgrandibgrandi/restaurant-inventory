'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Ingredient {
  id: string;
  quantity: number;
  unit: string;
  notes: string | null;
  wasteFactor: number;
  item: {
    id: string;
    name: string;
    unit: string;
    costPrice: number | null;
    category: { name: string } | null;
    stockMovements: { costPrice: number | null }[];
  } | null;
  subRecipe: {
    id: string;
    name: string;
    yieldQuantity: number;
    yieldUnit: string;
  } | null;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  yieldQuantity: number;
  yieldUnit: string;
  isSubRecipe: boolean;
  isActive: boolean;
  instructions: string | null;
  prepTime: number | null;
  cookTime: number | null;
  category: { id: string; name: string } | null;
  ingredients: Ingredient[];
  usedIn: { recipe: { id: string; name: string } }[];
  squareItemMappings: any[];
  calculatedCost: number;
  costPerPortion: number;
}

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [params.id]);

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setRecipe(data);
      } else {
        router.push('/recipes');
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/recipes');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete recipe');
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('An error occurred');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async () => {
    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !recipe?.isActive }),
      });

      if (response.ok) {
        fetchRecipe();
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
    }
  };

  const handleConvertToItem = async () => {
    if (!confirm('Are you sure you want to convert this recipe to an inventory item? This will delete the recipe and create a new item with the same name. This action cannot be undone.')) {
      return;
    }

    setConverting(true);
    try {
      const response = await fetch(`/api/recipes/${params.id}/convert-to-item`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        router.push(`/items/${data.item.id}/edit`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to convert recipe');
      }
    } catch (error) {
      console.error('Error converting recipe:', error);
      alert('An error occurred');
    } finally {
      setConverting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const response = await fetch(`/api/recipes/${params.id}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const newRecipe = await response.json();
        router.push(`/recipes/${newRecipe.id}/edit`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to duplicate recipe');
      }
    } catch (error) {
      console.error('Error duplicating recipe:', error);
      alert('An error occurred');
    } finally {
      setDuplicating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getIngredientCost = (ingredient: Ingredient): number => {
    if (ingredient.item) {
      const latestMovement = ingredient.item.stockMovements?.[0];
      const unitCost = latestMovement?.costPrice || ingredient.item.costPrice || 0;
      const adjustedQuantity = ingredient.quantity * (1 + ingredient.wasteFactor);
      return unitCost * adjustedQuantity;
    }
    // For sub-recipes, cost is calculated recursively in the API
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/recipes" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 truncate">{recipe.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDuplicate}
                disabled={duplicating}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                title="Create a copy of this recipe"
              >
                {duplicating ? '...' : 'Duplicate'}
              </button>
              <button
                onClick={handleConvertToItem}
                disabled={converting}
                className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
                title="Convert this recipe to an inventory item"
              >
                {converting ? '...' : 'Convert to Item'}
              </button>
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {deleting ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Status & Cost Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {recipe.isSubRecipe && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                    Prep Item
                  </span>
                )}
                {recipe.squareItemMappings.length > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    Linked to Square
                  </span>
                )}
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer ${
                    recipe.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={toggleActive}
                >
                  {recipe.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {recipe.category && (
                <span className="text-sm text-gray-500">{recipe.category.name}</span>
              )}
            </div>

            {/* Image and Cost Grid */}
            <div className={`${recipe.imageUrl ? 'flex gap-6' : ''}`}>
              {recipe.imageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-40 h-40 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(recipe.calculatedCost)}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(recipe.costPerPortion)}
                    </div>
                    <div className="text-sm text-gray-600">Per {recipe.yieldUnit.replace(/s$/, '')}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700">
                      {recipe.yieldQuantity} {recipe.yieldUnit}
                    </div>
                    <div className="text-sm text-gray-600">Yield</div>
                  </div>
                </div>
              </div>
            </div>

            {recipe.description && (
              <p className="mt-4 text-gray-600">{recipe.description}</p>
            )}
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ingredients ({recipe.ingredients.length})
            </h2>
            <div className="divide-y divide-gray-100">
              {recipe.ingredients.map((ing) => (
                <div key={ing.id} className="py-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {ing.item?.name || ing.subRecipe?.name}
                      </span>
                      {ing.subRecipe && (
                        <Link
                          href={`/recipes/${ing.subRecipe.id}`}
                          className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
                        >
                          Sub-recipe
                        </Link>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {ing.quantity} {ing.unit}
                      {ing.wasteFactor > 0 && (
                        <span className="text-orange-600 ml-2">
                          (+{(ing.wasteFactor * 100).toFixed(0)}% waste)
                        </span>
                      )}
                      {ing.notes && <span className="ml-2 italic">({ing.notes})</span>}
                    </div>
                  </div>
                  {ing.item && (
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(getIngredientCost(ing))}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{formatCurrency(
                          ing.item.stockMovements?.[0]?.costPrice ||
                            ing.item.costPrice ||
                            0
                        )}/{ing.item.unit}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Used In (if sub-recipe) */}
          {recipe.usedIn.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Used In ({recipe.usedIn.length} recipes)
              </h2>
              <div className="space-y-2">
                {recipe.usedIn.map((usage) => (
                  <Link
                    key={usage.recipe.id}
                    href={`/recipes/${usage.recipe.id}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <span className="font-medium text-gray-900">{usage.recipe.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Square Mappings */}
          {recipe.squareItemMappings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Square Integrations ({recipe.squareItemMappings.length})
              </h2>
              <div className="space-y-2">
                {recipe.squareItemMappings.map((mapping: any) => (
                  <div
                    key={mapping.id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">
                      {mapping.catalogItem?.name}
                    </div>
                    {mapping.variation && (
                      <div className="text-sm text-gray-500">
                        Variation: {mapping.variation.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Times & Instructions */}
          {(recipe.prepTime || recipe.cookTime || recipe.instructions) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preparation</h2>
              {(recipe.prepTime || recipe.cookTime) && (
                <div className="flex gap-4 mb-4">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Prep: {recipe.prepTime} min</span>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                      <span>Cook: {recipe.cookTime} min</span>
                    </div>
                  )}
                </div>
              )}
              {recipe.instructions && (
                <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                  {recipe.instructions}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
