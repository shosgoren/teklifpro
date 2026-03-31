import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';
import { ParasutClient } from '@/infrastructure/services/parasut/ParasutClient';

const testSchema = z.object({
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = testSchema.parse(body);

    const client = new ParasutClient({
      companyId: data.companyId,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      username: data.username,
      password: data.password,
    });

    const result = await client.testConnection();

    return NextResponse.json({
      success: result.success,
      companyName: result.companyName,
      error: result.error,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Test parasut connection error:', error);
    return NextResponse.json({ success: false, error: 'Connection test failed' }, { status: 500 });
  }
}
