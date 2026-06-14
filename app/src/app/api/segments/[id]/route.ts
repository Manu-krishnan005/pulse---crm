import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/segments/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check if segment has any campaigns
    const segment = await prisma.segment.findUnique({
      where: { id },
      include: { _count: { select: { campaigns: true } } },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    if (segment._count.campaigns > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete segment — it's used by ${segment._count.campaigns} campaign(s). Delete those campaigns first.`,
        },
        { status: 409 },
      );
    }

    await prisma.segment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete segment error:', error);
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 });
  }
}
