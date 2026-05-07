'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WhatsAppConnection } from './whatsapp-connection';
import { MessageSelector } from './message-selector';
import { automaticMessagesApi } from '@/lib/api';

interface AutomaticMessagesProps {
  establishmentId: string;
  slug: string;
  planLimit?: number;
}

export function AutomaticMessages({ establishmentId, slug, planLimit = 5 }: AutomaticMessagesProps) {
  const [activeMessages, setActiveMessages] = useState<string[]>([]);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config from API
  const loadConfig = useCallback(async () => {
    try {
      const result = await automaticMessagesApi.get(establishmentId);
      if (result.success && result.data) {
        setActiveMessages(result.data.activeMessages || []);
        setWhatsappConnected(result.data.whatsappConnected || false);
      }
    } catch {
      // If endpoint doesn't exist yet, use empty defaults
    } finally {
      setLoading(false);
    }
  }, [establishmentId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleConnectionChange = (connected: boolean) => {
    setWhatsappConnected(connected);
  };

  const handleActiveMessagesChange = (newActiveMessages: string[]) => {
    setActiveMessages(newActiveMessages);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const result = await automaticMessagesApi.update(establishmentId, {
        activeMessages,
      });
      
      if (result.success) {
        setHasChanges(false);
        toast.success('Configurações salvas!');
      } else {
        toast.error(result.error || 'Erro ao salvar configurações');
      }
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mensagens Automáticas</h2>
          <p className="text-sm text-muted-foreground">
            Configure mensagens automáticas via WhatsApp para seus clientes
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* WhatsApp Connection */}
      <WhatsAppConnection
        establishmentId={establishmentId}
        slug={slug}
        onConnectionChange={handleConnectionChange}
      />

      <Separator />

      {/* Plan Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Selecione suas Mensagens</CardTitle>
                <CardDescription>
                  Escolha quais mensagens automáticas deseja ativar
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-xs">
                Plano: Básico
              </Badge>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeMessages.length}/{planLimit} mensagens
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MessageSelector
            activeMessageIds={activeMessages}
            planLimit={planLimit}
            onActiveMessagesChange={handleActiveMessagesChange}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Legenda das Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded bg-blue-500" />
              <span className="text-sm">Agendamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded bg-purple-500" />
              <span className="text-sm">Relacionamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded bg-orange-500" />
              <span className="text-sm">Marketing</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
