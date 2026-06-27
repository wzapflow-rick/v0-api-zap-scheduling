import { NextResponse } from 'next/server';
import { getInstanceStatus, getInstanceInfo, getInstanceName } from '@/lib/evolution-api';
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

    // 3. Rate limiting (using general limit for status checks)
    const rateLimitKey = `status:${establishmentId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.general);
    
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const instanceName = getInstanceName(establishmentId);
    
    // 4. Get connection state
    const statusResult = await getInstanceStatus(instanceName);
    
    if (!statusResult.success) {
      // Instance doesn't exist or error - return disconnected state
      return NextResponse.json({
        success: true,
        data: {
          instanceName,
          state: 'close',
          connected: false,
          profileName: null,
          profilePictureUrl: null,
        },
      }, {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      });
    }

    // A Evolution pode retornar o estado aninhado em { instance: { state } }
    // ou direto na raiz { state }, dependendo da versão. Lemos ambos.
    const instanceData = statusResult.data as { instance?: { state?: string }; state?: string };
    const state = instanceData?.instance?.state || instanceData?.state || 'close';

    // 5. If connected, get profile info
    let profileInfo = null;
    if (state === 'open') {
      const infoResult = await getInstanceInfo(instanceName);
      if (infoResult.success && infoResult.data) {
        const infoData = infoResult.data as { 
          instance?: { 
            profileName?: string; 
            profilePictureUrl?: string; 
            owner?: string;
          };
        };
        profileInfo = {
          profileName: infoData.instance?.profileName,
          profilePictureUrl: infoData.instance?.profilePictureUrl,
          phoneNumber: infoData.instance?.owner,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceName,
        state,
        connected: state === 'open',
        ...profileInfo,
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error('[Status Error]', error);
    return internalErrorResponse('Erro ao verificar status');
  }
}
