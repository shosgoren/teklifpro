import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSessionWithAuth } from '@/infrastructure/middleware/authMiddleware';

const PARASUT_AUTH_URL = process.env.PARASUT_AUTH_URL || 'https://auth.parasut.com/oauth/token';
const PARASUT_API_URL = process.env.PARASUT_API_URL || 'https://api.parasut.com/v4';

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

    // Authenticate directly without creating a ParasutClient instance
    const authResponse = await fetch(PARASUT_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        client_id: data.clientId,
        client_secret: data.clientSecret,
        username: data.username,
        password: data.password,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      }),
    });

    if (!authResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Parasut kimlik doğrulama başarısız. Bilgilerinizi kontrol edin.',
      });
    }

    const tokenData = await authResponse.json();

    // Test connection by fetching company info
    const companyResponse = await fetch(`${PARASUT_API_URL}/${data.companyId}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!companyResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Şirket bilgilerine erişilemedi. Company ID\'yi kontrol edin.',
      });
    }

    const companyData = await companyResponse.json();
    const companyName = companyData?.data?.attributes?.name || 'Bağlantı başarılı';

    return NextResponse.json({
      success: true,
      companyName,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Test parasut connection error:', error);
    return NextResponse.json({ success: false, error: 'Connection test failed' }, { status: 500 });
  }
}
