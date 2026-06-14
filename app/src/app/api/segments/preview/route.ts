import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFilterGroup } from '@/lib/filter-schema';
import { filterGroupToPrismaWhere } from '@/lib/filter-to-prisma';

export async function POST(req: NextRequest) {
  try {
    const { filterJson } = await req.json();
    const group = validateFilterGroup(filterJson);
    const where = filterGroupToPrismaWhere(group);

    const [count, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          totalSpend: true,
          lastOrderDate: true,
          tags: true,
        },
        orderBy: { totalSpend: 'desc' },
      }),
    ]);

    return NextResponse.json({ count, customers });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid filter schema', details: error.message }, { status: 400 });
    }
    console.error('Segment preview error:', error);
    return NextResponse.json({ error: 'Failed to preview segment' }, { status: 500 });
  }
}
