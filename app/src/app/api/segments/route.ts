import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFilterGroup } from '@/lib/filter-schema';

// GET /api/segments — list all segments
export async function GET() {
  try {
    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { campaigns: true } } },
    });

    // Compute live audience size for each segment
    const { filterGroupToPrismaWhere } = await import('@/lib/filter-to-prisma');
    const segmentsWithSize = await Promise.all(
      segments.map(async (seg) => {
        try {
          const { validateFilterGroup } = await import('@/lib/filter-schema');
          const filterGroup = validateFilterGroup(seg.filterJson);
          const where = filterGroupToPrismaWhere(filterGroup);
          const audienceSize = await prisma.customer.count({ where });
          return { ...seg, audienceSize };
        } catch {
          return { ...seg, audienceSize: null };
        }
      }),
    );

    return NextResponse.json(segmentsWithSize);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 });
  }
}

// POST /api/segments — create segment
export async function POST(req: NextRequest) {
  try {
    const { name, description, filterJson } = await req.json();
    if (!name || !filterJson) {
      return NextResponse.json({ error: 'name and filterJson required' }, { status: 400 });
    }

    const validated = validateFilterGroup(filterJson);

    const segment = await prisma.segment.create({
      data: { name, description, filterJson: validated as object },
    });

    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error('Create segment error:', error);
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 });
  }
}
