import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const CalculateRequest = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  weight_kg: z.number().positive('Weight must be positive'),
  transport_mode: z.enum(['ground', 'air', 'sea']).optional().default('ground'),
});

// Hardcoded v0 - replace with real logic later
const EMISSION_FACTORS = {
  ground: 0.1, // kg CO2 per km per kg
  air: 0.5,
  sea: 0.02,
};

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    // Validate input
    const parsed = CalculateRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { origin, destination, weight_kg, transport_mode } = parsed.data;

    // Fake distance for now (we'll add real lookup later)
    const distance_km = 450;

    // Calculate emissions
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