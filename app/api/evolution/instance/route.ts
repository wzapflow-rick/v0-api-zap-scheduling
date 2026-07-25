import { NextResponse } from 'next/server';
import { createInstance, deleteInstance, logoutInstance, getInstanceInfo, getInstanceName, normalizeInstanceInfo } from '@/lib/evolution-api';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  verifyAuth, 
  unauthorizedResponse, 
  rateLimitResponse, 
  badRequestResponse,
  internalErrorResponse,
  validateEstablishmentId,
} from '@/lib/api-auth';

// Create or get instance for establishment
export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // 2. Parse and validate request
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Corpo da requisição inválido');
    }

    const { establishmentId } = body;
    
    if (!establishmentId) {
      return badRequestResponse('ID do estabelecimento é obrigatório');
    }

    if (!validateEstablishmentId(establishmentId)) {
      return badRequestResponse('ID do estabelecimento inválido');
    }

    // 3. Rate limiting
    const rateLimitKey = `instance:${establishmentId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.instance);
    
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const instanceName = getInstanceName(establishmentId);
    
    // 4. Verifica se a instância JÁ existe no servidor Evolution.
    // ATENÇÃO: na Evolution v2, fetchInstances retorna um ARRAY — e um array
    // VAZIO (instância inexistente) é truthy em JS. Por isso não podemos checar
    // apenas `existingInstance.data`; normalizamos a resposta e só consideramos
    // existente quando encontramos de fato a instância pelo nome. Caso contrário,
    // a criação era pulada e o /connect falhava com "não foi possível".
    const existingInstance = await getInstanceInfo(instanceName);
    const existingInfo = existingInstance.success
      ? normalizeInstanceInfo(existingInstance.data, instanceName)
      : null;

    if (existingInfo) {
      return NextResponse.json({
        success: true,
        data: {
          instanceName,
          exists: true,
          ...existingInfo,
        },
      }, {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      });
    }

    // 5. Create new instance (instância ainda não existe)
    const result = await createInstance(instanceName);

    if (!result.success) {
      // A Evolution responde 403 "This name is already in use" quando a
      // instância JÁ existe. Isso não é um erro para o nosso fluxo: significa
      // que ela está pronta para receber o /connect e gerar o QR Code.
      // Tratamos como sucesso para não bloquear a conexão caso o fetchInstances
      // tenha retornado num formato que não conseguimos casar pelo nome.
      const alreadyExists = /already\s+(in\s+use|exists)|já\s+está\s+em\s+uso/i.test(
        result.error || ''
      );

      if (alreadyExists) {
        return NextResponse.json({
          success: true,
          data: { instanceName, exists: true },
        }, {
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        });
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        instanceName,
        exists: false,
        ...(result.data && typeof result.data === 'object' ? result.data : {}),
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error('[Instance Create Error]', error);
    return internalErrorResponse('Erro ao criar instância');
  }
}

// Delete/logout instance
export async function DELETE(request: Request) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // 2. Get and validate parameters
    const { searchParams } = new URL(request.url);
    const establishmentId = searchParams.get('establishmentId');
    const action = searchParams.get('action') || 'logout'; // logout or delete

    if (!establishmentId) {
      return badRequestResponse('ID do estabelecimento é obrigatório');
    }

    if (!validateEstablishmentId(establishmentId)) {
      return badRequestResponse('ID do estabelecimento inválido');
    }

    if (!['logout', 'delete'].includes(action)) {
      return badRequestResponse('Ação inválida. Use "logout" ou "delete"');
    }

    // 3. Rate limiting
    const rateLimitKey = `instance:${establishmentId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.instance);
    
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    const instanceName = getInstanceName(establishmentId);
    
    // 4. Execute action
    let result;
    if (action === 'delete') {
      result = await deleteInstance(instanceName);
    } else {
      result = await logoutInstance(instanceName);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: action === 'delete' ? 'Instância deletada' : 'Desconectado com sucesso',
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error('[Instance Delete Error]', error);
    return internalErrorResponse('Erro ao desconectar instância');
  }
}
