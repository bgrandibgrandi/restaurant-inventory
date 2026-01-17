import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

// POST - Import recipe from image or text
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { imageBase64, text, url } = body;

    if (!imageBase64 && !text && !url) {
      return NextResponse.json(
        { error: 'Please provide an image, text, or URL' },
        { status: 400 }
      );
    }

    // Get existing items and categories for matching
    const [existingItems, categories] = await Promise.all([
      prisma.item.findMany({
        where: { accountId: session.user.accountId },
        select: { id: true, name: true, unit: true },
      }),
      prisma.category.findMany({
        where: { accountId: session.user.accountId },
        select: { id: true, name: true },
      }),
    ]);

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a professional chef and recipe analyzer. Extract the recipe information from the provided content and return it as JSON.

IMPORTANT: Only extract what's actually in the recipe. Don't invent or assume ingredients or steps.

Return ONLY valid JSON (no markdown code blocks) in this exact format:
{
  "name": "Recipe Name",
  "description": "Brief description of the dish",
  "yieldQuantity": 4,
  "yieldUnit": "portions",
  "prepTime": 15,
  "cookTime": 30,
  "instructions": "Step by step instructions as a single string, with each step on a new line",
  "ingredients": [
    {
      "name": "ingredient name (exactly as written)",
      "quantity": 200,
      "unit": "g",
      "notes": "diced, optional, etc."
    }
  ],
  "suggestedCategory": "Main Course, Appetizer, Dessert, Beverage, Sauce, Prep Item, etc."
}

For ingredients:
- quantity must be a number (convert fractions: 1/2 = 0.5, 1/4 = 0.25)
- unit should be standardized: g, kg, ml, L, units, pieces, tbsp, tsp, cups
- notes for preparation methods like "diced", "minced", "room temperature"

Existing categories in the system: ${categories.map(c => c.name).join(', ')}
Existing inventory items (for reference): ${existingItems.slice(0, 50).map(i => i.name).join(', ')}${existingItems.length > 50 ? '...' : ''}

Extract the recipe now:`;

    let messageContent: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (imageBase64) {
      // Handle image input
      const base64Match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (!base64Match) {
        return NextResponse.json(
          { error: 'Invalid image format' },
          { status: 400 }
        );
      }

      const mediaType = base64Match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';
      const base64Data = base64Match[2];

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
    } else {
      // Handle text/URL input
      const content = text || `Extract the recipe from this URL: ${url}`;
      messageContent = [
        {
          type: 'text',
          text: `${prompt}\n\nRecipe content:\n${content}`,
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
      throw new Error('No text response from AI');
    }

    // Parse the JSON (handle markdown code blocks if present)
    let jsonStr = textContent.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const extractedData = JSON.parse(jsonStr.trim());

    // Try to match ingredients to existing inventory items
    const ingredientsWithMatches = extractedData.ingredients.map((ing: any) => {
      const normalizedName = ing.name.toLowerCase().trim();

      // Find best matching item
      const match = existingItems.find(item => {
        const itemName = item.name.toLowerCase();
        return itemName === normalizedName ||
               itemName.includes(normalizedName) ||
               normalizedName.includes(itemName);
      });

      return {
        ...ing,
        matchedItemId: match?.id || null,
        matchedItemName: match?.name || null,
      };
    });

    // Try to match category
    const suggestedCategoryName = extractedData.suggestedCategory;
    const matchedCategory = categories.find(c =>
      c.name.toLowerCase() === suggestedCategoryName?.toLowerCase()
    );

    return NextResponse.json({
      success: true,
      recipe: {
        name: extractedData.name,
        description: extractedData.description || null,
        yieldQuantity: extractedData.yieldQuantity || 1,
        yieldUnit: extractedData.yieldUnit || 'portions',
        prepTime: extractedData.prepTime || null,
        cookTime: extractedData.cookTime || null,
        instructions: extractedData.instructions || null,
        suggestedCategory: suggestedCategoryName,
        matchedCategoryId: matchedCategory?.id || null,
        ingredients: ingredientsWithMatches,
      },
    });
  } catch (error) {
    console.error('Error importing recipe:', error);
    return NextResponse.json(
      { error: 'Failed to import recipe. Please try again or enter manually.' },
      { status: 500 }
    );
  }
}
