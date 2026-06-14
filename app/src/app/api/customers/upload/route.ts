import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

interface CSVRow {
  name?: string;
  email?: string;
  phone?: string;
  total_spend?: string;
  totalSpend?: string;
  last_order_date?: string;
  lastOrderDate?: string;
  tags?: string;
  [key: string]: string | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvData } = body;

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'csvData (string) is required' }, { status: 400 });
    }

    const result = Papa.parse<CSVRow>(csvData.trim(), {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parse error', details: result.errors.slice(0, 3) },
        { status: 400 },
      );
    }

    const rows = result.data;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
    }

    // Validate required columns
    const firstRow = rows[0];
    if (!firstRow.name && !firstRow.email) {
      return NextResponse.json(
        { error: 'CSV must have at least "name" and "email" columns' },
        { status: 400 },
      );
    }

    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase();
      const name = (row.name || '').trim();

      if (!email || !name) {
        skipped.push(email || name || 'unknown');
        continue;
      }

      // Skip duplicates
      const existing = await prisma.customer.findUnique({ where: { email } });
      if (existing) {
        skipped.push(email);
        continue;
      }

      try {
        const spendRaw = row.total_spend || row.totalspend || '0';
        const totalSpend = parseFloat(spendRaw.replace(/[^0-9.]/g, '')) || 0;

        const dateRaw = row.last_order_date || row.lastorderdate || '';
        const lastOrderDate = dateRaw ? new Date(dateRaw) : null;

        const tagsRaw = row.tags || '';
        const tags = tagsRaw
          ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
          : [];

        await prisma.customer.create({
          data: {
            name,
            email,
            phone: row.phone?.trim() || null,
            totalSpend,
            lastOrderDate: lastOrderDate && !isNaN(lastOrderDate.getTime()) ? lastOrderDate : null,
            tags,
          },
        });
        created.push(email);
      } catch (e) {
        errors.push(`${email}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
      message: `Imported ${created.length} customers (${skipped.length} skipped, ${errors.length} errors)`,
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
