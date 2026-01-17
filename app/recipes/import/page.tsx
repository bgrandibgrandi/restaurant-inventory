'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  unit: string;
}

interface Category {
  id: string;
  name: string;
}

interface ImportedIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  matchedItemId: string | null;
  matchedItemName: string | null;
}

interface ImportedRecipe {
  name: string;
  description: string | null;
  yieldQuantity: number;
  yieldUnit: string;
  prepTime: number | null;
  cookTime: number | null;
  instructions: string | null;
  suggestedCategory: string | null;
  matchedCategoryId: string | null;
  ingredients: ImportedIngredient[];
}

type ImportMode = 'photo' | 'text';

export default function ImportRecipePage() {
  const router = useRouter();
  const [mode, setMode] = useState<ImportMode>('photo');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  // Imported recipe state
  const [importedRecipe, setImportedRecipe] = useState<ImportedRecipe | null>(null);

  // Reference data
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/categories'),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImport = async () => {
    if (mode === 'photo' && !imagePreview) {
      setError('Please upload an image');
      return;
    }
    if (mode === 'text' && !textInput.trim()) {
      setError('Please enter recipe text');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: mode === 'photo' ? imagePreview : undefined,
          text: mode === 'text' ? textInput : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setImportedRecipe(data.recipe);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to import recipe');
      }
    } catch (error) {
      console.error('Error importing recipe:', error);
      setError('An error occurred while importing');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!importedRecipe) return;

    setSaving(true);
    try {
      // Build ingredients array with matched items
      const ingredients = importedRecipe.ingredients.map((ing) => ({
        itemId: ing.matchedItemId || null,
        subRecipeId: null,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || null,
        wasteFactor: 0,
      }));

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importedRecipe.name,
          description: importedRecipe.description,
          yieldQuantity: importedRecipe.yieldQuantity,
          yieldUnit: importedRecipe.yieldUnit,
          categoryId: importedRecipe.matchedCategoryId,
          isSubRecipe: false,
          instructions: importedRecipe.instructions,
          prepTime: importedRecipe.prepTime,
          cookTime: importedRecipe.cookTime,
          ingredients,
        }),
      });

      if (response.ok) {
        const recipe = await response.json();
        router.push(`/recipes/${recipe.id}/edit`);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to save recipe');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const updateIngredientMatch = (index: number, itemId: string | null) => {
    if (!importedRecipe) return;
    const item = items.find((i) => i.id === itemId);
    const updatedIngredients = [...importedRecipe.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      matchedItemId: itemId,
      matchedItemName: item?.name || null,
    };
    setImportedRecipe({ ...importedRecipe, ingredients: updatedIngredients });
  };

  const updateRecipeField = (field: keyof ImportedRecipe, value: any) => {
    if (!importedRecipe) return;
    setImportedRecipe({ ...importedRecipe, [field]: value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/recipes" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Import Recipe</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!importedRecipe ? (
          <>
            {/* Mode Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Import From</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setMode('photo');
                    setError(null);
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition ${
                    mode === 'photo'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-900">Photo / PDF</span>
                  <p className="text-xs text-gray-500 mt-1">Upload cookbook page or handwritten recipe</p>
                </button>
                <button
                  onClick={() => {
                    setMode('text');
                    setError(null);
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 transition ${
                    mode === 'text'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-gray-900">Text / URL</span>
                  <p className="text-xs text-gray-500 mt-1">Paste recipe text or website content</p>
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              {mode === 'photo' ? (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Recipe Image</h2>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Recipe preview"
                        className="max-h-96 mx-auto rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => setImagePreview(null)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Paste Recipe Text</h2>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Paste recipe text here...

Example:
Classic Margherita Pizza

Ingredients:
- 500g pizza dough
- 200g tomato sauce
- 200g fresh mozzarella
- Fresh basil leaves
- 2 tbsp olive oil

Instructions:
1. Preheat oven to 250°C
2. Stretch dough into a circle
3. Spread tomato sauce
..."
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={importing || (mode === 'photo' ? !imagePreview : !textInput.trim())}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing with AI...
                </span>
              ) : (
                'Import Recipe'
              )}
            </button>
          </>
        ) : (
          <>
            {/* Review Imported Recipe */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Recipe extracted! Review and edit before saving.</span>
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    value={importedRecipe.name}
                    onChange={(e) => updateRecipeField('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={importedRecipe.description || ''}
                    onChange={(e) => updateRecipeField('description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yield</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={importedRecipe.yieldQuantity}
                        onChange={(e) => updateRecipeField('yieldQuantity', parseFloat(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={importedRecipe.yieldUnit}
                        onChange={(e) => updateRecipeField('yieldUnit', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={importedRecipe.matchedCategoryId || ''}
                      onChange={(e) => updateRecipeField('matchedCategoryId', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {importedRecipe.suggestedCategory && !importedRecipe.matchedCategoryId && (
                      <p className="text-xs text-orange-600 mt-1">
                        Suggested: {importedRecipe.suggestedCategory}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                    <input
                      type="number"
                      value={importedRecipe.prepTime || ''}
                      onChange={(e) => updateRecipeField('prepTime', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cook Time (min)</label>
                    <input
                      type="number"
                      value={importedRecipe.cookTime || ''}
                      onChange={(e) => updateRecipeField('cookTime', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ingredients ({importedRecipe.ingredients.length})
              </h2>
              <div className="space-y-3">
                {importedRecipe.ingredients.map((ing, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {ing.quantity} {ing.unit} {ing.name}
                          </span>
                          {ing.notes && (
                            <span className="text-sm text-gray-500">({ing.notes})</span>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Link to inventory item:</label>
                          <select
                            value={ing.matchedItemId || ''}
                            onChange={(e) => updateIngredientMatch(index, e.target.value || null)}
                            className={`w-full px-3 py-1.5 border rounded-lg text-sm ${
                              ing.matchedItemId
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-300'
                            }`}
                          >
                            <option value="">-- Not linked (will skip costing) --</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Tip: Link ingredients to inventory items to enable cost calculation. You can add unlinked items later.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
              <textarea
                value={importedRecipe.instructions || ''}
                onChange={(e) => updateRecipeField('instructions', e.target.value)}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveRecipe}
                disabled={saving || !importedRecipe.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Edit Recipe'}
              </button>
              <button
                onClick={() => {
                  setImportedRecipe(null);
                  setImagePreview(null);
                  setTextInput('');
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg transition"
              >
                Start Over
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
