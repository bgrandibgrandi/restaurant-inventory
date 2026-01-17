'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChartBarIcon,
  CurrencyEuroIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  ReceiptPercentIcon,
  BanknotesIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface RecipeAnalytics {
  id: string;
  name: string;
  imageUrl: string | null;
  cost: number;
  salePrice: number | null;
  profit: number | null;
  margin: number | null;
  foodCostPercentage: number | null;
  hasSquareMapping: boolean;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface ProfitabilityData {
  summary: {
    totalRecipes: number;
    linkedToSquare: number;
    avgMargin: number;
    avgFoodCost: number;
    avgProfit: number;
  };
  marginDistribution: {
    high: number;
    good: number;
    low: number;
    critical: number;
  };
  foodCostDistribution: {
    under25: number;
    between25And30: number;
    between30And35: number;
    over35: number;
  };
  topPerformers: RecipeAnalytics[];
  bottomPerformers: RecipeAnalytics[];
  recipes: RecipeAnalytics[];
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/analytics/profitability');
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const getMarginColor = (margin: number | null) => {
    if (margin === null) return 'text-gray-400';
    if (margin >= 70) return 'text-emerald-600';
    if (margin >= 50) return 'text-blue-600';
    if (margin >= 30) return 'text-amber-600';
    return 'text-red-600';
  };

  const getMarginBg = (margin: number | null) => {
    if (margin === null) return 'bg-gray-100';
    if (margin >= 70) return 'bg-emerald-100';
    if (margin >= 50) return 'bg-blue-100';
    if (margin >= 30) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const filteredRecipes = data?.recipes.filter((r) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'linked') return r.hasSquareMapping;
    if (selectedCategory === 'unlinked') return !r.hasSquareMapping;
    if (selectedCategory === 'high') return r.margin !== null && r.margin >= 70;
    if (selectedCategory === 'good') return r.margin !== null && r.margin >= 50 && r.margin < 70;
    if (selectedCategory === 'low') return r.margin !== null && r.margin >= 30 && r.margin < 50;
    if (selectedCategory === 'critical') return r.margin !== null && r.margin < 30;
    return true;
  }) || [];

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            Menu Engineering
          </h1>
          <p className="text-gray-600 mt-1">Analyze profitability and optimize your menu</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <Squares2X2Icon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.summary.totalRecipes}</p>
                <p className="text-sm text-gray-500">Total Recipes</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.summary.linkedToSquare}</p>
                <p className="text-sm text-gray-500">Linked to POS</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <ReceiptPercentIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.avgMargin.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Avg Margin</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {data.summary.avgFoodCost.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">Avg Food Cost</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <BanknotesIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  €{data.summary.avgProfit.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500">Avg Profit</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Margin Distribution */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Margin Distribution</h2>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedCategory('high')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedCategory === 'high' ? 'bg-emerald-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-700">High (70%+)</span>
                </div>
                <span className="font-bold text-emerald-600">{data.marginDistribution.high}</span>
              </button>
              <button
                onClick={() => setSelectedCategory('good')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedCategory === 'good' ? 'bg-blue-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-700">Good (50-70%)</span>
                </div>
                <span className="font-bold text-blue-600">{data.marginDistribution.good}</span>
              </button>
              <button
                onClick={() => setSelectedCategory('low')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedCategory === 'low' ? 'bg-amber-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-gray-700">Low (30-50%)</span>
                </div>
                <span className="font-bold text-amber-600">{data.marginDistribution.low}</span>
              </button>
              <button
                onClick={() => setSelectedCategory('critical')}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedCategory === 'critical' ? 'bg-red-100' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-700">Critical (&lt;30%)</span>
                </div>
                <span className="font-bold text-red-600">{data.marginDistribution.critical}</span>
              </button>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Top Performers</h2>
            </div>
            {data.topPerformers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {data.topPerformers.map((recipe, index) => (
                  <Link
                    key={recipe.id}
                    href={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{recipe.name}</p>
                    </div>
                    <span className="font-bold text-emerald-600">
                      {recipe.margin?.toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Performers */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Need Attention</h2>
            </div>
            {data.bottomPerformers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <div className="space-y-3">
                {data.bottomPerformers.map((recipe, index) => (
                  <Link
                    key={recipe.id}
                    href={`/recipes/${recipe.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{recipe.name}</p>
                    </div>
                    <span className={`font-bold ${getMarginColor(recipe.margin)}`}>
                      {recipe.margin?.toFixed(1)}%
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Food Cost Distribution */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Food Cost Distribution</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <CheckCircleIcon className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-600">
                {data.foodCostDistribution.under25}
              </p>
              <p className="text-sm text-gray-600">Under 25%</p>
              <p className="text-xs text-emerald-600 mt-1">Excellent</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <ChartBarIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {data.foodCostDistribution.between25And30}
              </p>
              <p className="text-sm text-gray-600">25-30%</p>
              <p className="text-xs text-blue-600 mt-1">Good</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">
                {data.foodCostDistribution.between30And35}
              </p>
              <p className="text-sm text-gray-600">30-35%</p>
              <p className="text-xs text-amber-600 mt-1">Review Needed</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">
                {data.foodCostDistribution.over35}
              </p>
              <p className="text-sm text-gray-600">Over 35%</p>
              <p className="text-xs text-red-600 mt-1">Critical</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/70 text-gray-700 hover:bg-white'
            }`}
          >
            All Recipes ({data.recipes.length})
          </button>
          <button
            onClick={() => setSelectedCategory('linked')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              selectedCategory === 'linked'
                ? 'bg-purple-600 text-white'
                : 'bg-white/70 text-gray-700 hover:bg-white'
            }`}
          >
            Linked to POS ({data.summary.linkedToSquare})
          </button>
          <button
            onClick={() => setSelectedCategory('unlinked')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              selectedCategory === 'unlinked'
                ? 'bg-gray-600 text-white'
                : 'bg-white/70 text-gray-700 hover:bg-white'
            }`}
          >
            Not Linked ({data.summary.totalRecipes - data.summary.linkedToSquare})
          </button>
        </div>

        {/* Recipes Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Recipe</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Cost</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Price</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Profit</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Margin</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Food Cost %</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          {recipe.imageUrl ? (
                            <img
                              src={recipe.imageUrl}
                              alt={recipe.name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-indigo-600">
                              {recipe.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-indigo-600 truncate transition-colors">
                            {recipe.name}
                          </p>
                          {recipe.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recipe.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="px-1.5 py-0.5 text-xs rounded"
                                  style={{
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color,
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {recipe.tags.length > 2 && (
                                <span className="px-1.5 py-0.5 text-xs text-gray-400">
                                  +{recipe.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gray-900">
                      €{recipe.cost.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {recipe.salePrice !== null ? (
                        <span className="font-medium text-gray-900">
                          €{recipe.salePrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {recipe.profit !== null ? (
                        <span className={`font-medium ${recipe.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          €{recipe.profit.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {recipe.margin !== null ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold ${getMarginBg(
                            recipe.margin
                          )} ${getMarginColor(recipe.margin)}`}
                        >
                          {recipe.margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {recipe.foodCostPercentage !== null ? (
                        <span className="font-medium text-gray-700">
                          {recipe.foodCostPercentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {recipe.hasSquareMapping ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                          <CheckCircleIcon className="h-4 w-4" />
                          Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-sm">
                          Not linked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecipes.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-500">No recipes found matching the filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
