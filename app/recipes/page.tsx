'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout, { Card, LinkButton, Badge, EmptyState, StatCard } from '@/components/ui/PageLayout';

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

  const headerActions = (
    <div className="flex items-center gap-2">
      <LinkButton href="/recipes/mappings" variant="ghost" size="sm">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Mappings
      </LinkButton>
      <LinkButton href="/recipes/import" variant="secondary" size="sm">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import
      </LinkButton>
      <LinkButton href="/recipes/new" variant="primary" size="sm">
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Recipe
      </LinkButton>
    </div>
  );

  if (loading) {
    return (
      <PageLayout title="Recipes" subtitle="Your culinary collection" backHref="/dashboard" actions={headerActions}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading recipes...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Recipes" subtitle="Your culinary collection" backHref="/dashboard" actions={headerActions}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Recipes"
          value={recipes.length}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          iconBg="bg-gradient-to-br from-purple-100 to-indigo-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Menu Items"
          value={recipes.filter((r) => !r.isSubRecipe).length}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          iconBg="bg-gradient-to-br from-blue-100 to-cyan-100"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Sub-recipes"
          value={recipes.filter((r) => r.isSubRecipe).length}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
          iconBg="bg-gradient-to-br from-orange-100 to-amber-100"
          iconColor="text-orange-600"
        />
        <Link href="/recipes/mappings" className="block">
          <Card className="h-full hover:border-green-300/50 group">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-600">Linked to Square</div>
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {recipes.filter((r) => r.squareMappingsCount > 0).length}
            </div>
            <div className="text-sm text-green-600 font-medium">View mappings →</div>
          </Card>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/50 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl">
            {[
              { key: 'all', label: 'All' },
              { key: 'recipes', label: 'Menu Items' },
              { key: 'subrecipes', label: 'Prep Items' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as 'all' | 'recipes' | 'subrecipes')}
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
        </div>
      </Card>

      {/* Recipes List */}
      <Card padding={false}>
        {filteredRecipes.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              title="No recipes found"
              description={
                searchQuery || filter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first recipe'
              }
              action={
                !searchQuery && filter === 'all' && (
                  <LinkButton href="/recipes/new" variant="primary">
                    Create Recipe
                  </LinkButton>
                )
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100/50">
            {filteredRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="block p-5 hover:bg-gray-50/50 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {recipe.imageUrl ? (
                      <div className="w-16 h-16 rounded-xl flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 p-1.5 shadow-sm border border-gray-200/50">
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex-shrink-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition">
                          {recipe.name}
                        </h3>
                        {recipe.isSubRecipe && (
                          <Badge variant="warning">Prep Item</Badge>
                        )}
                        {recipe.squareMappingsCount > 0 && (
                          <Badge variant="success">Square</Badge>
                        )}
                        {!recipe.isActive && (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                        {recipe.category && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {recipe.category.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {recipe.ingredients.length} ingredients
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          {recipe.yieldQuantity} {recipe.yieldUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-6 flex-shrink-0">
                    <div className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {formatCurrency(recipe.costPerPortion)}
                    </div>
                    <div className="text-xs text-gray-500">per {recipe.yieldUnit.replace(/s$/, '')}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
