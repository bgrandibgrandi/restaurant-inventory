'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yieldQuantity: number;
  yieldUnit: string;
  isSubRecipe: boolean;
  isActive: boolean;
  category: { id: string; name: string } | null;
  ingredients: any[];
  calculatedCost: number;
  costPerPortion: number;
  squareMappingsCount: number;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recipes' | 'subrecipes'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'recipes' && !recipe.isSubRecipe) ||
      (filter === 'subrecipes' && recipe.isSubRecipe);
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading recipes...</p>
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
              <h1 className="text-xl font-semibold text-gray-900">Recipes</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/recipes/mappings"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Square Mappings
              </Link>
              <Link
                href="/recipes/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Recipe
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('recipes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'recipes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Menu Items
              </button>
              <button
                onClick={() => setFilter('subrecipes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'subrecipes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Prep/Sub-recipes
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-sm text-gray-500">Total Recipes</div>
            <div className="text-2xl font-bold text-gray-900">{recipes.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-sm text-gray-500">Menu Items</div>
            <div className="text-2xl font-bold text-blue-600">
              {recipes.filter((r) => !r.isSubRecipe).length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="text-sm text-gray-500">Sub-recipes/Prep</div>
            <div className="text-2xl font-bold text-orange-600">
              {recipes.filter((r) => r.isSubRecipe).length}
            </div>
          </div>
          <Link
            href="/recipes/mappings"
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:border-green-300 hover:shadow transition"
          >
            <div className="text-sm text-gray-500">Linked to Square</div>
            <div className="text-2xl font-bold text-green-600">
              {recipes.filter((r) => r.squareMappingsCount > 0).length}
            </div>
          </Link>
        </div>

        {/* Recipes List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {filteredRecipes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first recipe'}
              </p>
              {!searchQuery && filter === 'all' && (
                <Link
                  href="/recipes/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Create Recipe
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="block p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-gray-900 truncate">
                          {recipe.name}
                        </h3>
                        {recipe.isSubRecipe && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                            Prep Item
                          </span>
                        )}
                        {recipe.squareMappingsCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Square
                          </span>
                        )}
                        {!recipe.isActive && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {recipe.category && (
                          <span>{recipe.category.name}</span>
                        )}
                        <span>{recipe.ingredients.length} ingredients</span>
                        <span>
                          Yields {recipe.yieldQuantity} {recipe.yieldUnit}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(recipe.costPerPortion)}
                      </div>
                      <div className="text-xs text-gray-500">per {recipe.yieldUnit.replace(/s$/, '')}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
