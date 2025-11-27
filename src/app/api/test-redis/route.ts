import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    // Set a test value
    await redis.set('test-key', 'hello from redis');
    
    // Get it back
    const value = await redis.get('test-key');
    
    return NextResponse.json({ success: true, value });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}