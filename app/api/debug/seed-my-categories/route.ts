import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Category tree structure
interface CategoryNode {
  name: string;
  icon?: string;
  children?: (CategoryNode | string)[];
}

const CATEGORY_TREE: CategoryNode[] = [
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
    icon: "🔧",
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
  { name: "GESTORÍA Y ASESORÍA", icon: "🧑‍💼", children: [] },
  { name: "COMUNICACIÓN Y MARKETING", icon: "📢", children: [] },
  { name: "FINANZAS", icon: "💸", children: [] },
  { name: "OTROS", icon: "📦", children: [] },
  { name: "TECNOLOGÍA", icon: "💻", children: [] },
  { name: "EQUIPAMIENTO Y MOBILIARIO", icon: "🪑", children: [] },
  { name: "DELIVERY", icon: "🛵", children: [] }
];

async function createCategoryTree(
  nodes: (CategoryNode | string)[],
  accountId: string,
  parentId: string | null = null,
  level: number = 0
): Promise<string[]> {
  const created: string[] = [];

  let sortOrder = 0;
  for (const node of nodes) {
    const isString = typeof node === 'string';
    const name = isString ? node : node.name;
    const icon = isString ? null : (node.icon || null);
    const children = isString ? [] : (node.children || []);

    // Check if category already exists
    const existing = await prisma.category.findFirst({
      where: { name, parentId, accountId }
    });

    let categoryId: string;

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { icon, sortOrder, level, isSystem: true, isActive: true }
      });
      categoryId = existing.id;
    } else {
      const category = await prisma.category.create({
        data: {
          name, icon, sortOrder, level,
          isSystem: true, isActive: true,
          parentId, accountId
        }
      });
      categoryId = category.id;
      created.push(name);
    }

    sortOrder++;

    if (children.length > 0) {
      const childCreated = await createCategoryTree(children, accountId, categoryId, level + 1);
      created.push(...childCreated);
    }
  }

  return created;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.accountId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = session.user.accountId;

    // Count before
    const countBefore = await prisma.category.count({
      where: { accountId }
    });

    // Create categories
    const created = await createCategoryTree(CATEGORY_TREE, accountId);

    // Count after
    const countAfter = await prisma.category.count({
      where: { accountId }
    });

    return NextResponse.json({
      success: true,
      accountId,
      countBefore,
      countAfter,
      newCategoriesCreated: created.length,
      createdNames: created.slice(0, 20) // First 20 for brevity
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to seed categories for your account'
  });
}
