import { NextRequest, NextResponse } from 'next/server';

const SAMPLE_RESPONSE = {
  emissions_kg: 2.4,
  distance_km: 450,
  transport_mode: 'ground',
  confidence: 0.95,
};

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    if (!body.origin || !body.destination || !body.weight_kg) {
      return NextResponse.json(
        { error: 'Missing required fields: origin, destination, weight_kg' },
        { status: 400 }
      );
    }

    const response = {
      ...SAMPLE_RESPONSE,
      calculation_id: crypto.randomUUID(),
      request: {
        origin: body.origin,
        destination: body.destination,
        weight_kg: body.weight_kg,
      },
      latency_ms: Math.round(performance.now() - startTime),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}