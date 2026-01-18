'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageLayout from '@/components/ui/PageLayout';
import { Accordion, AccordionSection } from '@/components/ui/Accordion';
import { CategorySelector } from '@/components/CategorySelector';
import { Button, Badge } from '@/components/ui/PageLayout';

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  level: number;
  parentId: string | null;
}

interface Supplier {
  id: string;
  name: string;
}

interface SupplierPrice {
  id: string;
  supplierId: string;
  supplier: Supplier;
  purchasePrice: number;
  purchaseUnit: string;
  unitsPerPurchase: number;
  supplierSku?: string;
  supplierProductName?: string;
  isPreferred: boolean;
  lastPurchaseDate?: string;
}

interface PriceHistory {
  id: string;
  price: number;
  effectiveDate: string;
  source: string;
  previousPrice?: number;
  changePercent?: number;
  supplier?: Supplier;
}

interface Item {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  usageUnit?: string;
  purchaseUnit?: string;
  defaultConversion?: number;
  costPrice?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  isSoldDirectly: boolean;
  isTransformed: boolean;
  needsReview: boolean;
  categoryId?: string;
  category?: Category;
  supplier?: Supplier;
  supplierPrices?: SupplierPrice[];
  priceHistory?: PriceHistory[];
  createdAt: string;
  updatedAt: string;
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

export default function ItemDetail() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`/api/items/${itemId}`);
        if (res.ok) {
          const data = await res.json();
          setItem(data);
          setFormData({
            name: data.name || '',
            sku: data.sku || '',
            barcode: data.barcode || '',
            categoryId: data.categoryId || null,
            usageUnit: data.usageUnit || data.unit || 'kg',
            purchaseUnit: data.purchaseUnit || data.unit || 'kg',
            defaultConversion: data.defaultConversion?.toString() || '1',
            costPrice: data.costPrice?.toString() || '',
            minStockLevel: data.minStockLevel?.toString() || '',
            maxStockLevel: data.maxStockLevel?.toString() || '',
            isSoldDirectly: data.isSoldDirectly || false,
            isTransformed: data.isTransformed !== false,
          });
        } else {
          alert('Item not found');
          router.push('/items');
        }
      } catch (error) {
        console.error('Error fetching item:', error);
        alert('Failed to load item');
      } finally {
        setLoading(false);
      }
    };

    if (itemId) {
      fetchItem();
    }
  }, [itemId, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          categoryId: formData.categoryId,
          unit: formData.usageUnit,
          usageUnit: formData.usageUnit,
          purchaseUnit: formData.purchaseUnit,
          defaultConversion: formData.defaultConversion ? parseFloat(formData.defaultConversion) : null,
          costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
          minStockLevel: formData.minStockLevel ? parseFloat(formData.minStockLevel) : null,
          maxStockLevel: formData.maxStockLevel ? parseFloat(formData.maxStockLevel) : null,
          isSoldDirectly: formData.isSoldDirectly,
          isTransformed: formData.isTransformed,
        }),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setItem(updatedItem);
        setIsEditing(false);
      } else {
        const error = await res.json();
        alert(`Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/items');
      } else {
        const error = await res.json();
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
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

  const SuppliersIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  const HistoryIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  if (loading) {
    return (
      <PageLayout title="Cargando..." backHref="/items">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (!item) {
    return (
      <PageLayout title="Producto no encontrado" backHref="/items">
        <div className="text-center py-12">
          <p className="text-gray-500">El producto no existe o ha sido eliminado.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={isEditing ? 'Editar Producto' : item.name}
      subtitle={item.category ? `${item.category.icon || ''} ${item.category.name}` : undefined}
      backHref="/items"
      actions={
        !isEditing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Eliminar
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="max-w-3xl mx-auto">
        {/* Review Warning */}
        {item.needsReview && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-800">Este producto necesita revisión</p>
              <p className="text-sm text-amber-700">Posible duplicado detectado. Revisa los datos antes de confirmar.</p>
            </div>
          </div>
        )}

        <Accordion defaultOpen={['info', 'price', 'suppliers']} allowMultiple>
          {/* INFORMACIÓN GENERAL */}
          <AccordionSection id="info" title="INFORMACIÓN GENERAL" icon={InfoIcon}>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  {/* Editable form */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre del producto *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

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
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Categorización
                    </label>
                    <CategorySelector
                      value={formData.categoryId}
                      onChange={handleCategoryChange}
                      placeholder="Seleccionar categoría"
                    />
                  </div>

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
                        <span className="text-sm text-gray-700">Se usa en recetas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="isSoldDirectly"
                          checked={formData.isSoldDirectly}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">Se vende directamente</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Read-only display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Nombre</p>
                      <p className="font-medium text-gray-900">{item.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Categoría</p>
                      <p className="font-medium text-gray-900">
                        {item.category ? (
                          <>
                            {item.category.icon && `${item.category.icon} `}
                            {item.category.name}
                          </>
                        ) : (
                          <span className="text-gray-400">Sin categoría</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Código (SKU)</p>
                      <p className="font-medium text-gray-900">
                        {item.sku || <span className="text-gray-400">—</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Código de barras</p>
                      <p className="font-medium text-gray-900">
                        {item.barcode || <span className="text-gray-400">—</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {item.isTransformed && (
                      <Badge variant="info">Se usa en recetas</Badge>
                    )}
                    {item.isSoldDirectly && (
                      <Badge variant="success">Venta directa</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </AccordionSection>

          {/* UNIDADES */}
          <AccordionSection id="units" title="UNIDADES" icon={UnitsIcon}>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Unidad de uso (recetas)
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Unidad de compra
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
                  </div>
                </div>

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
                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Unidad de uso</p>
                    <p className="font-medium text-gray-900">{item.usageUnit || item.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Unidad de compra</p>
                    <p className="font-medium text-gray-900">{item.purchaseUnit || item.unit}</p>
                  </div>
                </div>

                {item.defaultConversion && item.purchaseUnit !== item.usageUnit && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Conversión:</span> 1 {item.purchaseUnit} = {item.defaultConversion} {item.usageUnit}
                    </p>
                  </div>
                )}
              </div>
            )}
          </AccordionSection>

          {/* PRECIO */}
          <AccordionSection id="price" title="PRECIO" icon={PriceIcon}>
            {isEditing ? (
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
                      className="w-full px-4 py-2.5 pr-12 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {item.costPrice ? `${item.costPrice.toFixed(2)} €` : '—'}
                  </span>
                  <span className="text-sm text-gray-500">
                    por {item.usageUnit || item.unit}
                  </span>
                </div>

                {item.defaultConversion && item.purchaseUnit !== (item.usageUnit || item.unit) && item.costPrice && (
                  <p className="text-sm text-gray-600">
                    = {(item.costPrice * item.defaultConversion).toFixed(2)} € por {item.purchaseUnit}
                  </p>
                )}
              </div>
            )}
          </AccordionSection>

          {/* NIVELES DE STOCK */}
          <AccordionSection id="stock" title="NIVELES DE STOCK" icon={StockIcon}>
            {isEditing ? (
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Stock mínimo</p>
                  <p className="font-medium text-gray-900">
                    {item.minStockLevel != null
                      ? `${item.minStockLevel} ${item.usageUnit || item.unit}`
                      : <span className="text-gray-400">No definido</span>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stock máximo</p>
                  <p className="font-medium text-gray-900">
                    {item.maxStockLevel != null
                      ? `${item.maxStockLevel} ${item.usageUnit || item.unit}`
                      : <span className="text-gray-400">No definido</span>}
                  </p>
                </div>
              </div>
            )}
          </AccordionSection>

          {/* PROVEEDORES (only in view mode) */}
          {!isEditing && (
            <AccordionSection
              id="suppliers"
              title="PROVEEDORES"
              icon={SuppliersIcon}
              badge={
                item.supplierPrices && item.supplierPrices.length > 0 ? (
                  <Badge variant="info">{item.supplierPrices.length}</Badge>
                ) : undefined
              }
            >
              {item.supplierPrices && item.supplierPrices.length > 0 ? (
                <div className="space-y-3">
                  {item.supplierPrices.map((sp) => (
                    <div
                      key={sp.id}
                      className={`p-4 rounded-xl border ${
                        sp.isPreferred
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{sp.supplier.name}</span>
                          {sp.isPreferred && (
                            <Badge variant="info">Preferido</Badge>
                          )}
                        </div>
                        <span className="font-bold text-lg text-gray-900">
                          {sp.purchasePrice.toFixed(2)} € / {sp.purchaseUnit}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {sp.supplierSku && (
                          <span className="mr-4">SKU: {sp.supplierSku}</span>
                        )}
                        {sp.unitsPerPurchase > 1 && (
                          <span>
                            {sp.unitsPerPurchase} {item.usageUnit || item.unit} por {sp.purchaseUnit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No hay proveedores configurados</p>
                  <p className="text-sm mt-1">Los precios se añadirán automáticamente al procesar facturas</p>
                </div>
              )}
            </AccordionSection>
          )}

          {/* HISTORIAL DE PRECIOS (only in view mode) */}
          {!isEditing && (
            <AccordionSection id="history" title="HISTORIAL DE COMPRAS" icon={HistoryIcon}>
              {item.priceHistory && item.priceHistory.length > 0 ? (
                <div className="space-y-2">
                  {item.priceHistory.slice(0, 10).map((ph) => (
                    <div
                      key={ph.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {ph.price.toFixed(2)} € / {item.usageUnit || item.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(ph.effectiveDate).toLocaleDateString('es-ES')}
                          {ph.supplier && ` • ${ph.supplier.name}`}
                        </p>
                      </div>
                      {ph.changePercent != null && (
                        <span
                          className={`text-sm font-medium ${
                            ph.changePercent > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {ph.changePercent > 0 ? '+' : ''}
                          {ph.changePercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No hay historial de precios</p>
                  <p className="text-sm mt-1">El historial se creará al procesar facturas</p>
                </div>
              )}
            </AccordionSection>
          )}
        </Accordion>

        {/* Action Buttons */}
        {isEditing && (
          <div className="mt-6 flex gap-4">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="flex-1"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                // Reset form to original values
                if (item) {
                  setFormData({
                    name: item.name || '',
                    sku: item.sku || '',
                    barcode: item.barcode || '',
                    categoryId: item.categoryId || null,
                    usageUnit: item.usageUnit || item.unit || 'kg',
                    purchaseUnit: item.purchaseUnit || item.unit || 'kg',
                    defaultConversion: item.defaultConversion?.toString() || '1',
                    costPrice: item.costPrice?.toString() || '',
                    minStockLevel: item.minStockLevel?.toString() || '',
                    maxStockLevel: item.maxStockLevel?.toString() || '',
                    isSoldDirectly: item.isSoldDirectly || false,
                    isTransformed: item.isTransformed !== false,
                  });
                }
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
