import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// Get a single invoice with all items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
      include: {
        store: true,
        supplier: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            matchedItem: true,
            category: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // If there's a suggested supplier match, fetch it
    let suggestedSupplierMatch = null;
    if (invoice.suggestedSupplierMatchId) {
      suggestedSupplierMatch = await prisma.supplier.findUnique({
        where: { id: invoice.suggestedSupplierMatchId },
        select: { id: true, name: true },
      });
    }

    return NextResponse.json({
      ...invoice,
      suggestedSupplierMatch,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// Update invoice (extract, confirm items, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if invoice exists and belongs to account
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Handle AI extraction
    if (body.action === 'extract') {
      return await handleExtraction(id, existingInvoice, session.user.accountId);
    }

    // Handle updating an invoice item
    if (body.action === 'update_item') {
      const { itemId, suggestedName, suggestedUnit, categoryId, matchedItemId, quantity, unitPrice } = body;

      const updatedItem = await prisma.invoiceItem.update({
        where: { id: itemId },
        data: {
          suggestedName,
          suggestedUnit,
          categoryId: categoryId || null,
          matchedItemId: matchedItemId || null,
          quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
          unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        },
        include: {
          matchedItem: true,
          category: true,
        },
      });

      return NextResponse.json(updatedItem);
    }

    // Handle confirming all items and creating stock entries
    if (body.action === 'confirm') {
      return await handleConfirmation(id, existingInvoice, session.user.accountId);
    }

    // Handle skipping an item
    if (body.action === 'skip_item') {
      const { itemId } = body;

      await prisma.invoiceItem.update({
        where: { id: itemId },
        data: { status: 'skipped' },
      });

      return NextResponse.json({ success: true });
    }

    // Handle updating supplier mapping
    if (body.action === 'update_supplier') {
      const { supplierId } = body;

      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          supplierId: supplierId || null,
          newSupplierDetected: false,
        },
        include: {
          store: true,
          supplier: true,
          items: {
            include: {
              matchedItem: true,
              category: true,
            },
          },
        },
      });

      return NextResponse.json(updatedInvoice);
    }

    // Handle dismissing supplier dialog
    if (body.action === 'dismiss_supplier_dialog') {
      await prisma.invoice.update({
        where: { id },
        data: { newSupplierDetected: false },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// AI extraction using Claude Vision
async function handleExtraction(invoiceId: string, invoice: any, accountId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 }
    );
  }

  // Update status to processing
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'processing' },
  });

  try {
    const anthropic = new Anthropic({ apiKey });

    // Get existing items and categories for matching
    const [existingItems, categories] = await Promise.all([
      prisma.item.findMany({
        where: { accountId },
        select: { id: true, name: true, unit: true },
      }),
      prisma.category.findMany({
        where: { accountId },
        select: { id: true, name: true },
      }),
    ]);

    // Extract base64 data from fileUrl
    const base64Match = invoice.fileUrl?.match(/^data:([^;]+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid file format');
    }

    const mediaType = base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';
    const base64Data = base64Match[2];

    const prompt = `You are analyzing an invoice/receipt from a restaurant supplier. Extract all line items from this document.

For each item, provide:
- rawName: The exact name as written on the invoice
- quantity: The quantity purchased (number only)
- unit: The unit of measurement (kg, L, pieces, boxes, cases, etc.)
- unitPrice: Price PER SINGLE UNIT (number only, no currency symbol). This is the cost for ONE unit, NOT the total line price. Calculate this by dividing total by quantity if needed.
- totalPrice: Total price for this entire line item (quantity × unitPrice)

Also extract if visible:
- supplierName: The vendor/supplier name
- invoiceNumber: Invoice or receipt number
- invoiceDate: Date in YYYY-MM-DD format
- totalAmount: Total invoice amount

Here are existing items in the system that you should try to match:
${existingItems.map(i => `- "${i.name}" (${i.unit})`).join('\n')}

Here are existing categories:
${categories.map(c => `- "${c.name}" (id: ${c.id})`).join('\n')}

For each item, also suggest:
- suggestedName: A clean, standardized name for this item (e.g., "Chicken Breast" instead of "CHKN BRST 5KG")
- suggestedUnit: The appropriate unit (kg, L, pieces, boxes, etc.)
- matchedItemName: If this matches an existing item from the list above, provide the exact name
- categoryName: Suggest a category from the list above, or suggest a new one

Respond in JSON format:
{
  "supplierName": "string or null",
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "items": [
    {
      "rawName": "string",
      "quantity": number,
      "unit": "string",
      "unitPrice": number or null,
      "totalPrice": number or null,
      "suggestedName": "string",
      "suggestedUnit": "string",
      "matchedItemName": "string or null",
      "categoryName": "string or null"
    }
  ]
}`;

    // Determine if it's a PDF or image
    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (mediaType === 'application/pdf') {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ];
    } else {
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ];
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    // Extract JSON from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON (handle markdown code blocks)
    let jsonStr = textContent.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const extractedData = JSON.parse(jsonStr.trim());

    // Try to match supplier (don't auto-create, let user confirm)
    let supplierId: string | null = null;
    let newSupplierDetected = false;
    let suggestedSupplierMatchId: string | null = null;

    if (extractedData.supplierName) {
      const supplierName = extractedData.supplierName.trim();

      // First, try to find exact match (case-insensitive)
      const exactMatch = await prisma.supplier.findFirst({
        where: {
          accountId,
          name: {
            equals: supplierName,
            mode: 'insensitive',
          },
        },
      });

      if (exactMatch) {
        supplierId = exactMatch.id;
      } else {
        // Look for similar suppliers (fuzzy match)
        const allSuppliers = await prisma.supplier.findMany({
          where: { accountId },
          select: { id: true, name: true },
        });

        // Simple similarity check: contains or starts with similar words
        const supplierWords = supplierName.toLowerCase().split(/\s+/);
        const similarSupplier = allSuppliers.find(s => {
          const existingWords = s.name.toLowerCase().split(/\s+/);
          // Check if any significant words match
          return supplierWords.some((word: string) =>
            word.length > 2 && existingWords.some((existing: string) =>
              existing.includes(word) || word.includes(existing)
            )
          );
        });

        if (similarSupplier) {
          // Found a similar supplier, ask user to confirm
          suggestedSupplierMatchId = similarSupplier.id;
          newSupplierDetected = true;
        } else {
          // No similar supplier found, need user to create or select
          newSupplierDetected = true;
        }
      }
    }

    // Update invoice with extracted metadata
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        supplierName: extractedData.supplierName,
        supplierId,
        newSupplierDetected,
        suggestedSupplierMatchId,
        invoiceNumber: extractedData.invoiceNumber,
        invoiceDate: extractedData.invoiceDate ? new Date(extractedData.invoiceDate) : null,
        totalAmount: extractedData.totalAmount,
        extractedData: JSON.stringify(extractedData),
        status: 'reviewed',
      },
    });

    // Create invoice items
    for (const item of extractedData.items) {
      // Try to match to existing item
      let matchedItemId = null;
      if (item.matchedItemName) {
        const matched = existingItems.find(
          i => i.name.toLowerCase() === item.matchedItemName.toLowerCase()
        );
        if (matched) {
          matchedItemId = matched.id;
        }
      }

      // Try to match category
      let categoryId = null;
      if (item.categoryName) {
        const matchedCategory = categories.find(
          c => c.name.toLowerCase() === item.categoryName.toLowerCase()
        );
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        }
      }

      // Calculate unitPrice from totalPrice if unitPrice is missing
      let unitPrice = item.unitPrice;
      const quantity = item.quantity || 0;
      if (!unitPrice && item.totalPrice && quantity > 0) {
        unitPrice = item.totalPrice / quantity;
      }

      await prisma.invoiceItem.create({
        data: {
          invoiceId,
          rawName: item.rawName,
          quantity,
          unit: item.unit,
          unitPrice,
          totalPrice: item.totalPrice,
          suggestedName: item.suggestedName,
          suggestedUnit: item.suggestedUnit,
          matchedItemId,
          categoryId,
          status: 'pending',
        },
      });
    }

    // Fetch and return updated invoice
    const updatedInvoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: {
        store: true,
        supplier: true,
        items: {
          include: {
            matchedItem: true,
            category: true,
          },
        },
      },
    });

    // If there's a suggested supplier match, fetch it
    let suggestedSupplierMatch = null;
    if (suggestedSupplierMatchId) {
      suggestedSupplierMatch = await prisma.supplier.findUnique({
        where: { id: suggestedSupplierMatchId },
        select: { id: true, name: true },
      });
    }

    return NextResponse.json({
      ...updatedInvoice,
      newSupplierDetected,
      suggestedSupplierMatch,
    });
  } catch (error) {
    console.error('Extraction error:', error);

    // Update status to error
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'error' },
    });

    return NextResponse.json(
      { error: 'Failed to extract invoice data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Confirm items and create stock entries
async function handleConfirmation(invoiceId: string, invoice: any, accountId: string) {
  // Get all pending items
  const items = await prisma.invoiceItem.findMany({
    where: {
      invoiceId,
      status: 'pending',
    },
    include: {
      matchedItem: true,
      category: true,
    },
  });

  const createdItems: any[] = [];
  const createdStockEntries: any[] = [];

  for (const item of items) {
    let itemId = item.matchedItemId;

    // Create new item if not matched
    if (!itemId && item.suggestedName) {
      const newItem = await prisma.item.create({
        data: {
          name: item.suggestedName,
          unit: item.suggestedUnit || item.unit || 'pieces',
          categoryId: item.categoryId,
          supplierId: invoice.supplierId, // Link to invoice supplier
          costPrice: item.unitPrice, // Set default cost price from invoice
          accountId,
        },
      });
      itemId = newItem.id;
      createdItems.push(newItem);

      // Update invoice item with created item ID
      await prisma.invoiceItem.update({
        where: { id: item.id },
        data: {
          createdItemId: newItem.id,
          status: 'created',
        },
      });
    } else if (itemId) {
      // Update existing item's cost price if invoice has unit price
      if (item.unitPrice) {
        await prisma.item.update({
          where: { id: itemId },
          data: { costPrice: item.unitPrice },
        });
      }
      // Mark as confirmed
      await prisma.invoiceItem.update({
        where: { id: item.id },
        data: { status: 'confirmed' },
      });
    }

    // Create stock entry if we have an item
    if (itemId && item.quantity > 0) {
      const stockEntry = await prisma.stockEntry.create({
        data: {
          itemId,
          storeId: invoice.storeId,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          currency: invoice.currency || 'EUR',
          accountId,
          notes: `From invoice: ${invoice.invoiceNumber || invoice.fileName}`,
        },
      });
      createdStockEntries.push(stockEntry);
    }
  }

  // Update invoice status
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'confirmed' },
  });

  return NextResponse.json({
    success: true,
    createdItems: createdItems.length,
    createdStockEntries: createdStockEntries.length,
  });
}

// Delete an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if invoice exists and belongs to account
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        accountId: session.user.accountId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Delete all items first (cascade should handle this, but being explicit)
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    await prisma.invoice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
