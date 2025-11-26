import { NextResponse } from 'next/server';
import { getSupportedCities } from '@/lib/distance';

export async function GET() {
  return NextResponse.json({
    cities: getSupportedCities(),
    count: getSupportedCities().length,
  });
}