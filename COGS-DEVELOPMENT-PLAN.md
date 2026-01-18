# COGS Control System - Development Plan

## Executive Summary

This plan outlines the development of a world-class Cost of Goods Sold (COGS) control system for restaurant inventory management. The system will transform the current inventory tracking into a comprehensive COGS engine with:

- **Robust Items Database** with multi-supplier pricing and deduplication
- **Albaran (Delivery Note) Capture** with photo + OCR validation
- **Invoice Reconciliation** with auto-match and variance tracking
- **Two-Level Unit System** (purchase units + usage units)
- **Square Integration** for direct-sale items
- **Escandallos (Recipe Costing)** powered by real purchase data

---

## Current State Analysis

### What Exists (Strengths)
- Store-specific item catalog
- Stock movement tracking with full audit trail
- Invoice AI extraction with supplier matching
- Recipe cost calculation framework
- Square integration for catalog and orders
- Multi-store support with transfers

### What's Missing (Gaps)
| Gap | Impact |
|-----|--------|
| Single supplier per item | Cannot track multi-vendor pricing |
| Single cost per item | No price history or trends |
| No albaran model | Cannot validate deliveries |
| No invoice reconciliation | Discrepancies go undetected |
| Single unit system | Conversion errors between purchase/usage |
| No deduplication engine | Duplicate items from different sources |

---

## Phase 1: Items Database Foundation (PRIORITY)

### 1.1 Multi-Supplier Pricing Model

**New Database Model: `SupplierItemPrice`**
```prisma
model SupplierItemPrice {
  id                  String    @id @default(cuid())
  itemId              String
  supplierId          String
  purchasePrice       Float     // Cost per purchase unit
  purchaseUnit        String    // "case", "10kg box", "pallet"
  unitsPerPurchase    Float     // Conversion to usage unit (1 case = 24 pieces)
  supplierSku         String?   // Supplier's product code
  minimumOrderQty     Float?    // MOQ
  leadTimeDays        Int?
  isPreferred         Boolean   @default(false)
  isActive            Boolean   @default(true)
  lastPurchaseDate    DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  accountId           String

  item      Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier  Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  account   Account   @relation(fields: [accountId], references: [id])

  @@unique([itemId, supplierId, accountId])
  @@index([supplierId])
  @@index([itemId])
}
```

**Modify Item Model:**
```prisma
model Item {
  // Existing fields...

  // NEW: Two-level unit system
  purchaseUnit      String?   // Default purchase unit (e.g., "case")
  usageUnit         String    // Usage/recipe unit (e.g., "kg", "piece")
  defaultConversion Float?    // Default conversion factor

  // NEW: Identification
  barcode           String?   // EAN/UPC barcode
  supplierSkus      String[]  // Array of known supplier SKUs

  // NEW: Flags
  isSoldDirectly    Boolean   @default(false)  // Synced with Square
  squareItemId      String?   // Link to Square catalog

  // Relations
  supplierPrices    SupplierItemPrice[]
  // ... existing relations
}
```

### 1.2 Hybrid Deduplication System

**New Database Model: `ItemIdentifier`**
```prisma
model ItemIdentifier {
  id              String    @id @default(cuid())
  itemId          String
  identifierType  String    // "barcode", "supplier_sku", "name_match", "manual"
  identifierValue String
  supplierId      String?   // Which supplier uses this identifier
  confidence      Float     @default(1.0)  // AI matching confidence
  isVerified      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  accountId       String

  item     Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier Supplier? @relation(fields: [supplierId], references: [id])
  account  Account   @relation(fields: [accountId], references: [id])

  @@unique([identifierType, identifierValue, accountId])
  @@index([identifierValue])
}
```

**Deduplication Algorithm:**
```typescript
// lib/deduplication.ts
interface MatchResult {
  itemId: string;
  confidence: number;
  matchType: 'exact_barcode' | 'supplier_sku' | 'name_similarity' | 'no_match';
}

async function findItemMatch(input: {
  name: string;
  barcode?: string;
  supplierSku?: string;
  supplierId?: string;
}): Promise<MatchResult[]> {
  // Priority order:
  // 1. Exact barcode match (confidence: 1.0)
  // 2. Supplier SKU match (confidence: 0.95)
  // 3. AI name similarity (confidence: 0.5-0.9)
  // Returns ranked matches for user review
}
```

### 1.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/items` | GET | List items with supplier prices |
| `/api/items` | POST | Create item with dedup check |
| `/api/items/[id]/prices` | GET | Get all supplier prices for item |
| `/api/items/[id]/prices` | POST | Add supplier price |
| `/api/items/[id]/prices/[priceId]` | PUT/DELETE | Update/remove price |
| `/api/items/match` | POST | Find potential matches (dedup) |
| `/api/items/merge` | POST | Merge duplicate items |

### 1.4 UI Components

**Items List Page Enhancement:**
- Show preferred supplier and price
- Badge for multi-supplier items
- Filter by supplier
- "Compare Prices" action

**Item Detail Page:**
- Supplier pricing table
- Add/edit supplier prices
- Set preferred supplier
- Price history chart
- Deduplication warnings

**New: Price Comparison View:**
- Side-by-side supplier comparison
- Historical price trends
- Best price recommendations

---

## Phase 2: Albaran (Delivery Note) Capture

### 2.1 Database Models

```prisma
model Albaran {
  id              String        @id @default(cuid())
  albaranNumber   String        // Supplier's delivery note number
  supplierId      String
  storeId         String
  receivedBy      String?       // User ID
  receivedDate    DateTime
  status          AlbaranStatus @default(PENDING)
  photoUrl        String?       // Original photo/scan
  extractedData   Json?         // OCR extraction result
  notes           String?
  invoiceId       String?       // Linked invoice (when reconciled)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  accountId       String

  supplier  Supplier       @relation(fields: [supplierId], references: [id])
  store     Store          @relation(fields: [storeId], references: [id])
  invoice   Invoice?       @relation(fields: [invoiceId], references: [id])
  account   Account        @relation(fields: [accountId], references: [id])
  items     AlbaranItem[]

  @@index([supplierId])
  @@index([storeId])
  @@index([status])
}

enum AlbaranStatus {
  PENDING       // Photo uploaded, awaiting review
  REVIEWING     // User reviewing OCR extraction
  CONFIRMED     // Quantities confirmed
  RECONCILED    // Matched to invoice
  DISPUTED      // Variance flagged
}

model AlbaranItem {
  id                String  @id @default(cuid())
  albaranId         String
  itemId            String?
  rawDescription    String  // Original text from OCR
  quantityExpected  Float?  // From PO or invoice
  quantityReceived  Float
  unit              String
  unitPrice         Float?
  notes             String?
  hasVariance       Boolean @default(false)

  albaran Albaran @relation(fields: [albaranId], references: [id], onDelete: Cascade)
  item    Item?   @relation(fields: [itemId], references: [id])

  @@index([albaranId])
}
```

### 2.2 Capture Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Photo/Scan  │ ──▶ │  2. OCR Extract │ ──▶ │  3. User Review │
│   (Mobile App)  │     │   (Claude AI)   │     │  (Validate Data)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 6. Stock Update │ ◀── │ 5. Reconcile    │ ◀── │ 4. Confirm      │
│   (Movements)   │     │  (vs Invoice)   │     │   Quantities    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 2.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/albarans` | GET | List delivery notes |
| `/api/albarans` | POST | Upload new albaran (photo) |
| `/api/albarans/[id]` | GET | Get albaran details |
| `/api/albarans/[id]` | PUT | Update after review |
| `/api/albarans/[id]/confirm` | POST | Confirm and create stock movements |
| `/api/albarans/[id]/extract` | POST | Trigger OCR extraction |

### 2.4 UI Pages

**New: `/albarans` - Delivery Notes List**
- Filterable by status, supplier, date
- Quick status badges
- Link to reconciliation

**New: `/albarans/new` - Capture Delivery**
- Camera/upload interface
- Supplier selection
- Date picker

**New: `/albarans/[id]` - Review & Confirm**
- Side-by-side: photo + extracted items
- Editable item rows
- Match to existing items
- Variance highlighting
- Confirm button

---

## Phase 3: Invoice Reconciliation

### 3.1 Database Additions

```prisma
// Add to existing Invoice model:
model Invoice {
  // ... existing fields

  // NEW: Reconciliation
  reconciliationStatus  ReconciliationStatus @default(PENDING)
  reconciledAt          DateTime?
  reconciledBy          String?
  varianceNotes         String?

  albarans              Albaran[]
  reconciliationItems   InvoiceReconciliation[]
}

enum ReconciliationStatus {
  PENDING           // Not yet reconciled
  AUTO_MATCHED      // System matched to albaran(s)
  REVIEW_REQUIRED   // Variances need attention
  RECONCILED        // Fully matched
  DISPUTED          // Under discussion with supplier
}

model InvoiceReconciliation {
  id              String   @id @default(cuid())
  invoiceId       String
  invoiceItemId   String   // Which invoice line
  albaranId       String?
  albaranItemId   String?  // Which albaran line
  invoiceQty      Float
  receivedQty     Float?
  varianceQty     Float?
  varianceValue   Float?   // Cost impact
  status          String   // "matched", "quantity_variance", "missing", "extra"
  resolution      String?  // How it was resolved
  resolvedAt      DateTime?
  accountId       String

  invoice     Invoice      @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  invoiceItem InvoiceItem  @relation(fields: [invoiceItemId], references: [id])
  albaran     Albaran?     @relation(fields: [albaranId], references: [id])
  account     Account      @relation(fields: [accountId], references: [id])

  @@index([invoiceId])
  @@index([status])
}
```

### 3.2 Reconciliation Logic

```typescript
// lib/reconciliation.ts
interface ReconciliationResult {
  status: 'matched' | 'variance' | 'missing' | 'extra';
  invoiceItem: InvoiceItem;
  albaranItem?: AlbaranItem;
  variance?: {
    quantity: number;
    value: number;
  };
}

async function reconcileInvoice(invoiceId: string): Promise<ReconciliationResult[]> {
  // 1. Find related albarans (same supplier, date range)
  // 2. Match invoice lines to albaran lines by item
  // 3. Calculate variances
  // 4. Flag items needing review
  // 5. Auto-approve exact matches
}
```

### 3.3 Workflow

```
Invoice Uploaded ──▶ Find Related Albarans ──▶ Auto-Match Lines
                                                      │
                     ┌────────────────────────────────┼────────────────────────────────┐
                     │                                │                                │
                     ▼                                ▼                                ▼
            ┌─────────────┐                 ┌─────────────────┐              ┌─────────────┐
            │ All Matched │                 │ Variances Found │              │  No Albaran │
            │ (Auto-OK)   │                 │ (Review Queue)  │              │   (Flag)    │
            └─────────────┘                 └─────────────────┘              └─────────────┘
                     │                                │                                │
                     └────────────────────────────────┼────────────────────────────────┘
                                                      ▼
                                             ┌─────────────────┐
                                             │ Reconciliation  │
                                             │   Dashboard     │
                                             └─────────────────┘
```

### 3.4 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/invoices/[id]/reconcile` | POST | Trigger auto-reconciliation |
| `/api/invoices/[id]/reconciliation` | GET | Get reconciliation status |
| `/api/invoices/[id]/reconciliation` | PUT | Update resolution |
| `/api/reconciliation/pending` | GET | List all pending reconciliations |
| `/api/reconciliation/summary` | GET | Dashboard statistics |

### 3.5 UI Pages

**New: `/invoices/reconciliation` - Reconciliation Dashboard**
- Summary cards: Pending, Matched, Variances, Disputed
- List of invoices needing attention
- Quick filters by status

**Enhanced: `/invoices/[id]` - Invoice Detail**
- Add "Reconciliation" tab
- Show matched albaran(s)
- Line-by-line variance display
- Resolution actions

---

## Phase 4: Cost History & Tracking

### 4.1 Database Model

```prisma
model PriceHistory {
  id              String    @id @default(cuid())
  itemId          String
  supplierId      String?
  price           Float     // Per usage unit
  pricePerPurchase Float?   // Per purchase unit
  effectiveDate   DateTime
  source          String    // "invoice", "albaran", "manual", "supplier_update"
  sourceId        String?   // Reference to source document
  previousPrice   Float?
  changePercent   Float?
  createdAt       DateTime  @default(now())
  accountId       String

  item     Item      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  supplier Supplier? @relation(fields: [supplierId], references: [id])
  account  Account   @relation(fields: [accountId], references: [id])

  @@index([itemId, effectiveDate])
  @@index([supplierId])
}
```

### 4.2 Auto-Capture on Invoice Confirmation

```typescript
// When invoice is confirmed:
async function recordPriceFromInvoice(invoice: Invoice) {
  for (const item of invoice.items) {
    const previousPrice = await getLatestPrice(item.itemId);

    await prisma.priceHistory.create({
      data: {
        itemId: item.itemId,
        supplierId: invoice.supplierId,
        price: item.unitPrice,
        effectiveDate: invoice.date,
        source: 'invoice',
        sourceId: invoice.id,
        previousPrice: previousPrice?.price,
        changePercent: previousPrice
          ? ((item.unitPrice - previousPrice.price) / previousPrice.price) * 100
          : null,
      }
    });

    // Update supplier price if changed
    await updateSupplierPrice(item.itemId, invoice.supplierId, item.unitPrice);
  }
}
```

### 4.3 Recipe Cost Calculation Enhancement

```typescript
// lib/recipe-costing.ts
interface CostingMethod {
  type: 'last_purchase' | 'weighted_average' | 'fifo';
}

async function calculateRecipeCost(
  recipeId: string,
  method: CostingMethod = { type: 'last_purchase' }
): Promise<RecipeCost> {
  const recipe = await getRecipeWithIngredients(recipeId);

  let totalCost = 0;
  const ingredientCosts: IngredientCost[] = [];

  for (const ingredient of recipe.ingredients) {
    const unitCost = await getItemCost(ingredient.itemId, method);
    const adjustedCost = unitCost * ingredient.quantity * (1 + ingredient.wasteFactor);

    totalCost += adjustedCost;
    ingredientCosts.push({
      itemId: ingredient.itemId,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unitCost,
      wasteFactor: ingredient.wasteFactor,
      totalCost: adjustedCost,
    });
  }

  return {
    totalCost,
    costPerPortion: totalCost / recipe.yieldQuantity,
    ingredients: ingredientCosts,
    calculatedAt: new Date(),
    method,
  };
}
```

---

## Phase 5: Square Integration for Direct Sales

### 5.1 Enhance Existing Models

```prisma
// Add to Item model:
model Item {
  // ... existing
  isSoldDirectly    Boolean   @default(false)
  squareCatalogId   String?   // Square catalog item ID
  squareVariationId String?   // Square variation ID
}

// Add tracking for COGS deduction
model SquareOrderCOGS {
  id              String    @id @default(cuid())
  squareOrderId   String
  storeId         String
  orderDate       DateTime
  totalCOGS       Float
  itemsDeducted   Json      // Array of {itemId, quantity, cost}
  processedAt     DateTime  @default(now())
  accountId       String

  store   Store   @relation(fields: [storeId], references: [id])
  account Account @relation(fields: [accountId], references: [id])

  @@unique([squareOrderId, accountId])
  @@index([storeId, orderDate])
}
```

### 5.2 Sync Workflow

```
Square Order ──▶ Webhook/Sync ──▶ Find Mapped Items ──▶ Calculate COGS
                                                              │
                                        ┌─────────────────────┴─────────────────────┐
                                        │                                           │
                                        ▼                                           ▼
                               ┌─────────────────┐                        ┌─────────────────┐
                               │ Recipe Mapped   │                        │ Direct Item     │
                               │ (Ingredients)   │                        │ (Simple Deduct) │
                               └─────────────────┘                        └─────────────────┘
                                        │                                           │
                                        └─────────────────────┬─────────────────────┘
                                                              ▼
                                                    ┌─────────────────┐
                                                    │ Stock Movement  │
                                                    │ (type: SALE)    │
                                                    └─────────────────┘
```

### 5.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/square/orders/process` | POST | Process order for COGS |
| `/api/square/cogs/daily` | GET | Daily COGS report |
| `/api/items/[id]/square-link` | POST | Link item to Square |

---

## Phase 6: Notifications & Alerts

### 6.1 Notification Types

| Type | Trigger | Message |
|------|---------|---------|
| `LOW_STOCK` | Stock below minimum | "Tomatoes running low (5 kg remaining)" |
| `PRICE_INCREASE` | Price up >5% | "Olive Oil price increased 12% from Supplier A" |
| `ALBARAN_PENDING` | Unreviewed delivery | "Delivery from Supplier B awaiting review" |
| `RECONCILIATION_VARIANCE` | Invoice mismatch | "Invoice #123 has quantity variances" |
| `TRANSFER_PENDING` | Transfer awaiting | "Transfer from Store A ready to receive" |

### 6.2 Notification Model (Existing)

Already have `Notification` model - enhance with:
```prisma
model Notification {
  // ... existing fields

  // Add for actionable notifications
  actionUrl     String?   // Link to resolve
  actionLabel   String?   // "Review Now", "View Invoice"
  metadata      Json?     // Additional context
}
```

### 6.3 Alert Generation Jobs

```typescript
// lib/alerts.ts
async function checkLowStock(storeId: string) {
  const items = await prisma.item.findMany({
    where: {
      storeId,
      currentStock: { lt: prisma.item.minStockLevel }
    }
  });

  for (const item of items) {
    await createNotification({
      type: 'LOW_STOCK',
      title: `Low Stock: ${item.name}`,
      message: `Only ${item.currentStock} ${item.usageUnit} remaining`,
      itemId: item.id,
      storeId,
      actionUrl: `/items/${item.id}`,
      actionLabel: 'View Item',
    });
  }
}

async function checkPriceChanges() {
  const recentPrices = await prisma.priceHistory.findMany({
    where: {
      createdAt: { gte: subDays(new Date(), 1) },
      changePercent: { gt: 5 } // More than 5% increase
    }
  });

  // Create notifications for significant changes
}
```

---

## Implementation Timeline

### Sprint 1: Items Database Foundation (Week 1-2)
- [ ] Add SupplierItemPrice model
- [ ] Add ItemIdentifier model
- [ ] Modify Item model for two-level units
- [ ] Create supplier pricing API routes
- [ ] Build deduplication service
- [ ] Update Items UI with pricing table
- [ ] Add price comparison view

### Sprint 2: Albaran Capture (Week 3-4)
- [ ] Add Albaran and AlbaranItem models
- [ ] Create albaran API routes
- [ ] Build OCR extraction with Claude AI
- [ ] Create mobile-friendly capture UI
- [ ] Build review/confirm workflow
- [ ] Connect to stock movements

### Sprint 3: Invoice Reconciliation (Week 5-6)
- [ ] Add reconciliation fields to Invoice
- [ ] Create InvoiceReconciliation model
- [ ] Build auto-matching algorithm
- [ ] Create reconciliation API routes
- [ ] Build reconciliation dashboard
- [ ] Add variance resolution workflow

### Sprint 4: Cost History & Tracking (Week 7-8)
- [ ] Add PriceHistory model
- [ ] Auto-capture prices from invoices
- [ ] Build price trend charts
- [ ] Enhance recipe costing
- [ ] Add cost method options
- [ ] Create COGS reports

### Sprint 5: Square Integration & Alerts (Week 9-10)
- [ ] Link items to Square catalog
- [ ] Process orders for COGS
- [ ] Build daily COGS report
- [ ] Implement notification triggers
- [ ] Create alert dashboard
- [ ] Add email/push notifications

---

## Database Migration Strategy

### Step 1: Non-Breaking Additions
```bash
# Add new models without modifying existing
npx prisma migrate dev --name add_supplier_pricing
npx prisma migrate dev --name add_albarans
npx prisma migrate dev --name add_reconciliation
npx prisma migrate dev --name add_price_history
```

### Step 2: Data Migration Scripts
```typescript
// scripts/migrate-supplier-prices.ts
// Move existing item.costPrice to SupplierItemPrice records

// scripts/migrate-identifiers.ts
// Create ItemIdentifier records from existing barcodes/SKUs
```

### Step 3: Modify Existing Models
```bash
# Add new fields to existing models
npx prisma migrate dev --name enhance_item_model
npx prisma migrate dev --name enhance_invoice_model
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Item deduplication accuracy | >95% correct matches |
| Albaran processing time | <2 min from photo to confirmed |
| Invoice reconciliation rate | >90% auto-matched |
| Price tracking coverage | 100% of purchased items |
| COGS accuracy | Within 2% of manual calculation |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OCR extraction errors | User review step before confirmation |
| Duplicate items created | Confidence threshold + manual review queue |
| Price data inconsistency | Audit trail + validation rules |
| Square sync failures | Retry queue + manual fallback |
| Performance at scale | Pagination + background jobs |

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Prioritize** which phase to start with (recommended: Phase 1)
3. **Approve** to begin implementation
4. **Sprint planning** - break down into smaller tasks

---

*Plan created: January 2026*
*Version: 1.0*
