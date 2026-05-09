'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MessageSquare, Gift, UserX, Users, XCircle, ListTodo, Megaphone, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { AutomaticMessage, getMessagePreview } from '@/types/evolution';
import { toast } from 'sonner';

interface MessagePreviewProps {
  message: AutomaticMessage;
  instanceName?: string | null;
  whatsappConnected?: boolean;
}

const triggerLabels: Record<string, string> = {
  appointment_created: 'Agendamento criado',
  reminder_24h: '24h antes',
  reminder_1h: '1h antes',
  appointment_completed: 'Atendimento concluído',
  client_birthday: 'Aniversário',
  no_show: 'Não compareceu',
  client_inactive: 'Cliente inativo (30+ dias)',
  appointment_cancelled: 'Cancelamento',
  waitlist_available: 'Vaga disponível',
  promotion: 'Manual/Programado',
};

const categoryColors: Record<string, string> = {
  agendamento: 'bg-blue-100 text-blue-800',
  relacionamento: 'bg-purple-100 text-purple-800',
  marketing: 'bg-orange-100 text-orange-800',
};

const categoryLabels: Record<string, string> = {
  agendamento: 'Agendamento',
  relacionamento: 'Relacionamento',
  marketing: 'Marketing',
};

export function MessagePreview({ message, instanceName, whatsappConnected }: MessagePreviewProps) {
  const preview = getMessagePreview(message);
  const [testPhone, setTestPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast.error('Digite um número de telefone para teste');
      return;
    }

    if (!instanceName) {
      toast.error('WhatsApp não está conectado');
      return;
    }

    setIsSending(true);
    setSendStatus('idle');

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageType: message.trigger === 'appointment_created' ? 'confirmation' : 
                       message.trigger === 'reminder_24h' ? 'reminder_24h' :
                       message.trigger === 'reminder_1h' ? 'reminder_1h' :
                       message.trigger === 'appointment_cancelled' ? 'cancellation' : 'confirmation',
          instanceName,
          appointmentData: {
            clientName: 'Cliente Teste',
            clientPhone: testPhone.replace(/\D/g, ''),
            date: new Date().toLocaleDateString('pt-BR'),
            time: '14:00',
            serviceName: 'Serviço Exemplo',
            professionalName: 'Profissional Exemplo',
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSendStatus('success');
        toast.success('Mensagem de teste enviada com sucesso!');
      } else {
        setSendStatus('error');
        toast.error(result.error || 'Erro ao enviar mensagem de teste');
      }
    } catch (error) {
      setSendStatus('error');
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          Gatilho: {triggerLabels[message.trigger]}
        </Badge>
        <Badge className={`text-xs ${categoryColors[message.category]}`}>
          {categoryLabels[message.category]}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">{message.description}</p>

      {/* Phone Mockup Preview */}
      <div className="mx-auto w-full max-w-xs">
        <div className="rounded-3xl border-4 border-foreground/10 bg-background p-2">
          {/* Phone Header */}
          <div className="mb-2 flex items-center gap-2 rounded-t-2xl bg-primary/10 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20" />
            <div>
              <p className="text-xs font-medium">Barbearia do Zé</p>
              <p className="text-[10px] text-muted-foreground">online</p>
            </div>
          </div>
          
          {/* Message Bubble */}
          <div className="min-h-40 rounded-2xl bg-muted/50 p-3">
            <div className="max-w-[85%] rounded-lg rounded-tl-none bg-background p-3 shadow-sm">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{preview}</p>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">14:30</p>
            </div>
          </div>
        </div>
      </div>

      {/* Variables Used */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Variáveis utilizadas:</p>
        <div className="flex flex-wrap gap-1">
          {message.variables.map((variable) => (
            <code
              key={variable}
              className="rounded bg-muted px-1.5 py-0.5 text-xs"
            >
              {`{${variable}}`}
            </code>
          ))}
        </div>
      </div>

      {/* Test Message Section */}
      <div className="mt-6 space-y-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Enviar Mensagem de Teste</p>
        </div>
        
        {!whatsappConnected ? (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Conecte seu WhatsApp primeiro para enviar mensagens de teste</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="test-phone" className="text-xs">
                Número do WhatsApp (com DDD)
              </Label>
              <Input
                id="test-phone"
                placeholder="11999998888"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                disabled={isSending}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas números, sem espaços ou caracteres especiais
              </p>
            </div>
            
            <Button
              onClick={handleSendTest}
              disabled={isSending || !testPhone.trim()}
              className="w-full gap-2"
              size="sm"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : sendStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Enviado com sucesso!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Teste
                </>
              )}
            </Button>
            
            {sendStatus === 'error' && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>Falha ao enviar. Verifique o número e tente novamente.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
