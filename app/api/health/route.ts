import { NextResponse } from 'next/server';

// Health check endpoint for offline sync engine
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: Date.now(),
  });
}
