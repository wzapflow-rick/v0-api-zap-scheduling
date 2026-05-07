'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Calendar, Clock, MessageSquare, Gift, UserX, Users, XCircle, ListTodo, Megaphone } from 'lucide-react';
import { AutomaticMessage, getMessagePreview } from '@/types/evolution';

interface MessagePreviewProps {
  message: AutomaticMessage | null;
}

const triggerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  appointment_created: Calendar,
  reminder_24h: Clock,
  reminder_1h: Clock,
  appointment_completed: MessageSquare,
  client_birthday: Gift,
  no_show: UserX,
  client_inactive: Users,
  appointment_cancelled: XCircle,
  waitlist_available: ListTodo,
  promotion: Megaphone,
};

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

export function MessagePreview({ message }: MessagePreviewProps) {
  if (!message) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Preview da Mensagem</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              Selecione uma mensagem para ver o preview
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = triggerIcons[message.trigger] || MessageSquare;
  const preview = getMessagePreview(message);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Preview da Mensagem</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{message.name}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Gatilho: {triggerLabels[message.trigger]}
            </Badge>
            <Badge className={`text-xs ${categoryColors[message.category]}`}>
              {categoryLabels[message.category]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{message.description}</p>
        </div>

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
            <div className="min-h-48 rounded-2xl bg-muted/50 p-3">
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
      </CardContent>
    </Card>
  );
}
