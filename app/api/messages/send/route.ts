import { NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution-api';
import { 
  USE_BACKEND_MESSAGES, 
  formatMessage, 
  getTemplate, 
  formatPhoneForWhatsApp,
  type AppointmentData,
  type MessageTemplate 
} from '@/lib/message-service';

export async function POST(request: Request) {
  try {
    // Check if we should use backend instead
    if (USE_BACKEND_MESSAGES) {
      return NextResponse.json({
        success: false,
        error: 'Mensagens estão configuradas para serem enviadas pelo backend',
        useBackend: true,
      });
    }

    const body = await request.json();
    const { 
      messageType, 
      appointmentData, 
      instanceName,
      customMessage,
    } = body as {
      messageType: MessageTemplate['trigger'];
      appointmentData: AppointmentData;
      instanceName: string;
      customMessage?: string;
    };

    // Validate required fields
    if (!appointmentData?.clientPhone) {
      return NextResponse.json(
        { success: false, error: 'Telefone do cliente é obrigatório' },
        { status: 400 }
      );
    }

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'Nome da instância do WhatsApp é obrigatório' },
        { status: 400 }
      );
    }

    // Get message content
    let messageContent: string;
    
    if (customMessage) {
      messageContent = customMessage;
    } else {
      const template = getTemplate(messageType);
      if (!template) {
        return NextResponse.json(
          { success: false, error: `Template de mensagem "${messageType}" não encontrado` },
          { status: 400 }
        );
      }
      messageContent = formatMessage(template.template, appointmentData);
    }

    // Format phone number
    const formattedPhone = formatPhoneForWhatsApp(appointmentData.clientPhone);

    // Send via Evolution API
    const result = await evolutionApi.sendTextMessage(
      instanceName,
      formattedPhone,
      messageContent
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Erro ao enviar mensagem' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.data?.key?.id,
        to: formattedPhone,
        messageType,
      },
    });

  } catch {
    return NextResponse.json(
      { success: false, error: 'Erro interno ao enviar mensagem' },
      { status: 500 }
    );
  }
}
