import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/shared/utils/prisma';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

const parasutSchema = z.object({
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
    const data = parasutSchema.parse(body);

    await prisma.tenant.update({
      where: { id: session.tenant.id },
      data: {
        parasutCompanyId: data.companyId,
        parasutClientId: data.clientId,
        parasutClientSecret: data.clientSecret,
        parasutUsername: data.username,
        parasutPassword: data.password,
        parasutSyncEnabled: true,
      },
    });

    return NextResponse.json({ success: true, message: 'Parasut credentials saved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Onboarding parasut error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
