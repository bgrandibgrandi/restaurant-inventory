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

interface RecipeStep {
  id: string;
  stepNumber: number;
  title: string | null;
  instruction: string;
  imageUrl: string | null;
  duration: number | null;
  notes: string | null;
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
  equipment: string[];
  steps: RecipeStep[];
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
  const [activeStepImage, setActiveStepImage] = useState<string | null>(null);

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
    return 0;
  };

  const getTotalTime = () => {
    const prep = recipe?.prepTime || 0;
    const cook = recipe?.cookTime || 0;
    const stepTime = recipe?.steps?.reduce((acc, step) => acc + (step.duration || 0), 0) || 0;
    return prep + cook + stepTime;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/recipes" className="text-gray-500 hover:text-gray-700 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 truncate">{recipe.name}</h1>
                {recipe.category && (
                  <p className="text-xs text-gray-500">{recipe.category.name}</p>
                )}
              </div>
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
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="p-6">
              {/* Profile-style header with image */}
              <div className="flex items-start gap-4 mb-6">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.name}
                    className="w-20 h-20 object-cover rounded-2xl ring-4 ring-gray-100 shadow-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0 ring-4 ring-gray-100">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {recipe.isSubRecipe && (
                      <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                        Prep Item
                      </span>
                    )}
                    {recipe.squareItemMappings.length > 0 && (
                      <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Square
                      </span>
                    )}
                    <button
                      onClick={toggleActive}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition cursor-pointer ${
                        recipe.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {recipe.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {recipe.description && (
                    <p className="text-gray-600 text-sm">{recipe.description}</p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(recipe.calculatedCost)}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(recipe.costPerPortion)}
                  </div>
                  <div className="text-sm text-gray-600">Per {recipe.yieldUnit.replace(/s$/, '')}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {recipe.yieldQuantity}
                  </div>
                  <div className="text-sm text-gray-600">{recipe.yieldUnit}</div>
                </div>
                {getTotalTime() > 0 && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {getTotalTime()}
                    </div>
                    <div className="text-sm text-gray-600">minutes total</div>
                  </div>
                )}
              </div>

              {/* Time breakdown */}
              {(recipe.prepTime || recipe.cookTime) && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Prep: <strong>{recipe.prepTime} min</strong></span>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                      <span>Cook: <strong>{recipe.cookTime} min</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Ingredients Column */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Ingredients</h2>
                </div>

                <div className="space-y-3">
                  {recipe.ingredients.map((ing) => (
                    <div key={ing.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {ing.item?.name || ing.subRecipe?.name}
                          {ing.subRecipe && (
                            <Link
                              href={`/recipes/${ing.subRecipe.id}`}
                              className="ml-2 text-xs text-orange-600 hover:text-orange-700"
                            >
                              (sub-recipe)
                            </Link>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ing.quantity} {ing.unit}
                          {ing.wasteFactor > 0 && (
                            <span className="text-orange-500 ml-1">
                              +{(ing.wasteFactor * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        {ing.notes && (
                          <div className="text-xs text-gray-400 italic mt-1">{ing.notes}</div>
                        )}
                      </div>
                      {ing.item && (
                        <div className="text-right text-sm">
                          <div className="font-medium text-gray-700">
                            {formatCurrency(getIngredientCost(ing))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Equipment */}
                {recipe.equipment && recipe.equipment.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-gray-700">Equipment Needed</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recipe.equipment.map((item) => (
                        <span
                          key={item}
                          className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions Column */}
            <div className="md:col-span-2">
              {recipe.steps && recipe.steps.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Instructions</h2>
                  </div>

                  <div className="space-y-6">
                    {recipe.steps.map((step, index) => (
                      <div key={step.id} className="relative">
                        {/* Connector line */}
                        {index < recipe.steps.length - 1 && (
                          <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 to-transparent"></div>
                        )}

                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
                              {step.stepNumber}
                            </div>
                          </div>

                          <div className="flex-1 pb-6">
                            {step.title && (
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                            )}

                            {step.imageUrl && (
                              <button
                                onClick={() => setActiveStepImage(step.imageUrl)}
                                className="mb-3 block"
                              >
                                <img
                                  src={step.imageUrl}
                                  alt={step.title || `Step ${step.stepNumber}`}
                                  className="w-full max-w-md h-48 object-cover rounded-xl border border-gray-100 hover:border-indigo-300 transition shadow-sm hover:shadow-md"
                                />
                              </button>
                            )}

                            <p className="text-gray-600 whitespace-pre-wrap">{step.instruction}</p>

                            {step.duration && (
                              <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{step.duration} min</span>
                              </div>
                            )}

                            {step.notes && (
                              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <p className="text-sm text-amber-800">{step.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : recipe.instructions ? (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Instructions</h2>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                    {recipe.instructions}
                  </div>
                </div>
              ) : null}

              {/* Used In */}
              {recipe.usedIn.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Used In ({recipe.usedIn.length} recipe{recipe.usedIn.length !== 1 ? 's' : ''})
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {recipe.usedIn.map((usage) => (
                      <Link
                        key={usage.recipe.id}
                        href={`/recipes/${usage.recipe.id}`}
                        className="px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition font-medium text-gray-900"
                      >
                        {usage.recipe.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Square Mappings */}
              {recipe.squareItemMappings.length > 0 && (
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Square Integrations
                  </h2>
                  <div className="space-y-2">
                    {recipe.squareItemMappings.map((mapping: any) => (
                      <div
                        key={mapping.id}
                        className="p-3 rounded-lg border border-green-200 bg-green-50"
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

              {/* Advanced Actions */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleConvertToItem}
                    disabled={converting}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded-lg transition disabled:opacity-50"
                    title="Convert this recipe to an inventory item"
                  >
                    {converting ? 'Converting...' : 'Convert to Inventory Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Lightbox */}
      {activeStepImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setActiveStepImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <img
              src={activeStepImage}
              alt="Step detail"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setActiveStepImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
