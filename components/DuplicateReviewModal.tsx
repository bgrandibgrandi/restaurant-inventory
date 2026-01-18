'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  unit: string;
  costPrice: number | null;
  category: Category | null;
  supplier: Supplier | null;
}

interface DuplicateCandidate {
  id: string;
  itemId: string;
  matchedItemId: string;
  matchType: string;
  confidence: number;
  status: string;
  item: Item;
  matchedItem: Item;
}

interface AffectedData {
  recipes: { id: string; name: string }[];
  invoiceItems: number;
  stockMovements: number;
  stockEntries: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

export function DuplicateReviewModal({ isOpen, onClose, onResolved }: Props) {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [action, setAction] = useState<'idle' | 'merging' | 'dismissing'>('idle');
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergeDirection, setMergeDirection] = useState<'keep-item' | 'keep-matched'>('keep-matched');
  const [affected, setAffected] = useState<AffectedData | null>(null);
  const [loadingAffected, setLoadingAffected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDuplicates();
    }
  }, [isOpen]);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/items/duplicates');
      if (response.ok) {
        const data = await response.json();
        setDuplicates(data);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentDuplicate = duplicates[currentIndex];

  const fetchAffectedData = async (itemToRemoveId: string, itemToKeepId: string) => {
    setLoadingAffected(true);
    try {
      const response = await fetch(
        `/api/items/merge?itemToRemove=${itemToRemoveId}&itemToKeep=${itemToKeepId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAffected(data);
      }
    } catch (error) {
      console.error('Error fetching affected data:', error);
    } finally {
      setLoadingAffected(false);
    }
  };

  const handleStartMerge = async (direction: 'keep-item' | 'keep-matched') => {
    if (!currentDuplicate) return;
    setMergeDirection(direction);
    setShowMergeConfirm(true);

    const itemToRemove = direction === 'keep-matched' ? currentDuplicate.item : currentDuplicate.matchedItem;
    const itemToKeep = direction === 'keep-matched' ? currentDuplicate.matchedItem : currentDuplicate.item;

    await fetchAffectedData(itemToRemove.id, itemToKeep.id);
  };

  const handleConfirmMerge = async () => {
    if (!currentDuplicate) return;
    setAction('merging');

    const itemToRemove = mergeDirection === 'keep-matched' ? currentDuplicate.item : currentDuplicate.matchedItem;
    const itemToKeep = mergeDirection === 'keep-matched' ? currentDuplicate.matchedItem : currentDuplicate.item;

    try {
      const response = await fetch('/api/items/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemToRemoveId: itemToRemove.id,
          itemToKeepId: itemToKeep.id,
          confirmed: true,
        }),
      });

      if (response.ok) {
        handleNext();
        onResolved();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al fusionar items');
      }
    } catch (error) {
      console.error('Error merging items:', error);
      alert('Error al fusionar items');
    } finally {
      setAction('idle');
      setShowMergeConfirm(false);
      setAffected(null);
    }
  };

  const handleDismiss = async () => {
    if (!currentDuplicate) return;
    setAction('dismissing');

    try {
      const response = await fetch('/api/items/duplicates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duplicateId: currentDuplicate.id,
          action: 'dismiss',
        }),
      });

      if (response.ok) {
        handleNext();
        onResolved();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al descartar duplicado');
      }
    } catch (error) {
      console.error('Error dismissing duplicate:', error);
      alert('Error al descartar duplicado');
    } finally {
      setAction('idle');
    }
  };

  const handleNext = () => {
    const newDuplicates = duplicates.filter((_, i) => i !== currentIndex);
    setDuplicates(newDuplicates);
    if (currentIndex >= newDuplicates.length) {
      setCurrentIndex(Math.max(0, newDuplicates.length - 1));
    }
  };

  const getMatchTypeLabel = (matchType: string): string => {
    const labels: Record<string, string> = {
      exact_barcode: 'Código de barras idéntico',
      exact_sku: 'SKU de proveedor idéntico',
      name_similarity: 'Nombre similar',
      name_category: 'Nombre similar + misma categoría',
    };
    return labels[matchType] || matchType;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-red-600 bg-red-100';
    if (confidence >= 0.8) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revisar duplicados</h2>
            <p className="text-sm text-gray-500 mt-1">
              {duplicates.length > 0
                ? `${currentIndex + 1} de ${duplicates.length} pendiente(s)`
                : 'No hay duplicados pendientes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-500">Cargando duplicados...</p>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay duplicados pendientes</h3>
              <p className="text-gray-500">Todos los posibles duplicados han sido revisados.</p>
            </div>
          ) : currentDuplicate ? (
            <div className="space-y-6">
              {/* Match info */}
              <div className="flex items-center justify-center gap-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getConfidenceColor(currentDuplicate.confidence)}`}>
                  {Math.round(currentDuplicate.confidence * 100)}% coincidencia
                </span>
                <span className="text-sm text-gray-500">
                  {getMatchTypeLabel(currentDuplicate.matchType)}
                </span>
              </div>

              {/* Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Item 1 */}
                <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Item A</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{currentDuplicate.item.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Unidad:</span>
                      <span className="font-medium">{currentDuplicate.item.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Categoría:</span>
                      <span className="font-medium">{currentDuplicate.item.category?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Proveedor:</span>
                      <span className="font-medium">{currentDuplicate.item.supplier?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Precio:</span>
                      <span className="font-medium">
                        {currentDuplicate.item.costPrice ? `€${currentDuplicate.item.costPrice.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartMerge('keep-item')}
                    disabled={action !== 'idle'}
                    className="w-full mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50"
                  >
                    Conservar este
                  </button>
                </div>

                {/* Item 2 */}
                <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Item B</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{currentDuplicate.matchedItem.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Unidad:</span>
                      <span className="font-medium">{currentDuplicate.matchedItem.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Categoría:</span>
                      <span className="font-medium">{currentDuplicate.matchedItem.category?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Proveedor:</span>
                      <span className="font-medium">{currentDuplicate.matchedItem.supplier?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Precio:</span>
                      <span className="font-medium">
                        {currentDuplicate.matchedItem.costPrice ? `€${currentDuplicate.matchedItem.costPrice.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartMerge('keep-matched')}
                    disabled={action !== 'idle'}
                    className="w-full mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50"
                  >
                    Conservar este
                  </button>
                </div>
              </div>

              {/* Not duplicate button */}
              <div className="text-center">
                <button
                  onClick={handleDismiss}
                  disabled={action !== 'idle'}
                  className="px-6 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium rounded-xl transition disabled:opacity-50"
                >
                  {action === 'dismissing' ? 'Descartando...' : 'No son duplicados'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer with navigation */}
        {duplicates.length > 1 && (
          <div className="p-4 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(duplicates.length - 1, currentIndex + 1))}
              disabled={currentIndex === duplicates.length - 1}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Merge confirmation modal */}
      {showMergeConfirm && currentDuplicate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Confirmar fusión</h3>
            </div>
            <div className="p-6">
              {loadingAffected ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                </div>
              ) : affected ? (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Se eliminará <strong>"{mergeDirection === 'keep-matched' ? currentDuplicate.item.name : currentDuplicate.matchedItem.name}"</strong> y
                    se conservará <strong>"{mergeDirection === 'keep-matched' ? currentDuplicate.matchedItem.name : currentDuplicate.item.name}"</strong>.
                  </p>

                  {affected.recipes.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {affected.recipes.length} receta(s) serán actualizadas:
                      </div>
                      <ul className="text-sm text-yellow-700 space-y-1 ml-7">
                        {affected.recipes.slice(0, 5).map((r) => (
                          <li key={r.id}>{r.name}</li>
                        ))}
                        {affected.recipes.length > 5 && (
                          <li className="text-yellow-600">...y {affected.recipes.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {(affected.stockMovements > 0 || affected.stockEntries > 0) && (
                    <p className="text-sm text-gray-500">
                      También se actualizarán {affected.stockMovements} movimiento(s) y {affected.stockEntries} entrada(s) de stock.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowMergeConfirm(false);
                  setAffected(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMerge}
                disabled={action === 'merging' || loadingAffected}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50"
              >
                {action === 'merging' ? 'Fusionando...' : 'Confirmar fusión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
