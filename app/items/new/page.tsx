'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/ui/PageLayout';
import { Accordion, AccordionSection } from '@/components/ui/Accordion';
import { CategorySelector } from '@/components/CategorySelector';
import { Button, Input, Select } from '@/components/ui/PageLayout';

interface Store {
  id: string;
  name: string;
  accountId: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  level: number;
  parentId: string | null;
}

const USAGE_UNITS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'mL', label: 'Mililitros (mL)' },
  { value: 'ud', label: 'Unidades (ud)' },
];

const PURCHASE_UNITS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'mL', label: 'Mililitros (mL)' },
  { value: 'ud', label: 'Unidades (ud)' },
  { value: 'caja', label: 'Caja' },
  { value: 'pack', label: 'Pack' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'botella', label: 'Botella' },
  { value: 'lata', label: 'Lata' },
];

export default function NewItem() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: null as string | null,
    usageUnit: 'kg',
    purchaseUnit: 'kg',
    defaultConversion: '1',
    costPrice: '',
    minStockLevel: '',
    maxStockLevel: '',
    isSoldDirectly: false,
    isTransformed: true,
  });
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);

  useEffect(() => {
    const fetchAccountId = async () => {
      try {
        if (typeof window !== 'undefined') {
          const currentStore = localStorage.getItem('currentStore');
          if (currentStore) {
            const store = JSON.parse(currentStore);
            setAccountId(store.accountId);
            setStoreId(store.id);
            return;
          }
        }

        const storesRes = await fetch('/api/stores');
        if (storesRes.ok) {
          const stores: Store[] = await storesRes.json();
          if (stores.length > 0) {
            setAccountId(stores[0].accountId);
            setStoreId(stores[0].id);
          } else {
            alert('No stores found. Please create a store first.');
            router.push('/onboarding');
          }
        }
      } catch (error) {
        console.error('Error fetching accountId:', error);
        alert('Failed to load account information');
      }
    };

    fetchAccountId();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!accountId) {
      alert('Account information not loaded. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          categoryId: formData.categoryId,
          unit: formData.usageUnit, // For backwards compatibility
          usageUnit: formData.usageUnit,
          purchaseUnit: formData.purchaseUnit,
          defaultConversion: formData.defaultConversion ? parseFloat(formData.defaultConversion) : null,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
          minStockLevel: formData.minStockLevel ? parseFloat(formData.minStockLevel) : null,
          maxStockLevel: formData.maxStockLevel ? parseFloat(formData.maxStockLevel) : null,
          isSoldDirectly: formData.isSoldDirectly,
          isTransformed: formData.isTransformed,
          accountId,
          storeId,
        }),
      });

      if (response.ok) {
        const item = await response.json();
        router.push(`/items/${item.id}`);
      } else {
        const errorData = await response.json();
        alert(`Failed to create item: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating item:', error);
      alert('An error occurred: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleCategoryChange = (categoryId: string | null, path: Category[]) => {
    setFormData({ ...formData, categoryId });
    setCategoryPath(path);
  };

  // Icons for accordion sections
  const InfoIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const PriceIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const UnitsIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );

  const StockIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  return (
    <PageLayout
      title="Nuevo Producto"
      subtitle="Crear un nuevo producto en el inventario"
      backHref="/items"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <Accordion defaultOpen={['info', 'units']} allowMultiple>
          {/* INFORMACIÓN GENERAL */}
          <AccordionSection id="info" title="INFORMACIÓN GENERAL" icon={InfoIcon}>
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre del producto *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Pechuga de pollo"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* SKU and Barcode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código de producto (SKU)
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Ej: POLLO-001"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código de barras (EAN)
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Ej: 8412345678901"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Categorización
                </label>
                <CategorySelector
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  placeholder="Seleccionar categoría"
                />
                {categoryPath.length > 0 && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    {categoryPath.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && ' > '}
                        {c.icon && `${c.icon} `}{c.name}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              {/* Item Type */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de producto
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isTransformed"
                      checked={formData.isTransformed}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Se usa en recetas (transformado)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isSoldDirectly"
                      checked={formData.isSoldDirectly}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Se vende directamente (bebidas, etc.)</span>
                  </label>
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* UNIDADES */}
          <AccordionSection id="units" title="UNIDADES" icon={UnitsIcon}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unidad de uso (recetas) *
                  </label>
                  <select
                    name="usageUnit"
                    value={formData.usageUnit}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {USAGE_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Unidad para usar en recetas y escandallos
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unidad de compra *
                  </label>
                  <select
                    name="purchaseUnit"
                    value={formData.purchaseUnit}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {PURCHASE_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Unidad en que se compra al proveedor
                  </p>
                </div>
              </div>

              {/* Conversion */}
              {formData.usageUnit !== formData.purchaseUnit && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <label className="block text-sm font-medium text-amber-800 mb-1.5">
                    Conversión: 1 {formData.purchaseUnit} = ? {formData.usageUnit}
                  </label>
                  <input
                    type="number"
                    name="defaultConversion"
                    value={formData.defaultConversion}
                    onChange={handleChange}
                    step="0.001"
                    placeholder="Ej: 10 (si 1 caja = 10 kg)"
                    className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  <p className="mt-1.5 text-xs text-amber-700">
                    Ejemplo: Si compras en cajas de 10kg, indica 10
                  </p>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* PRECIO */}
          <AccordionSection id="price" title="PRECIO" icon={PriceIcon}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Precio de coste (por {formData.usageUnit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 pr-12 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Este precio se actualizará automáticamente con cada factura
                </p>
              </div>

              {formData.costPrice && formData.defaultConversion && formData.usageUnit !== formData.purchaseUnit && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-sm text-indigo-700">
                    <span className="font-medium">Precio por {formData.purchaseUnit}:</span>{' '}
                    {(parseFloat(formData.costPrice) * parseFloat(formData.defaultConversion)).toFixed(2)} €
                  </p>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* STOCK */}
          <AccordionSection id="stock" title="NIVELES DE STOCK" icon={StockIcon}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Stock mínimo ({formData.usageUnit})
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="Ej: 5"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Alerta cuando el stock baje de este nivel
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Stock máximo ({formData.usageUnit})
                  </label>
                  <input
                    type="number"
                    name="maxStockLevel"
                    value={formData.maxStockLevel}
                    onChange={handleChange}
                    step="0.01"
                    placeholder="Ej: 50"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Límite máximo recomendado
                  </p>
                </div>
              </div>
            </div>
          </AccordionSection>
        </Accordion>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Button
            type="submit"
            disabled={loading || !formData.name}
            className="flex-1"
          >
            {loading ? 'Guardando...' : 'Crear Producto'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/items')}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
