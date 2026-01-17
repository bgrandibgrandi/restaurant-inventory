'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Item {
  id: string;
  name: string;
  unit: string;
  category: { name: string } | null;
  costPrice: number | null;
}

interface Category {
  id: string;
  name: string;
}

interface SubRecipe {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUnit: string;
}

interface Ingredient {
  id: string;
  type: 'item' | 'subrecipe';
  itemId?: string;
  subRecipeId?: string;
  name: string;
  quantity: string;
  unit: string;
  wasteFactor: string;
  notes: string;
}

interface ExistingRecipe {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  yieldQuantity: number;
  yieldUnit: string;
  categoryId: string | null;
  isSubRecipe: boolean;
  instructions: string | null;
  prepTime: number | null;
  cookTime: number | null;
  ingredients: {
    id: string;
    quantity: number;
    unit: string;
    notes: string | null;
    wasteFactor: number;
    item: { id: string; name: string; unit: string } | null;
    subRecipe: { id: string; name: string; yieldQuantity: number; yieldUnit: string } | null;
  }[];
}

const COMMON_UNITS = ['kg', 'g', 'L', 'ml', 'units', 'portions', 'pieces', 'tbsp', 'tsp', 'cups'];

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    yieldQuantity: '1',
    yieldUnit: 'portions',
    categoryId: '',
    isSubRecipe: false,
    instructions: '',
    prepTime: '',
    cookTime: '',
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchType, setSearchType] = useState<'item' | 'subrecipe'>('item');
  const [improving, setImproving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [recipeRes, itemsRes, categoriesRes, recipesRes] = await Promise.all([
        fetch(`/api/recipes/${params.id}`),
        fetch('/api/items'),
        fetch('/api/categories'),
        fetch('/api/recipes?includeSubRecipes=true'),
      ]);

      if (!recipeRes.ok) {
        router.push('/recipes');
        return;
      }

      const recipe: ExistingRecipe = await recipeRes.json();

      // Populate form with existing recipe data
      setFormData({
        name: recipe.name,
        description: recipe.description || '',
        imageUrl: recipe.imageUrl || '',
        yieldQuantity: recipe.yieldQuantity.toString(),
        yieldUnit: recipe.yieldUnit,
        categoryId: recipe.categoryId || '',
        isSubRecipe: recipe.isSubRecipe,
        instructions: recipe.instructions || '',
        prepTime: recipe.prepTime?.toString() || '',
        cookTime: recipe.cookTime?.toString() || '',
      });

      // Convert existing ingredients to local format
      setIngredients(
        recipe.ingredients.map((ing) => ({
          id: ing.id,
          type: ing.item ? 'item' : 'subrecipe',
          itemId: ing.item?.id,
          subRecipeId: ing.subRecipe?.id,
          name: ing.item?.name || ing.subRecipe?.name || '',
          quantity: ing.quantity.toString(),
          unit: ing.unit,
          wasteFactor: (ing.wasteFactor * 100).toString(),
          notes: ing.notes || '',
        }))
      );

      if (itemsRes.ok) {
        setItems(await itemsRes.json());
      }
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
      if (recipesRes.ok) {
        const recipes = await recipesRes.json();
        // Filter out current recipe from sub-recipes list
        setSubRecipes(
          recipes
            .filter((r: any) => r.isSubRecipe && r.id !== params.id)
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              yieldQuantity: r.yieldQuantity,
              yieldUnit: r.yieldUnit,
            }))
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/recipes');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = (type: 'item' | 'subrecipe', data: Item | SubRecipe) => {
    const newIngredient: Ingredient = {
      id: crypto.randomUUID(),
      type,
      name: data.name,
      quantity: '',
      unit: type === 'item' ? (data as Item).unit : (data as SubRecipe).yieldUnit,
      wasteFactor: '0',
      notes: '',
      ...(type === 'item'
        ? { itemId: data.id }
        : { subRecipeId: data.id }),
    };
    setIngredients([...ingredients, newIngredient]);
    setShowIngredientSearch(false);
    setIngredientSearch('');
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const handleImproveText = async () => {
    if (!formData.name && !formData.description && !formData.instructions) {
      alert('No text to improve');
      return;
    }

    setImproving(true);
    try {
      const response = await fetch('/api/recipes/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || null,
          description: formData.description || null,
          instructions: formData.instructions || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...formData,
          name: data.improved.name || formData.name,
          description: data.improved.description || formData.description,
          instructions: data.improved.instructions || formData.instructions,
        });
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to improve text');
      }
    } catch (error) {
      console.error('Error improving text:', error);
      alert('An error occurred');
    } finally {
      setImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Recipe name is required');
      return;
    }

    if (ingredients.length === 0) {
      alert('Add at least one ingredient');
      return;
    }

    // Validate all ingredients have quantities
    const invalidIngredients = ingredients.filter((ing) => !ing.quantity || parseFloat(ing.quantity) <= 0);
    if (invalidIngredients.length > 0) {
      alert('All ingredients must have a valid quantity');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/recipes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          imageUrl: formData.imageUrl || null,
          yieldQuantity: parseFloat(formData.yieldQuantity) || 1,
          yieldUnit: formData.yieldUnit,
          categoryId: formData.categoryId || null,
          isSubRecipe: formData.isSubRecipe,
          instructions: formData.instructions.trim() || null,
          prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
          cookTime: formData.cookTime ? parseInt(formData.cookTime) : null,
          ingredients: ingredients.map((ing) => ({
            itemId: ing.type === 'item' ? ing.itemId : null,
            subRecipeId: ing.type === 'subrecipe' ? ing.subRecipeId : null,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            wasteFactor: parseFloat(ing.wasteFactor) / 100 || 0,
            notes: ing.notes.trim() || null,
          })),
        }),
      });

      if (response.ok) {
        router.push(`/recipes/${params.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update recipe');
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const filteredSubRecipes = subRecipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href={`/recipes/${params.id}`} className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Edit Recipe</h1>
            </div>
            <button
              type="button"
              onClick={handleImproveText}
              disabled={improving}
              className="inline-flex items-center px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium rounded-lg transition disabled:opacity-50"
              title="Fix typos and improve formatting with AI"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {improving ? 'Improving...' : 'Fix Typos'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipe Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Classic Burger"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the recipe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipe Image
                </label>
                <div className="flex items-start gap-4">
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={formData.imageUrl}
                        alt="Recipe"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="mt-1 text-xs text-gray-500">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              alert('Image must be less than 2MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData({ ...formData, imageUrl: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. Max 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yield Quantity
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.yieldQuantity}
                    onChange={(e) => setFormData({ ...formData, yieldQuantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yield Unit
                  </label>
                  <select
                    value={formData.yieldUnit}
                    onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="portions">portions</option>
                    <option value="servings">servings</option>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isSubRecipe"
                  checked={formData.isSubRecipe}
                  onChange={(e) => setFormData({ ...formData, isSubRecipe: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isSubRecipe" className="text-sm text-gray-700">
                  This is a sub-recipe/prep item (used as ingredient in other recipes)
                </label>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Ingredients</h2>
              <button
                type="button"
                onClick={() => setShowIngredientSearch(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No ingredients added yet</p>
                <button
                  type="button"
                  onClick={() => setShowIngredientSearch(true)}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Add your first ingredient
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {ingredients.map((ing, index) => (
                  <div key={ing.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-gray-400 mt-2">
                        {index + 1}.
                      </span>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{ing.name}</span>
                            {ing.type === 'subrecipe' && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                                Sub-recipe
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIngredient(ing.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Quantity *</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit</label>
                            <select
                              value={ing.unit}
                              onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              {COMMON_UNITS.map((unit) => (
                                <option key={unit} value={unit}>{unit}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Waste %</label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={ing.wasteFactor}
                              onChange={(e) => updateIngredient(ing.id, 'wasteFactor', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Notes</label>
                            <input
                              type="text"
                              value={ing.notes}
                              onChange={(e) => updateIngredient(ing.id, 'notes', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              placeholder="diced, etc."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details (Optional)</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prep Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.prepTime}
                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cook Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cookTime}
                    onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Step by step cooking instructions..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/recipes/${params.id}`}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>

      {/* Ingredient Search Modal */}
      {showIngredientSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Ingredient</h3>
              <button
                type="button"
                onClick={() => {
                  setShowIngredientSearch(false);
                  setIngredientSearch('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSearchType('item')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    searchType === 'item'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Inventory Items
                </button>
                <button
                  type="button"
                  onClick={() => setSearchType('subrecipe')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                    searchType === 'subrecipe'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Sub-recipes
                </button>
              </div>
              <input
                type="text"
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                placeholder={searchType === 'item' ? 'Search items...' : 'Search sub-recipes...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {searchType === 'item' ? (
                filteredItems.length > 0 ? (
                  <div className="space-y-2">
                    {filteredItems.slice(0, 20).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addIngredient('item', item)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                      >
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.unit} {item.category && `• ${item.category.name}`}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    {ingredientSearch ? 'No items found' : 'Start typing to search'}
                  </p>
                )
              ) : (
                filteredSubRecipes.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSubRecipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => addIngredient('subrecipe', recipe)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition"
                      >
                        <div className="font-medium text-gray-900">{recipe.name}</div>
                        <div className="text-sm text-gray-500">
                          Yields {recipe.yieldQuantity} {recipe.yieldUnit}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    {subRecipes.length === 0
                      ? 'No sub-recipes created yet'
                      : ingredientSearch
                      ? 'No sub-recipes found'
                      : 'Start typing to search'}
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
