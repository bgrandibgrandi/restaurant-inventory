'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface RecipeTag {
  id: string;
  name: string;
  color: string;
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
  category: { id: string; name: string } | null;
  tags: RecipeTag[];
  ingredients: any[];
  calculatedCost: number;
  costPerPortion: number;
  salePrice: number | null;
  profit: number | null;
  margin: number | null;
  squareMappingsCount: number;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recipes' | 'subrecipes'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recipesRes, tagsRes] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/recipe-tags'),
      ]);

      if (recipesRes.ok) {
        setRecipes(await recipesRes.json());
      }
      if (tagsRes.ok) {
        setTags(await tagsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch =
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === 'all' ||
        (filter === 'recipes' && !recipe.isSubRecipe) ||
        (filter === 'subrecipes' && recipe.isSubRecipe);
      const matchesTags =
        selectedTagIds.length === 0 ||
        selectedTagIds.some((tagId) => recipe.tags?.some((t) => t.id === tagId));
      return matchesSearch && matchesFilter && matchesTags;
    });
  }, [recipes, searchQuery, filter, selectedTagIds]);

  const stats = useMemo(() => {
    const menuItems = recipes.filter((r) => !r.isSubRecipe);
    const withPricing = menuItems.filter((r) => r.salePrice !== null);
    const avgMargin = withPricing.length > 0
      ? withPricing.reduce((sum, r) => sum + (r.margin || 0), 0) / withPricing.length
      : 0;
    const lowMarginCount = withPricing.filter((r) => (r.margin || 0) < 50).length;

    return {
      total: recipes.length,
      menuItems: menuItems.length,
      subRecipes: recipes.filter((r) => r.isSubRecipe).length,
      linkedToSquare: recipes.filter((r) => r.squareMappingsCount > 0).length,
      avgMargin,
      lowMarginCount,
    };
  }, [recipes]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreatingTag(true);
    try {
      const response = await fetch('/api/recipe-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (response.ok) {
        const tag = await response.json();
        setTags([...tags, tag]);
        setNewTagName('');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all recipes.')) return;

    try {
      const response = await fetch(`/api/recipe-tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTags(tags.filter((t) => t.id !== tagId));
        setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
        // Refresh recipes to update tag assignments
        const recipesRes = await fetch('/api/recipes');
        if (recipesRes.ok) {
          setRecipes(await recipesRes.json());
        }
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const getMarginColor = (margin: number | null) => {
    if (margin === null) return 'text-gray-400';
    if (margin >= 70) return 'text-green-600';
    if (margin >= 50) return 'text-blue-600';
    if (margin >= 30) return 'text-amber-600';
    return 'text-red-600';
  };

  const getMarginBg = (margin: number | null) => {
    if (margin === null) return 'bg-gray-50';
    if (margin >= 70) return 'bg-green-50';
    if (margin >= 50) return 'bg-blue-50';
    if (margin >= 30) return 'bg-amber-50';
    return 'bg-red-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Recipes
                </h1>
                <p className="text-sm text-gray-500">Menu costing & profitability</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/recipes/mappings"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Mappings
              </Link>
              <Link
                href="/recipes/new"
                className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Total Recipes</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Menu Items</div>
            <div className="text-2xl font-bold text-blue-600">{stats.menuItems}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Prep Items</div>
            <div className="text-2xl font-bold text-orange-600">{stats.subRecipes}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Linked to POS</div>
            <div className="text-2xl font-bold text-green-600">{stats.linkedToSquare}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Avg Margin</div>
            <div className={`text-2xl font-bold ${getMarginColor(stats.avgMargin)}`}>
              {stats.avgMargin > 0 ? `${stats.avgMargin.toFixed(0)}%` : '—'}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">Low Margin</div>
            <div className="text-2xl font-bold text-red-600">{stats.lowMarginCount}</div>
            <div className="text-xs text-gray-400">&lt;50%</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              {[
                { key: 'all', label: 'All' },
                { key: 'recipes', label: 'Menu Items' },
                { key: 'subrecipes', label: 'Prep Items' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as typeof filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === item.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Tag Manager Button */}
            <button
              onClick={() => setShowTagManager(!showTagManager)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Tags
            </button>
          </div>

          {/* Tag Filter Pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedTagIds.includes(tag.id)
                      ? 'ring-2 ring-offset-1'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    ...(selectedTagIds.includes(tag.id) && { ringColor: tag.color }),
                  }}
                >
                  {tag.name}
                  {selectedTagIds.includes(tag.id) && (
                    <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
              {selectedTagIds.length > 0 && (
                <button
                  onClick={() => setSelectedTagIds([])}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tag Manager Modal */}
        {showTagManager && (
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Manage Tags</h3>
              <button onClick={() => setShowTagManager(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Create new tag */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
              />
              <button
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 transition"
              >
                {creatingTag ? 'Adding...' : 'Add Tag'}
              </button>
            </div>

            {/* Existing tags */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="hover:opacity-70 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-gray-500">No tags yet. Create your first tag above.</p>
              )}
            </div>
          </div>
        )}

        {/* Recipes List - Escandallos Style */}
        <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
          {filteredRecipes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No recipes found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedTagIds.length > 0 || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first recipe'}
              </p>
              {!searchQuery && selectedTagIds.length === 0 && filter === 'all' && (
                <Link
                  href="/recipes/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
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
                  className="flex items-center p-4 hover:bg-gray-50/50 transition group"
                >
                  {/* Image */}
                  <div className="flex-shrink-0 mr-4">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-16 h-16 object-cover rounded-xl ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Name & Tags */}
                  <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition">
                      {recipe.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {recipe.isSubRecipe && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                          Prep Item
                        </span>
                      )}
                      {recipe.tags?.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="hidden md:grid md:grid-cols-4 gap-6 text-center">
                    {/* Cost */}
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Cost</div>
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(recipe.costPerPortion)}
                      </div>
                    </div>

                    {/* Sale Price */}
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Price</div>
                      <div className="text-sm font-bold text-gray-900">
                        {recipe.salePrice !== null ? formatCurrency(recipe.salePrice) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </div>

                    {/* Profit */}
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">Profit</div>
                      <div className={`text-sm font-bold ${recipe.profit !== null ? 'text-green-600' : 'text-gray-400'}`}>
                        {recipe.profit !== null ? formatCurrency(recipe.profit) : '—'}
                      </div>
                    </div>

                    {/* Margin */}
                    <div className={`px-3 py-1.5 rounded-xl ${getMarginBg(recipe.margin)}`}>
                      <div className="text-xs text-gray-500 mb-0.5">Margin</div>
                      <div className={`text-lg font-bold ${getMarginColor(recipe.margin)}`}>
                        {recipe.margin !== null ? `${recipe.margin.toFixed(0)}%` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Metrics */}
                  <div className="md:hidden flex-shrink-0">
                    <div className={`px-3 py-2 rounded-xl ${getMarginBg(recipe.margin)}`}>
                      <div className="text-xs text-gray-500">Margin</div>
                      <div className={`text-lg font-bold ${getMarginColor(recipe.margin)}`}>
                        {recipe.margin !== null ? `${recipe.margin.toFixed(0)}%` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
