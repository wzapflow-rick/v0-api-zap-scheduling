import { NextResponse } from 'next/server';
import { connectInstance } from '@/lib/evolution-api';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  verifyAuth, 
  unauthorizedResponse, 
  rateLimitResponse, 
  badRequestResponse,
  internalErrorResponse,
  validateSlug,
} from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // 2. Get and validate slug
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return badRequestResponse('Slug do estabelecimento é obrigatório');
    }

    if (!validateSlug(slug)) {
      return badRequestResponse('Slug do estabelecimento inválido');
    }

    const instanceName = `ZapFlow-Agenda_${slug}`;

    // 3. Rate limiting
    const rateLimitKey = `qrcode:${slug}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.qrcode);
    
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    // 4. Connect to instance
    const result = await connectInstance(instanceName);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error('[QRCode Error]', error);
    return internalErrorResponse('Erro ao gerar QR Code');
  }
}
