import { NextRequest, NextResponse } from 'next/server';
import { parseShippingRequest } from '@/lib/claude';

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    const parsed = await parseShippingRequest(body.query);

    return NextResponse.json({
      ...parsed,
      latency_ms: Math.round(performance.now() - startTime),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse request' },
      { status: 500 }
    );
  }
}