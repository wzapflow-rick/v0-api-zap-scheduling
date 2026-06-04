import { NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution-api';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { 
  verifyAuth, 
  unauthorizedResponse, 
  rateLimitResponse, 
  badRequestResponse,
  internalErrorResponse,
  validatePhone,
  sanitizeString,
  validateSlug,
} from '@/lib/api-auth';
import { 
  formatMessage, 
  getTemplate, 
  formatPhoneForWhatsApp,
  type AppointmentData,
  type MessageTemplate 
} from '@/lib/message-service';

export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth();
    if (!auth.authenticated) {
      return unauthorizedResponse(auth.error);
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Corpo da requisição inválido');
    }

    const { 
      messageType, 
      appointmentData, 
      instanceName,
      slug,
      customMessage,
    } = body as {
      messageType?: MessageTemplate['trigger'];
      appointmentData?: AppointmentData;
      instanceName?: string;
      slug?: string;
      customMessage?: string;
    };

    // 3. Validate required fields
    if (!appointmentData?.clientPhone) {
      return badRequestResponse('Telefone do cliente é obrigatório');
    }

    if (!validatePhone(appointmentData.clientPhone)) {
      return badRequestResponse('Formato de telefone inválido');
    }

    // Determine instance name from slug or direct instanceName
    let resolvedInstanceName = instanceName;
    if (!resolvedInstanceName && slug) {
      if (!validateSlug(slug)) {
        return badRequestResponse('Slug do estabelecimento inválido');
      }
      resolvedInstanceName = `ZapFlow-Agenda_${slug}`;
    }

    if (!resolvedInstanceName) {
      return badRequestResponse('Nome da instância ou slug do estabelecimento é obrigatório');
    }

    // 4. Rate limiting - use slug or instance name as identifier
    const rateLimitKey = `messages:${resolvedInstanceName}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.messages);
    
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetIn);
    }

    // 5. Get message content
    let messageContent: string;
    
    if (customMessage) {
      messageContent = sanitizeString(customMessage, 2000);
      if (!messageContent) {
        return badRequestResponse('Mensagem personalizada inválida');
      }
    } else {
      if (!messageType) {
        return badRequestResponse('Tipo de mensagem é obrigatório quando não há mensagem personalizada');
      }
      
      const template = getTemplate(messageType);
      if (!template) {
        return badRequestResponse(`Template de mensagem "${messageType}" não encontrado`);
      }
      
      // Sanitize appointment data
      const sanitizedData: AppointmentData = {
        clientName: sanitizeString(appointmentData.clientName || 'Cliente', 100),
        clientPhone: appointmentData.clientPhone,
        date: sanitizeString(appointmentData.date || '', 50),
        time: sanitizeString(appointmentData.time || '', 20),
        serviceName: sanitizeString(appointmentData.serviceName || '', 100),
        professionalName: sanitizeString(appointmentData.professionalName || '', 100),
        establishmentName: sanitizeString(appointmentData.establishmentName || '', 100),
        establishmentAddress: sanitizeString(appointmentData.establishmentAddress || '', 200),
        bookingUrl: sanitizeString(appointmentData.bookingUrl || '', 200),
      };
      
      messageContent = formatMessage(template.template, sanitizedData);
    }

    // 6. Format phone number for WhatsApp
    const formattedPhone = formatPhoneForWhatsApp(appointmentData.clientPhone);

    // 7. Send via Evolution API
    const result = await evolutionApi.sendTextMessage(
      resolvedInstanceName,
      formattedPhone,
      messageContent
    );

    if (!result.success) {
      // Log error for monitoring (in production, use proper logging)
      console.error('[Evolution API Error]', {
        instanceName: resolvedInstanceName,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        { success: false, error: result.error || 'Erro ao enviar mensagem' },
        { status: 502 } // Bad Gateway - upstream error
      );
    }

    // 8. Return success with rate limit headers
    return NextResponse.json({
      success: true,
      data: {
        messageId: (result.data as { key?: { id?: string } })?.key?.id,
        to: formattedPhone,
        messageType: messageType || 'custom',
        instanceName: resolvedInstanceName,
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Date.now() + rateLimit.resetIn),
      },
    });

  } catch (error) {
    console.error('[Messages Send Error]', error);
    return internalErrorResponse('Erro interno ao enviar mensagem');
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    service: 'messages',
    timestamp: new Date().toISOString(),
  });
}
