import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST() {
  await redis.flushdb();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}