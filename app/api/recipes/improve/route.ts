import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

// POST - Improve recipe text (fix typos, grammar, formatting)
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
    const { name, description, instructions } = body;

    if (!name && !description && !instructions) {
      return NextResponse.json(
        { error: 'Please provide text to improve' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a professional culinary editor. Your task is to improve the following recipe text by:

1. Fixing typos and spelling errors
2. Correcting grammar mistakes
3. Improving clarity and readability
4. Standardizing formatting (consistent capitalization, punctuation)
5. Making ingredient names and cooking terms professional

IMPORTANT RULES:
- Do NOT change the meaning or content of the recipe
- Do NOT add new ingredients, steps, or information
- Do NOT remove any existing content
- ONLY fix errors and improve clarity
- Keep the same language as the original
- Keep all quantities and measurements exactly the same

Return ONLY valid JSON (no markdown) with the improved text:
{
  "name": "improved recipe name (or null if not provided)",
  "description": "improved description (or null if not provided)",
  "instructions": "improved instructions (or null if not provided)"
}

Original text to improve:
${name ? `Recipe Name: ${name}` : ''}
${description ? `Description: ${description}` : ''}
${instructions ? `Instructions: ${instructions}` : ''}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
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

    const improved = JSON.parse(jsonStr.trim());

    return NextResponse.json({
      success: true,
      improved: {
        name: improved.name || null,
        description: improved.description || null,
        instructions: improved.instructions || null,
      },
    });
  } catch (error) {
    console.error('Error improving recipe:', error);
    return NextResponse.json(
      { error: 'Failed to improve recipe text' },
      { status: 500 }
    );
  }
}
