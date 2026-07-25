import { NextResponse } from 'next/server';
import { getInstanceStatus, getInstanceInfo, getInstanceName, normalizeInstanceInfo } from '@/lib/evolution-api';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  verifyAuth, 
  unauthorizedResponse, 
  rateLimitResponse, 
  badRequestResponse,
  internalErrorResponse,
  validateEstablishmentId,
} from '@/lib/api-auth';

// O status é volátil: nunca deve ser cacheado nem pré-renderizado.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // 4. Consultamos os DOIS endpoints em paralelo e combinamos os sinais.
    // O connectionState às vezes fica defasado logo após a leitura do QR,
    // enquanto o fetchInstances (connectionStatus) já reflete "open" — e vice-versa.
    // Considerar ambos evita o painel travar em "Desconectado".
    const [statusResult, infoResult] = await Promise.all([
      getInstanceStatus(instanceName),
      getInstanceInfo(instanceName),
    ]);

    // Estado vindo do connectionState (v1: raiz, v2: aninhado em instance)
    const instanceData = statusResult.data as { instance?: { state?: string }; state?: string } | undefined;
    const connectionState = instanceData?.instance?.state || instanceData?.state;

    // Estado + perfil vindos do fetchInstances (normalizado entre v1 e v2)
    const info = infoResult.success ? normalizeInstanceInfo(infoResult.data, instanceName) : null;

    // Conectado se QUALQUER um dos sinais indicar "open"
    const connected = connectionState === 'open' || info?.connectionStatus === 'open';
    const state = connected ? 'open' : connectionState || info?.connectionStatus || 'close';

    return NextResponse.json({
      success: true,
      data: {
        instanceName,
        state,
        connected,
        profileName: connected ? info?.profileName ?? null : null,
        profilePictureUrl: connected ? info?.profilePictureUrl ?? null : null,
        phoneNumber: connected ? info?.phoneNumber ?? null : null,
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        // Impede o navegador de servir a primeira resposta ("close") do cache
        // durante o polling — era isso que travava o painel em "Desconectado".
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Status Error]', error);
    return internalErrorResponse('Erro ao verificar status');
  }
}
