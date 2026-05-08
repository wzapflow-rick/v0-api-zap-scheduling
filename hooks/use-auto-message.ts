'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { 
  USE_BACKEND_MESSAGES,
  type AppointmentData,
  type MessageTemplate,
} from '@/lib/message-service';

interface SendMessageOptions {
  messageType: MessageTemplate['trigger'];
  appointmentData: AppointmentData;
  instanceName: string;
  silent?: boolean; // Don't show toast notifications
}

interface SendMessageResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export function useAutoMessage() {
  const sendMessage = useCallback(async (options: SendMessageOptions): Promise<SendMessageResult> => {
    const { messageType, appointmentData, instanceName, silent = false } = options;

    // If backend messages are enabled, skip frontend sending
    if (USE_BACKEND_MESSAGES) {
      return { success: true }; // Backend will handle it
    }

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageType,
          appointmentData,
          instanceName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        // If backend should handle, silently succeed
        if (result.useBackend) {
          return { success: true };
        }
        
        if (!silent) {
          toast.error('Erro ao enviar mensagem automática', {
            description: result.error,
          });
        }
        return { success: false, error: result.error };
      }

      if (!silent) {
        toast.success('Mensagem enviada', {
          description: `Mensagem de ${getMessageTypeName(messageType)} enviada com sucesso`,
        });
      }

      return { success: true, messageId: result.data?.messageId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (!silent) {
        toast.error('Erro ao enviar mensagem', { description: errorMessage });
      }
      return { success: false, error: errorMessage };
    }
  }, []);

  return { sendMessage };
}

function getMessageTypeName(type: MessageTemplate['trigger']): string {
  const names: Record<MessageTemplate['trigger'], string> = {
    confirmation: 'confirmação',
    reminder_24h: 'lembrete 24h',
    reminder_1h: 'lembrete 1h',
    completed: 'agradecimento',
    cancelled: 'cancelamento',
  };
  return names[type] || type;
}
