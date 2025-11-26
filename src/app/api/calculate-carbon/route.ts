import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDistance } from '@/lib/distance';

const CalculateRequest = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  weight_kg: z.number().positive('Weight must be positive'),
  transport_mode: z.enum(['ground', 'air', 'sea']).optional().default('ground'),
});

const EMISSION_FACTORS = {
  ground: 0.1,
  air: 0.5,
  sea: 0.02,
};

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    const parsed = CalculateRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { origin, destination, weight_kg, transport_mode } = parsed.data;

    // Calculate real distance
    const distanceResult = calculateDistance(origin, destination);
    if (!distanceResult.success) {
      return NextResponse.json(
        { error: distanceResult.error },
        { status: 400 }
      );
    }

    const { distance_km } = distanceResult;
    const emissions_kg = distance_km * weight_kg * EMISSION_FACTORS[transport_mode];

    const response = {
      emissions_kg: Math.round(emissions_kg * 100) / 100,
      distance_km,
      transport_mode,
      confidence: 0.95,
      calculation_id: crypto.randomUUID(),
      request: { origin, destination, weight_kg },
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