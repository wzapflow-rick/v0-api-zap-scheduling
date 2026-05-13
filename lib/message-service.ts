// Message Service
// Handles sending automatic messages via frontend API routes
// When backend is ready, set USE_BACKEND_MESSAGES = true to disable frontend sending

// Toggle this to switch between frontend and backend message sending
export const USE_BACKEND_MESSAGES = true;

// Debug mode - shows toast with instance name on every message attempt
export const DEBUG_MESSAGES = true;

export interface MessageTemplate {
  id: string;
  name: string;
  trigger: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'completed' | 'cancelled';
  template: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'confirmation',
    name: 'Confirmação de Agendamento',
    trigger: 'confirmation',
    template: `Olá, {clientName}! 👋

Seu agendamento foi confirmado:

📅 *Data:* {date}
⏰ *Horário:* {time}
💇 *Serviço:* {serviceName}
👤 *Profissional:* {professionalName}

Endereço: {establishmentAddress}

Caso precise cancelar ou reagendar, entre em contato conosco.

Até breve! ✨`,
  },
  {
    id: 'reminder_24h',
    name: 'Lembrete 24h Antes',
    trigger: 'reminder_24h',
    template: `Olá, {clientName}! 👋

Lembrete: Você tem um agendamento *amanhã*!

📅 *Data:* {date}
⏰ *Horário:* {time}
💇 *Serviço:* {serviceName}
👤 *Profissional:* {professionalName}

Confirme sua presença respondendo esta mensagem.

Te esperamos! 😊`,
  },
  {
    id: 'reminder_1h',
    name: 'Lembrete 1h Antes',
    trigger: 'reminder_1h',
    template: `Olá, {clientName}! ⏰

Seu agendamento é em *1 hora*!

⏰ *Horário:* {time}
💇 *Serviço:* {serviceName}
👤 *Profissional:* {professionalName}

Estamos te esperando! 🙌`,
  },
  {
    id: 'completed',
    name: 'Agendamento Concluído',
    trigger: 'completed',
    template: `Olá, {clientName}! 🌟

Obrigado pela visita! Esperamos que tenha gostado do atendimento.

Ficaremos felizes em recebê-lo novamente! 

Agende seu próximo horário: {bookingUrl}

Até a próxima! 💫`,
  },
  {
    id: 'cancelled',
    name: 'Agendamento Cancelado',
    trigger: 'cancelled',
    template: `Olá, {clientName}.

Seu agendamento para {date} às {time} foi cancelado.

Caso queira reagendar, acesse: {bookingUrl}

Estamos à disposição! 🙏`,
  },
];

export interface AppointmentData {
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  serviceName: string;
  professionalName: string;
  establishmentName?: string;
  establishmentAddress?: string;
  bookingUrl?: string;
}

export function formatMessage(template: string, data: AppointmentData): string {
  return template
    .replace(/{clientName}/g, data.clientName)
    .replace(/{date}/g, data.date)
    .replace(/{time}/g, data.time)
    .replace(/{serviceName}/g, data.serviceName)
    .replace(/{professionalName}/g, data.professionalName)
    .replace(/{establishmentName}/g, data.establishmentName || '')
    .replace(/{establishmentAddress}/g, data.establishmentAddress || '')
    .replace(/{bookingUrl}/g, data.bookingUrl || '');
}

export function getTemplate(trigger: MessageTemplate['trigger']): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find(t => t.trigger === trigger);
}

export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters
  let numbers = phone.replace(/\D/g, '');
  
  // Add Brazil country code if not present
  if (numbers.length === 10 || numbers.length === 11) {
    numbers = `55${numbers}`;
  }
  
  // Evolution API requires the format: 5511999999999@s.whatsapp.net
  return `${numbers}@s.whatsapp.net`;
}

// Send message with debug toast
export async function sendMessageWithDebug(params: {
  messageType: string;
  instanceName: string;
  appointmentData: AppointmentData;
  showDebugToast?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { messageType, instanceName, appointmentData, showDebugToast = DEBUG_MESSAGES } = params;
  
  // Import toast dynamically to avoid circular dependencies
  const { toast } = await import('sonner');
  
  if (showDebugToast) {
    toast.info(`[DEBUG] Enviando mensagem`, {
      description: `Tipo: ${messageType}\nInstancia: ${instanceName}\nTelefone: ${appointmentData.clientPhone}`,
      duration: 5000,
    });
  }
  
  try {
    const response = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageType,
        instanceName,
        appointmentData,
      }),
    });
    
    const result = await response.json();
    
    if (showDebugToast) {
      if (result.success) {
        toast.success(`[DEBUG] Mensagem enviada!`, {
          description: `Instancia: ${instanceName}`,
        });
      } else {
        toast.error(`[DEBUG] Erro ao enviar`, {
          description: result.error || 'Erro desconhecido',
        });
      }
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
    
    if (showDebugToast) {
      toast.error(`[DEBUG] Erro de conexão`, {
        description: errorMessage,
      });
    }
    
    return { success: false, error: errorMessage };
  }
}

// Map appointment status to message type
export function getMessageTypeForStatus(status: string): string | null {
  const statusMap: Record<string, string> = {
    'CONFIRMED': 'confirmation',
    'CANCELLED': 'cancellation',
    'NO_SHOW': 'no_show',
    'COMPLETED': 'thank_you',
  };
  return statusMap[status] || null;
}
