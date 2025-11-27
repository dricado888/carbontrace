import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseShippingRequest } from '@/lib/claude';
import { calculateDistance } from '@/lib/distance';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

const SmartRequest = z.object({
  query: z.string().min(1, 'Query is required'),
  weight_kg: z.number().positive().optional(),
  transport_mode: z.enum(['ground', 'air', 'sea']).optional(),
});

type CachedCalculation = {
  emissions_kg: number;
  distance_km: number;
  transport_mode: string;
  confidence: number;
  calculation_id: string;
  parsed_origin: string;
  parsed_destination: string;
  weight_kg: number;
};

async function getEmissionFactor(transportMode: string): Promise<number | null> {
  const cacheKey = `emission_factor:${transportMode}`;
  
  const cached = await redis.get<number>(cacheKey);
  if (cached !== null) return cached;
  
  const { data, error } = await supabase
    .from('emission_factors')
    .select('factor_per_km_kg')
    .eq('transport_mode', transportMode)
    .single();
  
  if (error || !data) return null;
  
  await redis.set(cacheKey, data.factor_per_km_kg, { ex: 3600 });
  return data.factor_per_km_kg;
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    const body = await request.json();

    const parsed = SmartRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { query, weight_kg: providedWeight, transport_mode: providedMode } = parsed.data;

    // Use Claude to parse the natural language query
    const claudeParsed = await parseShippingRequest(query);

    if (!claudeParsed.origin || !claudeParsed.destination) {
      return NextResponse.json(
        { error: 'Could not extract origin and destination from query', parsed: claudeParsed },
        { status: 400 }
      );
    }

    // Use provided values or fall back to Claude's extraction
    const weight = providedWeight ?? claudeParsed.weight_kg ?? 1;
    const mode = providedMode ?? claudeParsed.transport_mode ?? 'ground';

    // Check cache
    const cacheKey = `smart:${claudeParsed.origin}:${claudeParsed.destination}:${weight}:${mode}`;
    
    try {
      const cachedResult = await redis.get<CachedCalculation>(cacheKey);
      if (cachedResult && typeof cachedResult === 'object') {
        return NextResponse.json({
          ...cachedResult,
          cache_hit: true,
          claude_reasoning: claudeParsed.reasoning,
          latency_ms: Math.round(performance.now() - startTime),
        });
      }
    } catch {
      // Cache miss, continue
    }

    // Get emission factor
    const factor = await getEmissionFactor(mode);
    if (factor === null) {
      return NextResponse.json(
        { error: `Unknown transport mode: ${mode}` },
        { status: 400 }
      );
    }

    // Calculate distance
    const distanceResult = calculateDistance(claudeParsed.origin, claudeParsed.destination);
    if (!distanceResult.success) {
      return NextResponse.json(
        { 
          error: distanceResult.error,
          suggestion: 'The city might not be in our database. Try using a major city name.',
          parsed: claudeParsed 
        },
        { status: 400 }
      );
    }

    const { distance_km } = distanceResult;
    const emissions_kg = Math.round(distance_km * weight * factor * 100) / 100;

    // Log to database
    supabase.from('calculations').insert({
      origin: claudeParsed.origin,
      destination: claudeParsed.destination,
      weight_kg: weight,
      transport_mode: mode,
      distance_km,
      emissions_kg,
      latency_ms: Math.round(performance.now() - startTime),
    });

    const response: CachedCalculation = {
      emissions_kg,
      distance_km,
      transport_mode: mode,
      confidence: claudeParsed.confidence,
      calculation_id: crypto.randomUUID(),
      parsed_origin: claudeParsed.origin,
      parsed_destination: claudeParsed.destination,
      weight_kg: weight,
    };

    // Cache for 24 hours
    await redis.set(cacheKey, response, { ex: 86400 });

    return NextResponse.json({
      ...response,
      cache_hit: false,
      claude_reasoning: claudeParsed.reasoning,
      latency_ms: Math.round(performance.now() - startTime),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}