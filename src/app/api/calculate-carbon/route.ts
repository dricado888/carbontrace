import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateDistance } from '@/lib/distance';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

const CalculateRequest = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  weight_kg: z.number().positive('Weight must be positive'),
  transport_mode: z.enum(['ground', 'air', 'sea']).optional().default('ground'),
});

// Cache emission factors for 1 hour
async function getEmissionFactor(transportMode: string): Promise<number | null> {
  const cacheKey = `emission_factor:${transportMode}`;
  
  // Try cache first
  const cached = await redis.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Miss - fetch from database
  const { data, error } = await supabase
    .from('emission_factors')
    .select('factor_per_km_kg')
    .eq('transport_mode', transportMode)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Cache for 1 hour
  await redis.set(cacheKey, data.factor_per_km_kg, { ex: 3600 });
  
  return data.factor_per_km_kg;
}

type CachedCalculation = {
  emissions_kg: number;
  distance_km: number;
  transport_mode: string;
  confidence: number;
  calculation_id: string;
  request: {
    origin: string;
    destination: string;
    weight_kg: number;
  };
  cache_hit: boolean;
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

    // Check cache for this exact calculation
    const calcCacheKey = `calc:${origin}:${destination}:${weight_kg}:${transport_mode}`;
    
    try {
      const cachedResult = await redis.get<CachedCalculation>(calcCacheKey);
      
      if (cachedResult && typeof cachedResult === 'object') {
        return NextResponse.json({
          ...cachedResult,
          cache_hit: true,
          latency_ms: Math.round(performance.now() - startTime),
        });
      }
    } catch {
      // Cache miss or error, continue with calculation
    }

    // Get emission factor (cached)
    const factor = await getEmissionFactor(transport_mode);
    if (factor === null) {
      return NextResponse.json(
        { error: `Unknown transport mode: ${transport_mode}` },
        { status: 400 }
      );
    }

    // Calculate distance
    const distanceResult = calculateDistance(origin, destination);
    if (!distanceResult.success) {
      return NextResponse.json(
        { error: distanceResult.error },
        { status: 400 }
      );
    }

    const { distance_km } = distanceResult;
    const emissions_kg = Math.round(distance_km * weight_kg * factor * 100) / 100;
    const latency_ms = Math.round(performance.now() - startTime);

    // Log calculation to database (don't await - fire and forget)
    supabase.from('calculations').insert({
      origin,
      destination,
      weight_kg,
      transport_mode,
      distance_km,
      emissions_kg,
      latency_ms,
    });

    const response: CachedCalculation = {
      emissions_kg,
      distance_km,
      transport_mode,
      confidence: 0.95,
      calculation_id: crypto.randomUUID(),
      request: { origin, destination, weight_kg },
      cache_hit: false,
    };

    // Cache this calculation for 24 hours
    await redis.set(calcCacheKey, response, { ex: 86400 });

    return NextResponse.json({
      ...response,
      latency_ms,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }
}