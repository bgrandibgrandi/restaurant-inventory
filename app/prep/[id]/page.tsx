'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  BuildingStorefrontIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface Recipe {
  id: string;
  name: string;
  imageUrl: string | null;
  yieldQuantity: number;
  yieldUnit: string;
  isSubRecipe: boolean;
  costPerPortion: number | null;
}

interface PrepPlanItem {
  id: string;
  recipeId: string;
  recipe: Recipe;
  targetQuantity: number;
  actualQuantity: number | null;
  completedAt: string | null;
  notes: string | null;
}

interface PrepPlan {
  id: string;
  name: string;
  planDate: string;
  status: string;
  notes: string | null;
  store: {
    id: string;
    name: string;
  };
  items: PrepPlanItem[];
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
}

export default function PrepPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plan, setPlan] = useState<PrepPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchPlan = async () => {
    try {
      const res = await fetch(`/api/prep-plans/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      } else if (res.status === 404) {
        router.push('/prep');
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPlan();
    }
  }, [session, resolvedParams.id]);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const res = await fetch('/api/recipes');
        if (res.ok) {
          const data = await res.json();
          setRecipes(data);
        }
      } catch (error) {
        console.error('Error fetching recipes:', error);
      }
    };

    if (session) {
      fetchRecipes();
    }
  }, [session]);

  const toggleItemCompletion = async (item: PrepPlanItem) => {
    setUpdating(item.id);
    try {
      const action = item.completedAt ? 'uncomplete_item' : 'complete_item';
      const res = await fetch(`/api/prep-plans/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          itemId: item.id,
          actualQuantity: item.completedAt ? null : item.targetQuantity,
        }),
      });

      if (res.ok) {
        await fetchPlan();
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm('Remove this item from the prep plan?')) return;

    setUpdating(itemId);
    try {
      const res = await fetch(`/api/prep-plans/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_item',
          itemId,
        }),
      });

      if (res.ok) {
        await fetchPlan();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setUpdating(null);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/prep-plans/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: newStatus,
        }),
      });

      if (res.ok) {
        await fetchPlan();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const addRecipe = async (recipe: Recipe) => {
    try {
      const res = await fetch(`/api/prep-plans/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_items',
          items: [{ recipeId: recipe.id, targetQuantity: 1 }],
        }),
      });

      if (res.ok) {
        await fetchPlan();
        setShowAddRecipe(false);
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error adding recipe:', error);
    }
  };

  const filteredRecipes = recipes.filter(
    (recipe) =>
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !plan?.items.some((item) => item.recipeId === recipe.id)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-gray-500">Plan not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <Link
              href="/prep"
              className="p-2 hover:bg-white/50 rounded-xl transition-colors mt-1"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    plan.status
                  )}`}
                >
                  {plan.status === 'completed' && <CheckCircleIcon className="h-4 w-4" />}
                  {plan.status === 'in_progress' && <PlayIcon className="h-4 w-4" />}
                  {plan.status === 'draft' && <ClockIcon className="h-4 w-4" />}
                  {plan.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {formatDate(plan.planDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <BuildingStorefrontIcon className="h-4 w-4" />
                  {plan.store.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {plan.status === 'draft' && (
              <button
                onClick={() => updateStatus('in_progress')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                <PlayIcon className="h-4 w-4" />
                Start
              </button>
            )}
            {plan.status === 'in_progress' && plan.completionPercentage === 100 && (
              <button
                onClick={() => updateStatus('completed')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Complete
              </button>
            )}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Progress</p>
              <p className="text-4xl font-bold">{Math.round(plan.completionPercentage)}%</p>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">Completed</p>
              <p className="text-2xl font-bold">
                {plan.completedItems} / {plan.totalItems}
              </p>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${plan.completionPercentage}%` }}
            />
          </div>
        </div>

        {plan.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800">{plan.notes}</p>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Prep Items</h2>
            {plan.status !== 'completed' && (
              <button
                onClick={() => setShowAddRecipe(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Item
              </button>
            )}
          </div>

          {/* Add Recipe Modal */}
          {showAddRecipe && (
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
                      {searchTerm ? 'No recipes found' : 'All recipes already added'}
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
                            <p className="font-medium text-gray-900 truncate">{recipe.name}</p>
                            <p className="text-sm text-gray-500">
                              Yield: {recipe.yieldQuantity} {recipe.yieldUnit}
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
                      setShowAddRecipe(false);
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

          {plan.items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No items in this prep plan</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {plan.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 flex items-center gap-4 transition-colors ${
                    item.completedAt ? 'bg-emerald-50/50' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleItemCompletion(item)}
                    disabled={updating === item.id || plan.status === 'completed'}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      item.completedAt
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                    } ${updating === item.id ? 'opacity-50' : ''} ${
                      plan.status === 'completed' ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {updating === item.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>
                    ) : item.completedAt ? (
                      <CheckCircleSolidIcon className="h-6 w-6" />
                    ) : (
                      <CheckCircleIcon className="h-6 w-6" />
                    )}
                  </button>

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
                    <p
                      className={`font-medium ${
                        item.completedAt ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}
                    >
                      {item.recipe.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Target: {item.targetQuantity} × {item.recipe.yieldQuantity}{' '}
                      {item.recipe.yieldUnit}
                      {item.completedAt && item.actualQuantity && (
                        <span className="ml-2 text-emerald-600">
                          • Actual: {item.actualQuantity}
                        </span>
                      )}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-gray-400 mt-1">{item.notes}</p>
                    )}
                  </div>

                  {item.recipe.costPerPortion && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Est. Cost</p>
                      <p className="font-medium text-gray-900">
                        €{(item.recipe.costPerPortion * item.targetQuantity).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {plan.status !== 'completed' && (
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={updating === item.id}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
