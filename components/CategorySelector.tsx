'use client';

import { useState, useEffect, useRef } from 'react';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  level: number;
  parentId: string | null;
  children?: Category[];
}

interface CategorySelectorProps {
  value?: string | null; // Selected category ID
  onChange: (categoryId: string | null, categoryPath: Category[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CategorySelector({
  value,
  onChange,
  placeholder = 'Select category',
  disabled = false,
  className = '',
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // confirmedPath = what's actually saved/selected
  const [confirmedPath, setConfirmedPath] = useState<Category[]>([]);
  // navigationPath = what the user is browsing (not yet confirmed)
  const [navigationPath, setNavigationPath] = useState<Category[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setError(null);
        const res = await fetch('/api/categories?tree=true');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        } else {
          setError('Error al cargar categorías');
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Error al cargar categorías');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Find and set the path for a given category ID
  useEffect(() => {
    if (value && categories.length > 0) {
      const path = findCategoryPath(categories, value);
      setConfirmedPath(path);
      setNavigationPath(path);
    } else {
      setConfirmedPath([]);
      setNavigationPath([]);
    }
  }, [value, categories]);

  // When dropdown opens, sync navigation to confirmed
  useEffect(() => {
    if (isOpen) {
      setNavigationPath(confirmedPath);
    }
  }, [isOpen, confirmedPath]);

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

  // Find the path from root to a specific category
  const findCategoryPath = (cats: Category[], targetId: string): Category[] => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return [cat];
      }
      if (cat.children && cat.children.length > 0) {
        const childPath = findCategoryPath(cat.children, targetId);
        if (childPath.length > 0) {
          return [cat, ...childPath];
        }
      }
    }
    return [];
  };

  // Handle navigation (browsing categories without confirming)
  const handleNavigate = (category: Category, level: number) => {
    const newPath = [...navigationPath.slice(0, level), category];
    setNavigationPath(newPath);

    // If the category has no children, auto-confirm the selection
    if (!category.children || category.children.length === 0) {
      confirmSelection(newPath);
    }
  };

  // Confirm the current navigation path as the selection
  const confirmSelection = (path?: Category[]) => {
    const finalPath = path || navigationPath;
    if (finalPath.length > 0) {
      const lastCategory = finalPath[finalPath.length - 1];
      setConfirmedPath(finalPath);
      onChange(lastCategory.id, finalPath);
      setIsOpen(false);
    }
  };

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmedPath([]);
    setNavigationPath([]);
    onChange(null, []);
  };

  // Get display text (from confirmed path)
  const getDisplayText = () => {
    if (confirmedPath.length === 0) return placeholder;

    return confirmedPath
      .map(cat => `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`)
      .join(' > ');
  };

  // Get categories for a specific level (based on navigation path)
  const getCategoriesForLevel = (level: number): Category[] => {
    if (level === 0) return categories;

    const parent = navigationPath[level - 1];
    if (parent && parent.children) {
      return parent.children;
    }
    return [];
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg text-left transition-all ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        <span className={`flex-1 truncate ${confirmedPath.length === 0 || error ? 'text-gray-400' : 'text-gray-900'} ${error ? 'text-red-500' : ''}`}>
          {loading ? 'Cargando...' : error ? error : getDisplayText()}
        </span>

        <div className="flex items-center gap-1">
          {confirmedPath.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex divide-x divide-gray-100 max-h-80">
            {/* Root Categories (Level 0) */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Categoría
                </span>
              </div>
              <div className="py-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleNavigate(cat, 0)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      navigationPath[0]?.id === cat.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {cat.icon && <span className="text-base">{cat.icon}</span>}
                    <span className="flex-1 truncate">{cat.name}</span>
                    {cat.children && cat.children.length > 0 && (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Family Categories (Level 1) */}
            {navigationPath.length > 0 && getCategoriesForLevel(1).length > 0 && (
              <div className="flex-1 min-w-0 overflow-y-auto bg-gray-50/50">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Familia
                  </span>
                </div>
                <div className="py-1">
                  {getCategoriesForLevel(1).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleNavigate(cat, 1)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        navigationPath[1]?.id === cat.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {cat.icon && <span className="text-base">{cat.icon}</span>}
                      <span className="flex-1 truncate">{cat.name}</span>
                      {cat.children && cat.children.length > 0 && (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subfamily Categories (Level 2) */}
            {navigationPath.length > 1 && getCategoriesForLevel(2).length > 0 && (
              <div className="flex-1 min-w-0 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Subfamilia
                  </span>
                </div>
                <div className="py-1">
                  {getCategoriesForLevel(2).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleNavigate(cat, 2)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        navigationPath[2]?.id === cat.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {cat.icon && <span className="text-base">{cat.icon}</span>}
                      <span className="flex-1 truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer with navigation path and confirm button */}
          {navigationPath.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {navigationPath.map((cat, i) => (
                    <span key={cat.id}>
                      {i > 0 && <span className="mx-1">{'>'}</span>}
                      <span className={i === navigationPath.length - 1 ? 'font-medium text-gray-700' : ''}>
                        {cat.name}
                      </span>
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => confirmSelection()}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 bg-indigo-50 rounded"
                >
                  Seleccionar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
