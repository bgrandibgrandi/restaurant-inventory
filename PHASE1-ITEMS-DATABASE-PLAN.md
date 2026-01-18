# Phase 1: Items Database Foundation - Implementation Plan

## Summary of Decisions

Based on our alignment session, here's what we're building:

| Decision | Choice |
|----------|--------|
| Existing supplierId | Keep as "preferred supplier" |
| Invoice price capture | Background auto-update + notify on changes |
| Unit display | Smart display (usage unit + hover for purchase) |
| Dedup timing | On extraction + on creation + periodic scan |
| Identifiers | All (barcode, supplier SKU, AI name, aliases) |
| Price visibility | Items list + detail page |
| Square items | Auto-detect + ask for validation |
| Item detail layout | Tabbed layout |
| Match confidence threshold | >60% triggers review |
| Price alert threshold | >2% (configurable per account) |
| Cost impact | Show in notification |
| Build order | Schema → API → UI |

---

## Step 0: Category Hierarchy (Familias y Subfamilias)

### Current State
The `Category` model already supports parent-child relationships via `parentId`. We'll use this to create a 3-level hierarchy:

```
Level 0 (Root):     🥑 MATERIA PRIMA
Level 1 (Family):     └── 🍎 FRUTAS Y VERDURAS
Level 2 (Subfamily):       ├── Verduras
                           ├── Tubérculos
                           └── Frutas...
```

### Enhanced Category Model

```prisma
model Category {
  id           String        @id @default(cuid())
  name         String
  icon         String?       // Emoji icon for display
  sortOrder    Int           @default(0)  // For ordering categories
  level        Int           @default(0)  // 0=root, 1=family, 2=subfamily
  isSystem     Boolean       @default(false) // System categories can't be deleted
  isActive     Boolean       @default(true)

  // Hierarchy
  parentId     String?
  parent       Category?     @relation("CategoryToCategory", fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  children     Category[]    @relation("CategoryToCategory")

  // Relations
  invoiceItems InvoiceItem[]
  accountId    String
  account      Account       @relation(fields: [accountId], references: [id])
  items        Item[]
  recipes      Recipe[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([name, parentId, accountId]) // Unique name within same parent
  @@index([parentId])
  @@index([level])
}
```

### Seed Data Structure

```typescript
// prisma/seed-categories.ts

const CATEGORY_TREE = [
  {
    name: "MATERIA PRIMA",
    icon: "🥑",
    children: [
      {
        name: "FRUTAS Y VERDURAS",
        icon: "🍎",
        children: [
          "Verduras", "Tubérculos", "Setas y hongos", "Frutas",
          "Frutos secos", "Legumbres", "Algas", "Germinados, Brotes y Flores"
        ]
      },
      {
        name: "HUEVOS, LÁCTEOS Y DERIVADOS",
        icon: "🥚",
        children: [
          "Leche", "Huevos", "Yogur", "Quesos", "Mantequilla",
          "Otros derivados lácteos", "Bebidas Vegetales"
        ]
      },
      {
        name: "CEREALES, ARROZ Y PASTA",
        icon: "🍚",
        children: ["Harinas", "Cereales", "Arroz", "Pasta"]
      },
      {
        name: "CONDIMENTOS Y ESPECIAS",
        icon: "🧂",
        children: ["Especias", "Salsas", "Condimentos", "Semillas"]
      },
      {
        name: "ACEITES Y GRASAS",
        icon: "🧈",
        children: ["Aceites", "Vinagres", "Grasas", "Aceites de oliva", "Aceites vegetales"]
      },
      {
        name: "CONSERVAS",
        icon: "🥫",
        children: [
          "Conservas de pescado", "Conservas de carne", "Aceitunas y encurtidos",
          "Conservas de fruta", "Conservas vegetales"
        ]
      },
      {
        name: "CONGELADOS",
        icon: "❄️",
        children: [
          "Hielo", "Vegetales congelados", "Carne congelada",
          "Pre-cocinados congelados", "Pescados y mariscos congelados",
          "Fruta congelada", "Helados"
        ]
      },
      {
        name: "REPOSTERÍA Y PANADERÍA",
        icon: "🥖",
        children: [
          "Panadería", "Bollería", "Tartas", "Chocolates",
          "Galletas", "Masas y Bizcochos", "Postres"
        ]
      },
      {
        name: "SNACKS",
        icon: "🍬",
        children: ["Snacks dulces", "Snacks salados"]
      },
      {
        name: "PESCADOS Y MARISCOS",
        icon: "🐟",
        children: ["Pescados", "Mariscos", "Crustáceos", "Moluscos"]
      },
      {
        name: "CARNES",
        icon: "🍖",
        children: [
          "Aves", "Buey", "Carne de caza", "Cerdo", "Conejo",
          "Cordero", "Embutidos", "Ternera", "Vaca", "Derivados carne"
        ]
      }
    ]
  },
  {
    name: "BEBIDAS",
    icon: "🍷",
    children: [
      {
        name: "BEBIDAS NO ALCOHÓLICAS",
        icon: "🥤",
        children: [
          "Refrescos", "Agua", "Café e Infusiones",
          "Zumos y Granizados", "Cerveza sin alcohol"
        ]
      },
      {
        name: "BEBIDAS ALCOHÓLICAS",
        icon: "🍷",
        children: [
          "Licores", "Destilados", "Cerveza", "Vino Tinto",
          "Vino Blanco", "Vino Rosado", "Vino Espumoso",
          "Vino Dulce", "Vino Naranja", "Sidra"
        ]
      }
    ]
  },
  {
    name: "LIMPIEZA",
    icon: "🧹",
    children: [
      { name: "PRODUCTOS DE LIMPIEZA", children: [] },
      { name: "UTENSILIOS DE LIMPIEZA", children: [] },
      { name: "SERVICIOS DE LIMPIEZA", children: [] },
      { name: "LAVANDERÍA", children: [] }
    ]
  },
  {
    name: "CONSUMIBLES",
    icon: "🍴",
    children: [
      {
        name: "MENAJE COCINA",
        icon: "🍳",
        children: [
          "Sartenes", "Ollas", "Paelleras", "Fiambreras",
          "Bandejas de horno", "Utensilios varios"
        ]
      },
      {
        name: "TAKE AWAY (PACKAGING)",
        icon: "🚴",
        children: ["Cajas", "Bolsas", "Cubiertos", "Vasos", "Tapas"]
      },
      {
        name: "MATERIAL OFICINA",
        icon: "✉️",
        children: ["Papel", "Tóner", "Servicios de copistería"]
      },
      {
        name: "MENAJE",
        icon: "🪑",
        children: [
          "Manteles", "Servilletas", "Vajilla", "Cubertería",
          "Cristalería", "Utensilios varios", "Desechables"
        ]
      },
      {
        name: "OTROS CONSUMIBLES",
        icon: "📞",
        children: []
      }
    ]
  },
  {
    name: "ALQUILER",
    icon: "🏠",
    children: [
      { name: "MAQUINARIA", children: [] },
      { name: "LOCAL", children: [] },
      { name: "RENTINGS", children: [] }
    ]
  },
  {
    name: "MANTENIMIENTO",
    icon: "🧹",
    children: [
      { name: "REPARACIONES", children: [] }
    ]
  },
  {
    name: "SUMINISTROS",
    icon: "💧",
    children: [
      { name: "GAS", children: [] },
      { name: "AGUA", children: [] },
      { name: "LUZ", children: [] },
      { name: "TELÉFONO", children: [] },
      { name: "ELECTRICIDAD", children: [] }
    ]
  },
  {
    name: "GESTORÍA Y ASESORÍA",
    icon: "🧑🏻‍💻",
    children: []
  },
  {
    name: "COMUNICACIÓN Y MARKETING",
    icon: "🍴",
    children: []
  },
  {
    name: "FINANZAS",
    icon: "💸",
    children: []
  },
  {
    name: "OTROS",
    icon: "🎹",
    children: []
  },
  {
    name: "TECNOLOGÍA",
    icon: "💻",
    children: []
  },
  {
    name: "EQUIPAMIENTO Y MOBILIARIO",
    icon: "🪑",
    children: []
  },
  {
    name: "DELIVERY",
    icon: "🛵",
    children: []
  }
];
```

### Category Selector UI

The category selector will be a cascading dropdown:

```
┌──────────────────────────────────────────────────────┐
│ Category                                              │
├──────────────────────────────────────────────────────┤
│ 🥑 MATERIA PRIMA  ▼                                   │
│ ┌────────────────────────────────────────────────┐   │
│ │ 🍎 FRUTAS Y VERDURAS  ▼                        │   │
│ │ ┌────────────────────────────────────────────┐ │   │
│ │ │ Verduras                               ✓   │ │   │
│ │ │ Tubérculos                                 │ │   │
│ │ │ Setas y hongos                             │ │   │
│ │ └────────────────────────────────────────────┘ │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Files to Create for Categories

- `prisma/seed-categories.ts` - Category seed data
- `app/api/categories/tree/route.ts` - Get full category tree
- `components/items/CategorySelector.tsx` - Cascading category picker
- `app/settings/categories/page.tsx` - Category management (future editing)

---

## Step 1: Database Schema Changes

### 1.1 New Model: SupplierItemPrice

```prisma
// Multi-supplier pricing - allows same item from multiple suppliers
model SupplierItemPrice {
  id                  String    @id @default(cuid())
  itemId              String
  supplierId          String

  // Pricing
  purchasePrice       Float     // Cost per purchase unit
  purchaseUnit        String    // "case", "10kg box", "pallet"
  unitsPerPurchase    Float     // How many usage units in one purchase unit

  // Supplier-specific identifiers
  supplierSku         String?   // Supplier's product code for this item
  supplierProductName String?   // How supplier calls this item

  // Ordering info
  minimumOrderQty     Float?    // Minimum order quantity
  leadTimeDays        Int?      // Delivery lead time

  // Status
  isPreferred         Boolean   @default(false)  // Is this the default supplier?
  isActive            Boolean   @default(true)
  lastPurchaseDate    DateTime?
  lastPurchasePrice   Float?    // Track last actual price paid

  // Audit
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  accountId           String

  item      Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier  Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  account   Account   @relation(fields: [accountId], references: [id])

  @@unique([itemId, supplierId])
  @@index([supplierId])
  @@index([itemId])
  @@index([accountId])
}
```

### 1.2 New Model: ItemIdentifier

```prisma
// Track all ways an item can be identified for deduplication
model ItemIdentifier {
  id              String    @id @default(cuid())
  itemId          String
  identifierType  String    // "barcode", "supplier_sku", "name_fingerprint", "alias"
  identifierValue String
  supplierId      String?   // Which supplier uses this identifier (for supplier_sku)
  confidence      Float     @default(1.0)  // 1.0 for exact matches, lower for AI matches
  isVerified      Boolean   @default(false) // User confirmed this match
  source          String?   // "invoice", "manual", "square", "scan"
  createdAt       DateTime  @default(now())
  accountId       String

  item     Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier Supplier? @relation(fields: [supplierId], references: [id])
  account  Account   @relation(fields: [accountId], references: [id])

  @@unique([identifierType, identifierValue, accountId])
  @@index([identifierValue])
  @@index([itemId])
}
```

### 1.3 New Model: PriceHistory

```prisma
// Track price changes over time
model PriceHistory {
  id                String    @id @default(cuid())
  itemId            String
  supplierId        String?

  // Price info
  price             Float     // Per usage unit
  purchasePrice     Float?    // Per purchase unit (if different)

  // Context
  effectiveDate     DateTime  @default(now())
  source            String    // "invoice", "manual", "supplier_update"
  sourceId          String?   // Reference to invoice, etc.

  // Change tracking
  previousPrice     Float?
  changePercent     Float?    // Calculated: ((new - old) / old) * 100

  createdAt         DateTime  @default(now())
  accountId         String

  item     Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier Supplier? @relation(fields: [supplierId], references: [id])
  account  Account   @relation(fields: [accountId], references: [id])

  @@index([itemId, effectiveDate])
  @@index([supplierId])
  @@index([accountId])
}
```

### 1.4 New Model: DuplicateCandidate

```prisma
// Track potential duplicate items for review
model DuplicateCandidate {
  id              String    @id @default(cuid())
  itemId          String    // The item that might be a duplicate
  matchedItemId   String    // The existing item it might match
  matchType       String    // "barcode", "supplier_sku", "name_similarity", "ai_match"
  confidence      Float     // Match confidence score
  status          String    @default("pending") // "pending", "confirmed_match", "not_duplicate", "merged"
  reviewedAt      DateTime?
  reviewedBy      String?
  notes           String?
  createdAt       DateTime  @default(now())
  accountId       String

  item        Item    @relation("DuplicateItem", fields: [itemId], references: [id], onDelete: Cascade)
  matchedItem Item    @relation("MatchedItem", fields: [matchedItemId], references: [id], onDelete: Cascade)
  account     Account @relation(fields: [accountId], references: [id])

  @@unique([itemId, matchedItemId])
  @@index([status])
  @@index([accountId])
}
```

### 1.5 Modify Item Model

```prisma
model Item {
  id                  String              @id @default(cuid())
  name                String
  description         String?

  // Unit system (enhanced)
  usageUnit           String              // Primary unit for recipes (kg, L, pieces)
  purchaseUnit        String?             // Default purchase unit (case, box, etc.)
  defaultConversion   Float?              // Default units per purchase (e.g., 10 for "10kg case")

  // Keep for backwards compatibility / preferred supplier
  unit                String              // DEPRECATED: Use usageUnit. Keep for migration
  supplierId          String?             // Preferred supplier
  supplier            Supplier?           @relation(fields: [supplierId], references: [id])
  costPrice           Float?              // Preferred supplier's current price (per usage unit)

  // Identification
  barcode             String?             // EAN/UPC barcode
  sku                 String?             // Internal SKU

  // Stock levels
  minStockLevel       Float?
  maxStockLevel       Float?

  // Flags
  isSoldDirectly      Boolean             @default(false) // Sold without transformation (beer, wine)
  isTransformed       Boolean             @default(true)  // Used in recipes/escandallos
  needsReview         Boolean             @default(false) // Flagged for duplicate review

  // Square integration
  squareCatalogId     String?             // If synced from Square

  // Relations
  categoryId          String?
  category            Category?           @relation(fields: [categoryId], references: [id])
  storeId             String?
  store               Store?              @relation(fields: [storeId], references: [id])
  accountId           String
  account             Account             @relation(fields: [accountId], references: [id])

  // New relations
  supplierPrices      SupplierItemPrice[]
  identifiers         ItemIdentifier[]
  priceHistory        PriceHistory[]
  duplicatesOf        DuplicateCandidate[] @relation("DuplicateItem")
  hasDuplicates       DuplicateCandidate[] @relation("MatchedItem")

  // Existing relations
  invoiceItems        InvoiceItem[]
  stockEntries        StockEntry[]
  stockMovements      StockMovement[]
  stockTransferItems  StockTransferItem[]
  recipeIngredients   RecipeIngredient[]
  squareModifierMappings SquareModifierMapping[]
  sourceItemId        String?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
}
```

### 1.6 Modify Account Model (for settings)

```prisma
model Account {
  // ... existing fields

  // Price alert settings
  priceAlertThreshold Float   @default(2.0)  // Alert when price changes > X%

  // New relations
  supplierItemPrices  SupplierItemPrice[]
  itemIdentifiers     ItemIdentifier[]
  priceHistories      PriceHistory[]
  duplicateCandidates DuplicateCandidate[]
}
```

### 1.7 Modify Supplier Model

```prisma
model Supplier {
  // ... existing fields

  // New relations
  itemPrices          SupplierItemPrice[]
  itemIdentifiers     ItemIdentifier[]
  priceHistories      PriceHistory[]
}
```

---

## Step 2: Database Migration

### Migration Order

1. **Add new models** (non-breaking)
   ```bash
   npx prisma migrate dev --name add_supplier_pricing_models
   ```

2. **Add new fields to Item** (non-breaking, all optional)
   ```bash
   npx prisma migrate dev --name enhance_item_model
   ```

3. **Run data migration script** to:
   - Copy `item.unit` to `item.usageUnit`
   - Create SupplierItemPrice for items with supplierId
   - Create ItemIdentifier for items with barcode

4. **Add Account settings**
   ```bash
   npx prisma migrate dev --name add_price_alert_settings
   ```

### Data Migration Script

```typescript
// scripts/migrate-to-multi-supplier.ts
import { prisma } from '../lib/db';

async function migrateToMultiSupplier() {
  // 1. Update items: copy unit to usageUnit
  await prisma.$executeRaw`
    UPDATE "Item"
    SET "usageUnit" = "unit"
    WHERE "usageUnit" IS NULL
  `;

  // 2. Create SupplierItemPrice for existing item-supplier relationships
  const itemsWithSuppliers = await prisma.item.findMany({
    where: { supplierId: { not: null } },
    select: { id: true, supplierId: true, costPrice: true, unit: true, accountId: true }
  });

  for (const item of itemsWithSuppliers) {
    await prisma.supplierItemPrice.upsert({
      where: {
        itemId_supplierId: { itemId: item.id, supplierId: item.supplierId! }
      },
      create: {
        itemId: item.id,
        supplierId: item.supplierId!,
        purchasePrice: item.costPrice || 0,
        purchaseUnit: item.unit,
        unitsPerPurchase: 1,
        isPreferred: true,
        accountId: item.accountId,
      },
      update: {} // Don't update if exists
    });
  }

  // 3. Create ItemIdentifier for items with barcodes
  const itemsWithBarcodes = await prisma.item.findMany({
    where: { barcode: { not: null } },
    select: { id: true, barcode: true, accountId: true }
  });

  for (const item of itemsWithBarcodes) {
    await prisma.itemIdentifier.upsert({
      where: {
        identifierType_identifierValue_accountId: {
          identifierType: 'barcode',
          identifierValue: item.barcode!,
          accountId: item.accountId
        }
      },
      create: {
        itemId: item.id,
        identifierType: 'barcode',
        identifierValue: item.barcode!,
        confidence: 1.0,
        isVerified: true,
        source: 'migration',
        accountId: item.accountId,
      },
      update: {}
    });
  }

  console.log('Migration completed!');
  console.log(`- Updated ${itemsWithSuppliers.length} supplier prices`);
  console.log(`- Created ${itemsWithBarcodes.length} barcode identifiers`);
}
```

---

## Step 3: API Routes

### 3.1 Supplier Pricing API

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/items/[id]/prices` | GET | Get all supplier prices for an item |
| `POST /api/items/[id]/prices` | POST | Add new supplier price |
| `PUT /api/items/[id]/prices/[priceId]` | PUT | Update supplier price |
| `DELETE /api/items/[id]/prices/[priceId]` | DELETE | Remove supplier price |
| `PUT /api/items/[id]/prices/[priceId]/preferred` | PUT | Set as preferred supplier |

### 3.2 Deduplication API

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/items/check-duplicates` | POST | Check if item data matches existing items |
| `GET /api/items/duplicates` | GET | List all pending duplicate candidates |
| `PUT /api/items/duplicates/[id]` | PUT | Resolve a duplicate (merge or dismiss) |
| `POST /api/items/merge` | POST | Merge two items into one |
| `POST /api/items/scan-duplicates` | POST | Trigger full duplicate scan (admin) |

### 3.3 Price History API

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/items/[id]/price-history` | GET | Get price history for an item |
| `GET /api/price-alerts` | GET | Get recent price change alerts |
| `PUT /api/price-alerts/[id]/dismiss` | PUT | Dismiss a price alert |
| `PUT /api/settings/price-threshold` | PUT | Update price alert threshold |

### 3.4 Enhanced Items API

Update existing `/api/items` to:
- Include supplier prices in response
- Support dedup check on POST
- Return preferred supplier price in list

---

## Step 4: Core Services

### 4.1 Deduplication Service

```typescript
// lib/services/deduplication.ts

interface MatchResult {
  itemId: string;
  itemName: string;
  confidence: number;
  matchType: 'exact_barcode' | 'supplier_sku' | 'name_similarity' | 'ai_match' | 'no_match';
  matchDetails: string;
}

interface DedupInput {
  name: string;
  barcode?: string;
  supplierSku?: string;
  supplierId?: string;
  accountId: string;
}

export async function findPotentialMatches(input: DedupInput): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];

  // Priority 1: Exact barcode match (confidence: 1.0)
  if (input.barcode) {
    const barcodeMatch = await prisma.itemIdentifier.findFirst({
      where: {
        identifierType: 'barcode',
        identifierValue: input.barcode,
        accountId: input.accountId,
      },
      include: { item: true }
    });

    if (barcodeMatch) {
      matches.push({
        itemId: barcodeMatch.itemId,
        itemName: barcodeMatch.item.name,
        confidence: 1.0,
        matchType: 'exact_barcode',
        matchDetails: `Barcode ${input.barcode} matches exactly`
      });
    }
  }

  // Priority 2: Supplier SKU match (confidence: 0.95)
  if (input.supplierSku && input.supplierId) {
    const skuMatch = await prisma.supplierItemPrice.findFirst({
      where: {
        supplierSku: input.supplierSku,
        supplierId: input.supplierId,
      },
      include: { item: true }
    });

    if (skuMatch) {
      matches.push({
        itemId: skuMatch.itemId,
        itemName: skuMatch.item.name,
        confidence: 0.95,
        matchType: 'supplier_sku',
        matchDetails: `Supplier SKU ${input.supplierSku} matches`
      });
    }
  }

  // Priority 3: Name similarity (confidence: 0.6-0.9)
  const similarItems = await findSimilarByName(input.name, input.accountId);
  matches.push(...similarItems);

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}

async function findSimilarByName(name: string, accountId: string): Promise<MatchResult[]> {
  // Normalize name for comparison
  const normalizedName = normalizeName(name);

  const allItems = await prisma.item.findMany({
    where: { accountId },
    select: { id: true, name: true }
  });

  const matches: MatchResult[] = [];

  for (const item of allItems) {
    const similarity = calculateSimilarity(normalizedName, normalizeName(item.name));

    if (similarity >= 0.6) { // Threshold from user choice
      matches.push({
        itemId: item.id,
        itemName: item.name,
        confidence: similarity,
        matchType: 'name_similarity',
        matchDetails: `Name "${item.name}" is ${Math.round(similarity * 100)}% similar`
      });
    }
  }

  return matches;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  // Levenshtein distance based similarity
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - (distance / maxLength);
}
```

### 4.2 Price Tracking Service

```typescript
// lib/services/price-tracking.ts

interface PriceUpdateResult {
  priceChanged: boolean;
  previousPrice?: number;
  newPrice: number;
  changePercent?: number;
  shouldAlert: boolean;
  costImpact?: CostImpact[];
}

interface CostImpact {
  recipeId: string;
  recipeName: string;
  previousCost: number;
  newCost: number;
  changePercent: number;
}

export async function recordPriceFromInvoice(
  itemId: string,
  supplierId: string,
  newPrice: number,
  invoiceId: string,
  accountId: string
): Promise<PriceUpdateResult> {
  // Get account settings for alert threshold
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { priceAlertThreshold: true }
  });
  const threshold = account?.priceAlertThreshold || 2.0;

  // Get previous price
  const existingPrice = await prisma.supplierItemPrice.findUnique({
    where: { itemId_supplierId: { itemId, supplierId } }
  });

  const previousPrice = existingPrice?.purchasePrice;
  const changePercent = previousPrice
    ? ((newPrice - previousPrice) / previousPrice) * 100
    : null;

  // Record price history
  await prisma.priceHistory.create({
    data: {
      itemId,
      supplierId,
      price: newPrice,
      source: 'invoice',
      sourceId: invoiceId,
      previousPrice,
      changePercent,
      accountId,
    }
  });

  // Update or create supplier price
  await prisma.supplierItemPrice.upsert({
    where: { itemId_supplierId: { itemId, supplierId } },
    create: {
      itemId,
      supplierId,
      purchasePrice: newPrice,
      purchaseUnit: 'unit', // Will be updated from invoice
      unitsPerPurchase: 1,
      lastPurchaseDate: new Date(),
      lastPurchasePrice: newPrice,
      accountId,
    },
    update: {
      purchasePrice: newPrice,
      lastPurchaseDate: new Date(),
      lastPurchasePrice: newPrice,
    }
  });

  // Check if we should alert
  const shouldAlert = changePercent !== null && Math.abs(changePercent) >= threshold;

  // Calculate cost impact on recipes if alerting
  let costImpact: CostImpact[] = [];
  if (shouldAlert) {
    costImpact = await calculateRecipeCostImpact(itemId, previousPrice!, newPrice);
  }

  // Create notification if needed
  if (shouldAlert) {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { name: true }
    });

    const direction = changePercent! > 0 ? 'increased' : 'decreased';
    let message = `${item?.name} price ${direction} by ${Math.abs(changePercent!).toFixed(1)}%`;

    if (costImpact.length > 0) {
      const topRecipe = costImpact[0];
      message += `. This affects ${costImpact.length} recipe(s), including "${topRecipe.recipeName}"`;
    }

    await prisma.notification.create({
      data: {
        type: 'PRICE_CHANGE',
        title: `Price ${direction}: ${item?.name}`,
        message,
        itemId,
        linkUrl: `/items/${itemId}`,
        accountId,
      }
    });
  }

  return {
    priceChanged: previousPrice !== newPrice,
    previousPrice,
    newPrice,
    changePercent: changePercent ?? undefined,
    shouldAlert,
    costImpact,
  };
}

async function calculateRecipeCostImpact(
  itemId: string,
  oldPrice: number,
  newPrice: number
): Promise<CostImpact[]> {
  // Find all recipes using this item
  const ingredients = await prisma.recipeIngredient.findMany({
    where: { itemId },
    include: {
      recipe: { select: { id: true, name: true, yieldQuantity: true } }
    }
  });

  const impacts: CostImpact[] = [];

  for (const ingredient of ingredients) {
    const oldIngredientCost = oldPrice * ingredient.quantity * (1 + ingredient.wasteFactor);
    const newIngredientCost = newPrice * ingredient.quantity * (1 + ingredient.wasteFactor);
    const costChange = newIngredientCost - oldIngredientCost;
    const changePercent = (costChange / oldIngredientCost) * 100;

    impacts.push({
      recipeId: ingredient.recipeId,
      recipeName: ingredient.recipe.name,
      previousCost: oldIngredientCost,
      newCost: newIngredientCost,
      changePercent,
    });
  }

  return impacts.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}
```

---

## Step 5: UI Changes

### 5.1 Items List Page Enhancement

Current columns: Name, Category, Supplier, Unit, Cost, Actions

New columns: Name, Category, **Preferred Supplier + Price**, Unit, Actions

- **Preferred Supplier + Price**: Show supplier name + current price
- **Hover tooltip**: Show purchase unit, conversion, all other suppliers
- **Badge**: Show if item has multiple suppliers (e.g., "3 suppliers")
- **Badge**: Show if item needs duplicate review

### 5.2 Item Detail Page (Tabbed)

**Tab 1: Overview**
- Item name, description, category
- Usage unit, barcode, SKU
- Flags: isSoldDirectly, isTransformed
- Stock levels (min/max)

**Tab 2: Supplier Prices**
- Table of all supplier prices
- Add new supplier price button
- Set preferred supplier action
- Edit/delete actions
- Price comparison chart (optional)

**Tab 3: Price History**
- Timeline of price changes
- Chart showing price trends
- Filter by supplier

**Tab 4: Used In Recipes**
- List of recipes using this item
- Cost contribution to each recipe
- Link to recipe detail

### 5.3 New Components

1. **SupplierPriceTable** - Display and manage supplier prices
2. **PriceHistoryChart** - Visualize price trends
3. **DuplicateReviewModal** - Review and resolve duplicates
4. **PriceChangeNotification** - Display price alerts with cost impact

---

## Step 6: Invoice Integration Updates

### 6.1 On Invoice Extraction

Add deduplication check:
```typescript
// In handleExtraction()
for (const extractedItem of extractedData.items) {
  // Check for duplicates
  const matches = await findPotentialMatches({
    name: extractedItem.suggestedName,
    supplierSku: extractedItem.sku, // if extracted
    supplierId: invoice.supplierId,
    accountId,
  });

  if (matches.length > 0 && matches[0].confidence >= 0.6) {
    // Suggest the match
    extractedItem.matchedItemId = matches[0].itemId;
    extractedItem.matchConfidence = matches[0].confidence;
    extractedItem.matchType = matches[0].matchType;
  }
}
```

### 6.2 On Invoice Confirmation

Add price tracking:
```typescript
// In handleConfirmation()
for (const item of items) {
  // ... existing item creation/matching logic

  if (itemId && invoice.supplierId && item.unitPrice) {
    // Record price and check for alerts
    await recordPriceFromInvoice(
      itemId,
      invoice.supplierId,
      item.unitPrice,
      invoiceId,
      accountId
    );
  }
}
```

---

## Implementation Checklist

### Week 1: Schema & Migration
- [ ] Enhance Category model (add icon, sortOrder, level, isSystem, isActive)
- [ ] Create category seed script with full hierarchy
- [ ] Add SupplierItemPrice model
- [ ] Add ItemIdentifier model
- [ ] Add PriceHistory model
- [ ] Add DuplicateCandidate model
- [ ] Modify Item model
- [ ] Add Account settings
- [ ] Run migrations
- [ ] Seed categories for all accounts
- [ ] Create & run data migration script

### Week 2: Core Services & APIs
- [ ] Implement deduplication service
- [ ] Implement price tracking service
- [ ] Create supplier pricing API routes
- [ ] Create deduplication API routes
- [ ] Create price history API routes
- [ ] Update items API with new data
- [ ] Integrate with invoice confirmation

### Week 3: UI Updates
- [ ] Create CategorySelector component (cascading dropdown)
- [ ] Update items list page with category display
- [ ] Create tabbed item detail page
- [ ] Create SupplierPriceTable component
- [ ] Create PriceHistoryChart component
- [ ] Create DuplicateReviewModal
- [ ] Add price change notifications
- [ ] Update invoice review to show matches
- [ ] Add category filter to items list

### Week 4: Testing & Polish
- [ ] Test deduplication flow
- [ ] Test price tracking
- [ ] Test invoice integration
- [ ] Test multi-supplier scenarios
- [ ] Performance optimization
- [ ] Documentation

---

## Files to Create

### New Files
- `prisma/migrations/xxx_enhance_category_model/migration.sql`
- `prisma/seed-categories.ts`
- `prisma/migrations/xxx_add_supplier_pricing_models/migration.sql`
- `scripts/migrate-to-multi-supplier.ts`
- `lib/services/deduplication.ts`
- `lib/services/price-tracking.ts`
- `app/api/items/[id]/prices/route.ts`
- `app/api/items/[id]/prices/[priceId]/route.ts`
- `app/api/items/check-duplicates/route.ts`
- `app/api/items/duplicates/route.ts`
- `app/api/items/merge/route.ts`
- `app/api/price-alerts/route.ts`
- `components/items/SupplierPriceTable.tsx`
- `components/items/PriceHistoryChart.tsx`
- `components/items/DuplicateReviewModal.tsx`
- `components/items/CategorySelector.tsx`
- `components/notifications/PriceChangeAlert.tsx`
- `app/api/categories/tree/route.ts`
- `app/settings/categories/page.tsx` (future - placeholder)

### Files to Modify
- `prisma/schema.prisma` - Add new models
- `app/api/items/route.ts` - Add dedup check, include prices
- `app/api/items/[id]/route.ts` - Include all new relations
- `app/api/invoices/[id]/route.ts` - Add dedup + price tracking
- `app/items/page.tsx` - Update list with new columns
- `app/items/[id]/page.tsx` - Convert to tabbed layout (or create)
- `components/NotificationBell.tsx` - Handle PRICE_CHANGE type

---

## Ready to Start?

This plan is ready for implementation. The build order is:
1. **Schema changes** (Prisma models)
2. **Migration scripts** (data migration)
3. **Core services** (dedup, price tracking)
4. **API routes** (CRUD for new data)
5. **UI components** (tables, charts, modals)
6. **Integration** (invoice flow updates)

Would you like me to begin with Step 1 (Schema changes)?
