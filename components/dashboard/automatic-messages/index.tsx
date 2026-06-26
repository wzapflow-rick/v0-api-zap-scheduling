'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { WhatsAppConnection } from './whatsapp-connection';
import { automaticMessagesApi } from '@/lib/api';

interface AutomaticMessagesProps {
  slug: string;
}

const messageTypes = [
  { id: 'confirmation', label: 'Confirmação de agendamento', description: 'Enviada ao criar um agendamento' },
  { id: 'cancellation', label: 'Cancelamento', description: 'Enviada ao cancelar um agendamento' },
  { id: 'thank_you', label: 'Agradecimento', description: 'Enviada ao concluir um agendamento' },
  { id: 'no_show', label: 'Não comparecimento', description: 'Enviada quando o cliente falta' },
  { id: 'reminder_24h', label: 'Lembrete 24h', description: 'Enviada 24h antes do agendamento' },
  { id: 'reminder_1h', label: 'Lembrete 1h', description: 'Enviada 1h antes do agendamento' },
];

export function AutomaticMessages({ slug }: AutomaticMessagesProps) {
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load config from API
  const loadConfig = useCallback(async () => {
    try {
      const result = await automaticMessagesApi.get();
      if (result.success && result.data) {
        setWhatsappConnected(result.data.whatsappConnected || false);
      }
    } catch {
      // If endpoint doesn't exist yet, use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleConnectionChange = (connected: boolean) => {
    setWhatsappConnected(connected);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Mensagens Automáticas</h2>
        <p className="text-sm text-muted-foreground">
          Conecte seu WhatsApp para enviar mensagens automáticas aos seus clientes
        </p>
      </div>

      {/* WhatsApp Connection */}
      <WhatsAppConnection
        slug={slug}
        backendConnected={whatsappConnected}
        onConnectionChange={handleConnectionChange}
      />

      {/* Info Card - What messages are sent */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Mensagens Enviadas Automaticamente</CardTitle>
              <CardDescription>
                Quando o WhatsApp estiver conectado, essas mensagens serão enviadas automaticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {messageTypes.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${whatsappConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">{msg.label}</p>
                  <p className="text-xs text-muted-foreground">{msg.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {!whatsappConnected && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Conecte seu WhatsApp acima para ativar as mensagens automáticas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
