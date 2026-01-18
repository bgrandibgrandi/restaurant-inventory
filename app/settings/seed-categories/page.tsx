'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SeedCategoriesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    accountId?: string;
    countBefore?: number;
    countAfter?: number;
    newCategoriesCreated?: number;
    error?: string;
  } | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/seed-my-categories', {
        method: 'POST',
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Inicializar Categorías
          </h1>
          <p className="text-gray-600 mb-6">
            Este proceso creará todas las categorías del sistema para tu cuenta.
            Es seguro ejecutarlo múltiples veces - no duplicará categorías existentes.
          </p>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando categorías...' : 'Crear Categorías'}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <>
                  <p className="font-medium text-green-800 mb-2">
                    ✅ Categorías creadas exitosamente
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>Categorías antes: {result.countBefore}</li>
                    <li>Categorías ahora: {result.countAfter}</li>
                    <li>Nuevas creadas: {result.newCategoriesCreated}</li>
                  </ul>
                </>
              ) : (
                <p className="text-red-800">
                  ❌ Error: {result.error}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href="/items"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              ← Volver a Items
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
