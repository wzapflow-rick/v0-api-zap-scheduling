import { NextResponse } from 'next/server';
import { connectInstance, getInstanceName } from '@/lib/evolution-api';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  verifyAuth, 
  unauthorizedResponse, 
  rateLimitResponse, 
  badRequestResponse,
  internalErrorResponse,
  validateEstablishmentId,
} from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // 2. Get and validate establishmentId
    const { searchParams } = new URL(request.url);
    const establishmentId = searchParams.get('establishmentId');

    if (!establishmentId) {
      return badRequestResponse('ID do estabelecimento é obrigatório');
    }

    if (!validateEstablishmentId(establishmentId)) {
      return badRequestResponse('ID do estabelecimento inválido');
    }

    const instanceName = getInstanceName(establishmentId);

    // 3. Rate limiting
    const rateLimitKey = `qrcode:${establishmentId}`;
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

    // Normaliza o QR: a Evolution retorna base64 na raiz ou aninhado em `qrcode`
    const raw = (result.data || {}) as {
      base64?: string;
      code?: string;
      pairingCode?: string;
      qrcode?: { base64?: string; code?: string; pairingCode?: string };
    };
    const rawBase64 = raw.base64 || raw.qrcode?.base64 || null;

    // Algumas versões da Evolution devolvem o base64 puro, sem o prefixo data URL.
    // Sem o prefixo a tag <img> não renderiza (QR aparece em branco), então
    // garantimos que ele esteja sempre presente.
    const base64 =
      rawBase64 && !rawBase64.startsWith('data:')
        ? `data:image/png;base64,${rawBase64}`
        : rawBase64;

    const normalized = {
      base64,
      code: raw.code || raw.qrcode?.code || null,
      pairingCode: raw.pairingCode || raw.qrcode?.pairingCode || null,
    };

    return NextResponse.json({
      success: true,
      data: normalized,
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
