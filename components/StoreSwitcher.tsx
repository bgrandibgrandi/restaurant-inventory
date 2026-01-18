'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store-context';
import { useTranslation } from '@/lib/i18n';

interface StoreSwitcherProps {
  variant?: 'header' | 'sidebar';
}

export function StoreSwitcher({ variant = 'header' }: StoreSwitcherProps) {
  const { selectedStore, stores, setSelectedStore } = useStore();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedStore || stores.length <= 1) {
    // If only one store, show badge only (no dropdown)
    if (selectedStore) {
      const singleStoreClass = variant === 'sidebar'
        ? 'flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg w-full'
        : 'flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-gray-200/50 rounded-lg';

      return (
        <div className={singleStoreClass}>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedStore.color || '#6366f1' }}
          />
          <span className="text-sm font-medium text-gray-700 truncate flex-1">
            {selectedStore.name}
          </span>
        </div>
      );
    }
    return null;
  }

  const buttonClass = variant === 'sidebar'
    ? 'flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 w-full'
    : 'flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-gray-200/50 rounded-lg transition-all duration-200';

  const dropdownClass = variant === 'sidebar'
    ? 'absolute bottom-full left-0 mb-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50'
    : 'absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200/50 shadow-lg py-1 z-50';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: selectedStore.color || '#6366f1' }}
        />
        <span className="text-sm font-medium text-gray-700 truncate flex-1 text-left">
          {selectedStore.name}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? (variant === 'sidebar' ? 'rotate-180' : 'rotate-180') : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={dropdownClass}>
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('store.switchStore')}
            </span>
          </div>
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => {
                setSelectedStore(store);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                store.id === selectedStore.id ? 'bg-blue-50' : ''
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: store.color || '#6366f1' }}
              />
              <span
                className={`text-sm flex-1 text-left truncate ${
                  store.id === selectedStore.id ? 'font-medium text-blue-700' : 'text-gray-700'
                }`}
              >
                {store.name}
              </span>
              {store.id === selectedStore.id && (
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Confirmation dialog for store switching
export function StoreSwitchConfirmDialog() {
  const {
    showStoreSwitchConfirm,
    pendingStore,
    confirmStoreSwitch,
    cancelStoreSwitch,
    isLoading,
  } = useStore();
  const { t } = useTranslation();

  if (!showStoreSwitchConfirm || !pendingStore) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${pendingStore.color}20` || '#6366f120' }}
            >
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: pendingStore.color || '#6366f1' }}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('store.switchStore')}</h3>
              <p className="text-sm text-gray-500">{pendingStore.name}</p>
            </div>
          </div>

          <p className="text-gray-600 mb-2">
            {t('store.switchStoreConfirm', { storeName: pendingStore.name })}
          </p>
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            {t('store.switchStoreWarning')}
          </p>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={cancelStoreSwitch}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={confirmStoreSwitch}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
