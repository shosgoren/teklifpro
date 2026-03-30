import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Parasut sync cron executed',
    timestamp: new Date().toISOString(),
  });
}
