'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  CalendarIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
  PlayIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

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
  items: Array<{
    id: string;
    recipe: {
      id: string;
      name: string;
    };
    completedAt: string | null;
  }>;
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
}

interface Store {
  id: string;
  name: string;
}

export default function PrepPlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prepPlans, setPrepPlans] = useState<PrepPlan[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, storesRes] = await Promise.all([
          fetch('/api/prep-plans'),
          fetch('/api/stores'),
        ]);

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPrepPlans(plansData);
        }

        if (storesRes.ok) {
          const storesData = await storesRes.json();
          setStores(storesData);
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

  const fetchPlans = async () => {
    const params = new URLSearchParams();
    if (selectedStore) params.append('storeId', selectedStore);
    if (selectedStatus) params.append('status', selectedStatus);

    const res = await fetch(`/api/prep-plans?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setPrepPlans(data);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPlans();
    }
  }, [selectedStore, selectedStatus]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prep plan?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/prep-plans/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPrepPlans((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    } finally {
      setDeletingId(null);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'in_progress':
        return <PlayIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Stats
  const totalPlans = prepPlans.length;
  const activePlans = prepPlans.filter((p) => p.status === 'in_progress').length;
  const completedToday = prepPlans.filter(
    (p) =>
      p.status === 'completed' &&
      new Date(p.planDate).toDateString() === new Date().toDateString()
  ).length;
  const totalItemsToday = prepPlans
    .filter((p) => new Date(p.planDate).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + p.totalItems, 0);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Prep Planning
            </h1>
            <p className="text-gray-600 mt-1">Plan and track your daily prep work</p>
          </div>
          <Link
            href="/prep/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200"
          >
            <PlusIcon className="h-5 w-5" />
            New Prep Plan
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalPlans}</p>
                <p className="text-sm text-gray-500">Total Plans</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <PlayIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activePlans}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
                <p className="text-sm text-gray-500">Completed Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalItemsToday}</p>
                <p className="text-sm text-gray-500">Items Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Plans List */}
        {prepPlans.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-12 border border-white/50 shadow-lg text-center">
            <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No prep plans yet</h3>
            <p className="text-gray-500 mb-6">Create your first prep plan to get started</p>
            <Link
              href="/prep/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-all"
            >
              <PlusIcon className="h-5 w-5" />
              Create Prep Plan
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {prepPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/prep/${plan.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors truncate"
                        >
                          {plan.name}
                        </Link>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            plan.status
                          )}`}
                        >
                          {getStatusIcon(plan.status)}
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
                        <span className="flex items-center gap-1.5">
                          <ClipboardDocumentListIcon className="h-4 w-4" />
                          {plan.completedItems}/{plan.totalItems} items
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress Ring */}
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke={plan.completionPercentage === 100 ? '#10b981' : '#6366f1'}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${(plan.completionPercentage / 100) * 150.8} 150.8`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-900">
                            {Math.round(plan.completionPercentage)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(plan.id)}
                          disabled={deletingId === plan.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                        <Link
                          href={`/prep/${plan.id}`}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  {plan.notes && (
                    <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                      {plan.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
