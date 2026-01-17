'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

interface SquareSuggestion {
  id: string;
  squareId: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  storeName: string | null;
  hasRecipe: boolean;
  linkedRecipeId: string | null;
  variations: {
    id: string;
    name: string;
    price: number | null;
    hasRecipe: boolean;
  }[];
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

interface RecipeStep {
  id: string;
  title: string;
  instruction: string;
  imageUrl: string;
  duration: string;
  notes: string;
}

const COMMON_UNITS = ['kg', 'g', 'L', 'ml', 'units', 'portions', 'pieces', 'tbsp', 'tsp', 'cups'];
const COMMON_EQUIPMENT = [
  'Cutting Board', 'Chef Knife', 'Mixing Bowl', 'Saucepan', 'Frying Pan', 'Baking Sheet',
  'Whisk', 'Spatula', 'Tongs', 'Measuring Cups', 'Measuring Spoons', 'Blender',
  'Food Processor', 'Stand Mixer', 'Oven', 'Stovetop', 'Grill', 'Deep Fryer',
  'Thermometer', 'Timer', 'Strainer', 'Colander', 'Rolling Pin', 'Peeler'
];

export default function NewRecipePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subRecipes, setSubRecipes] = useState<SubRecipe[]>([]);
  const [currentSection, setCurrentSection] = useState(0);

  // Square suggestions
  const [squareSuggestions, setSquareSuggestions] = useState<SquareSuggestion[]>([]);
  const [squareSearch, setSquareSearch] = useState('');
  const [showSquareDropdown, setShowSquareDropdown] = useState(false);
  const [selectedSquareItem, setSelectedSquareItem] = useState<SquareSuggestion | null>(null);
  const [loadingSquare, setLoadingSquare] = useState(false);
  const squareInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    yieldQuantity: '1',
    yieldUnit: 'portions',
    categoryId: '',
    isSubRecipe: false,
    prepTime: '',
    cookTime: '',
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchType, setSearchType] = useState<'item' | 'subrecipe'>('item');
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  const sections = [
    { id: 'basics', title: 'Basics', icon: '1' },
    { id: 'ingredients', title: 'Ingredients', icon: '2' },
    { id: 'steps', title: 'Instructions', icon: '3' },
    { id: 'details', title: 'Details', icon: '4' },
  ];

  useEffect(() => {
    fetchData();
    fetchSquareSuggestions('');
  }, []);

  useEffect(() => {
    if (squareSearch.length >= 0) {
      const debounce = setTimeout(() => {
        fetchSquareSuggestions(squareSearch);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [squareSearch]);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes, recipesRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/categories'),
        fetch('/api/recipes?includeSubRecipes=true'),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (recipesRes.ok) {
        const recipes = await recipesRes.json();
        setSubRecipes(
          recipes
            .filter((r: any) => r.isSubRecipe)
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
    }
  };

  const fetchSquareSuggestions = async (query: string) => {
    setLoadingSquare(true);
    try {
      const response = await fetch(`/api/recipes/suggestions?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setSquareSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching Square suggestions:', error);
    } finally {
      setLoadingSquare(false);
    }
  };

  const selectSquareItem = (item: SquareSuggestion) => {
    setSelectedSquareItem(item);
    setFormData({ ...formData, name: item.name });
    setSquareSearch(item.name);
    setShowSquareDropdown(false);
  };

  const clearSquareSelection = () => {
    setSelectedSquareItem(null);
    setSquareSearch('');
    setFormData({ ...formData, name: '' });
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
      ...(type === 'item' ? { itemId: data.id } : { subRecipeId: data.id }),
    };
    setIngredients([...ingredients, newIngredient]);
    setShowIngredientSearch(false);
    setIngredientSearch('');
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        title: '',
        instruction: '',
        imageUrl: '',
        duration: '',
        notes: '',
      },
    ]);
  };

  const updateStep = (id: string, field: keyof RecipeStep, value: string) => {
    setSteps(steps.map((step) => (step.id === id ? { ...step, [field]: value } : step)));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((step) => step.id !== id));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < steps.length) {
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      setSteps(newSteps);
    }
  };

  const toggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const handleImageUpload = (file: File, callback: (url: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Recipe name is required');
      setCurrentSection(0);
      return;
    }

    if (ingredients.length === 0) {
      alert('Add at least one ingredient');
      setCurrentSection(1);
      return;
    }

    const invalidIngredients = ingredients.filter(
      (ing) => !ing.quantity || parseFloat(ing.quantity) <= 0
    );
    if (invalidIngredients.length > 0) {
      alert('All ingredients must have a valid quantity');
      setCurrentSection(1);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          imageUrl: formData.imageUrl || null,
          yieldQuantity: parseFloat(formData.yieldQuantity) || 1,
          yieldUnit: formData.yieldUnit,
          categoryId: formData.categoryId || null,
          isSubRecipe: formData.isSubRecipe,
          prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
          cookTime: formData.cookTime ? parseInt(formData.cookTime) : null,
          squareItemId: selectedSquareItem?.squareId || null,
          equipment: equipment.length > 0 ? equipment : null,
          ingredients: ingredients.map((ing) => ({
            itemId: ing.type === 'item' ? ing.itemId : null,
            subRecipeId: ing.type === 'subrecipe' ? ing.subRecipeId : null,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            wasteFactor: parseFloat(ing.wasteFactor) / 100 || 0,
            notes: ing.notes.trim() || null,
          })),
          steps: steps
            .filter((s) => s.instruction.trim())
            .map((step) => ({
              title: step.title.trim() || null,
              instruction: step.instruction.trim(),
              imageUrl: step.imageUrl || null,
              duration: step.duration ? parseInt(step.duration) : null,
              notes: step.notes.trim() || null,
            })),
        }),
      });

      if (response.ok) {
        const recipe = await response.json();
        router.push(`/recipes/${recipe.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create recipe');
      }
    } catch (error) {
      console.error('Error creating recipe:', error);
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

  const filteredSquareSuggestions = squareSuggestions.filter(
    (s) => !s.hasRecipe || squareSearch.length > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/recipes" className="text-gray-500 hover:text-gray-700 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Create Recipe
                </h1>
                <p className="text-xs text-gray-500">Design your culinary masterpiece</p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Recipe
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => setCurrentSection(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                  currentSection === index
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : index < currentSection
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentSection === index
                    ? 'bg-white/20'
                    : index < currentSection
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {index < currentSection ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    section.icon
                  )}
                </span>
                <span className="font-medium hidden sm:inline">{section.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* Section 1: Basics */}
          {currentSection === 0 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Recipe Name with Square Suggestions */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Recipe Name</h2>
                    <p className="text-sm text-gray-500">Select from Square menu items or enter a custom name</p>
                  </div>
                </div>

                <div className="relative">
                  {selectedSquareItem ? (
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{selectedSquareItem.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Square Item
                          </span>
                          {selectedSquareItem.categoryName && (
                            <span>{selectedSquareItem.categoryName}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearSquareSelection}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          ref={squareInputRef}
                          type="text"
                          value={formData.name || squareSearch}
                          onChange={(e) => {
                            setSquareSearch(e.target.value);
                            setFormData({ ...formData, name: e.target.value });
                            setShowSquareDropdown(true);
                          }}
                          onFocus={() => setShowSquareDropdown(true)}
                          className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          placeholder="Search Square menu items or type a name..."
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {loadingSquare ? (
                            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {showSquareDropdown && filteredSquareSuggestions.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto">
                          <div className="p-2 border-b border-gray-100">
                            <p className="text-xs font-medium text-gray-500 px-2">Square Menu Items</p>
                          </div>
                          {filteredSquareSuggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectSquareItem(item)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                item.hasRecipe ? 'bg-gray-100' : 'bg-blue-100'
                              }`}>
                                <svg className={`w-4 h-4 ${item.hasRecipe ? 'text-gray-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                  {item.categoryName && <span>{item.categoryName}</span>}
                                  {item.hasRecipe && (
                                    <span className="text-xs text-orange-600">(Recipe exists)</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setShowSquareDropdown(false)}
                            className="w-full text-left px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition text-sm text-gray-600"
                          >
                            <span className="font-medium">Use "{formData.name || squareSearch}" as custom name</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Cover Image */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Cover Photo</h2>
                    <p className="text-sm text-gray-500">Add a beautiful photo of the finished dish</p>
                  </div>
                </div>

                {formData.imageUrl ? (
                  <div className="relative group">
                    <img
                      src={formData.imageUrl}
                      alt="Recipe"
                      className="w-full h-64 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition group">
                    <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mb-4 transition">
                      <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-gray-600 font-medium">Click to upload cover photo</span>
                    <span className="text-sm text-gray-400 mt-1">PNG, JPG up to 2MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, (url) => setFormData({ ...formData, imageUrl: url }));
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Description */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Description</h2>
                    <p className="text-sm text-gray-500">Tell us about this dish</p>
                  </div>
                </div>

                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
                  placeholder="A brief description of the dish, its origin, or what makes it special..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentSection(1)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
                >
                  Next: Ingredients
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Ingredients */}
          {currentSection === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Ingredients</h2>
                      <p className="text-sm text-gray-500">{ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} added</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIngredientSearch(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Ingredient
                  </button>
                </div>

                {ingredients.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No ingredients yet</h3>
                    <p className="text-gray-500 mb-4">Add ingredients from your inventory or sub-recipes</p>
                    <button
                      type="button"
                      onClick={() => setShowIngredientSearch(true)}
                      className="text-green-600 hover:text-green-700 font-semibold"
                    >
                      Add your first ingredient
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ingredients.map((ing, index) => (
                      <div key={ing.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{ing.name}</span>
                                {ing.type === 'subrecipe' && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                                    Sub-recipe
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeIngredient(ing.id)}
                                className="text-gray-400 hover:text-red-500 transition"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={ing.quantity}
                                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                                <select
                                  value={ing.unit}
                                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {COMMON_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Waste %</label>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  max="100"
                                  value={ing.wasteFactor}
                                  onChange={(e) => updateIngredient(ing.id, 'wasteFactor', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                                <input
                                  type="text"
                                  value={ing.notes}
                                  onChange={(e) => updateIngredient(ing.id, 'notes', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="diced, minced..."
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

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSection(0)}
                  className="inline-flex items-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSection(2)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
                >
                  Next: Instructions
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Instructions */}
          {currentSection === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Step-by-Step Instructions</h2>
                      <p className="text-sm text-gray-500">Add photos to each step for visual guidance</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addStep}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Step
                  </button>
                </div>

                {steps.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No steps yet</h3>
                    <p className="text-gray-500 mb-4">Add step-by-step instructions with optional photos</p>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Add your first step
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <div key={step.id} className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
                              {index + 1}
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                              <button
                                type="button"
                                onClick={() => moveStep(index, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => moveStep(index, 'down')}
                                disabled={index === steps.length - 1}
                                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Step title (optional, e.g., 'Prep the vegetables')"
                              />
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <input
                                  type="number"
                                  min="0"
                                  value={step.duration}
                                  onChange={(e) => updateStep(step.id, 'duration', e.target.value)}
                                  className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="min"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStep(step.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex gap-4">
                              {/* Step Image */}
                              <div className="w-32 flex-shrink-0">
                                {step.imageUrl ? (
                                  <div className="relative group">
                                    <img
                                      src={step.imageUrl}
                                      alt={`Step ${index + 1}`}
                                      className="w-32 h-24 object-cover rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateStep(step.id, 'imageUrl', '')}
                                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg"
                                    >
                                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <label className="flex flex-col items-center justify-center w-32 h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-white hover:border-indigo-400 transition">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-xs text-gray-400 mt-1">Add photo</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageUpload(file, (url) => updateStep(step.id, 'imageUrl', url));
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              {/* Instruction */}
                              <div className="flex-1">
                                <textarea
                                  value={step.instruction}
                                  onChange={(e) => updateStep(step.id, 'instruction', e.target.value)}
                                  rows={3}
                                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                  placeholder="Describe what to do in this step..."
                                />
                              </div>
                            </div>

                            <input
                              type="text"
                              value={step.notes}
                              onChange={(e) => updateStep(step.id, 'notes', e.target.value)}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-amber-50/50"
                              placeholder="Pro tip or note for this step (optional)"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSection(1)}
                  className="inline-flex items-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentSection(3)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
                >
                  Next: Details
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Section 4: Details */}
          {currentSection === 3 && (
            <div className="space-y-6 animate-fadeIn">
              {/* Yield & Category */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Yield & Category</h2>
                    <p className="text-sm text-gray-500">How much does this recipe make?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yield Quantity</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.yieldQuantity}
                      onChange={(e) => setFormData({ ...formData, yieldQuantity: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yield Unit</label>
                    <select
                      value={formData.yieldUnit}
                      onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="portions">portions</option>
                      <option value="servings">servings</option>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSubRecipe}
                      onChange={(e) => setFormData({ ...formData, isSubRecipe: e.target.checked })}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">This is a sub-recipe / prep item</span>
                      <p className="text-sm text-gray-500">Use this for sauces, doughs, or prep items that are used as ingredients in other recipes</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Time */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Timing</h2>
                    <p className="text-sm text-gray-500">How long does it take to make?</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prep Time (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.prepTime}
                      onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cook Time (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cookTime}
                      onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>

              {/* Equipment */}
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Equipment Needed</h2>
                      <p className="text-sm text-gray-500">{equipment.length} item{equipment.length !== 1 ? 's' : ''} selected</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEquipmentModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Select Equipment
                  </button>
                </div>

                {equipment.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {equipment.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => toggleEquipment(item)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentSection(2)}
                  className="inline-flex items-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Creating Recipe...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Recipe
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>

      {/* Ingredient Search Modal */}
      {showIngredientSearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add Ingredient</h3>
              <button
                type="button"
                onClick={() => {
                  setShowIngredientSearch(false);
                  setIngredientSearch('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSearchType('item')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                    searchType === 'item'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Inventory Items
                </button>
                <button
                  type="button"
                  onClick={() => setSearchType('subrecipe')}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                    searchType === 'subrecipe'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-green-300 hover:bg-green-50 transition"
                      >
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.unit} {item.category && `• ${item.category.name}`}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
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
                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition"
                      >
                        <div className="font-semibold text-gray-900">{recipe.name}</div>
                        <div className="text-sm text-gray-500">
                          Yields {recipe.yieldQuantity} {recipe.yieldUnit}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
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

      {/* Equipment Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Select Equipment</h3>
              <button
                type="button"
                onClick={() => setShowEquipmentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {COMMON_EQUIPMENT.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className={`p-3 rounded-xl text-left text-sm font-medium transition ${
                      equipment.includes(item)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEquipmentModal(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
              >
                Done ({equipment.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
