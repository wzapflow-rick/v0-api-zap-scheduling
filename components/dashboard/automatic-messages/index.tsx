'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, MessageCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { WhatsAppConnection } from './whatsapp-connection';
import { MessageSelector } from './message-selector';
import { AutoMessageConfig } from '@/types/evolution';

interface AutomaticMessagesProps {
  establishmentId: string;
  slug: string;
}

const STORAGE_KEY = 'zapflow_auto_messages_config';

// Simulated plan limits - will come from backend in production
const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  basic: 5,
  pro: 10,
  enterprise: 10,
};

export function AutomaticMessages({ establishmentId, slug }: AutomaticMessagesProps) {
  const [config, setConfig] = useState<AutoMessageConfig>({
    establishmentId,
    whatsappConnected: false,
    whatsappNumber: null,
    instanceName: null,
    activeMessages: [],
    planLimit: 5, // Default to basic plan
    updatedAt: new Date().toISOString(),
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(`${STORAGE_KEY}_${establishmentId}`);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading saved config:', e);
      }
    }
  }, [establishmentId]);

  const handleConnectionChange = (connected: boolean) => {
    setConfig(prev => ({ ...prev, whatsappConnected: connected }));
    setHasChanges(true);
  };

  const handleActiveMessagesChange = (activeMessages: string[]) => {
    setConfig(prev => ({ ...prev, activeMessages }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Save to localStorage for now (until backend is ready)
      const updatedConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(
        `${STORAGE_KEY}_${establishmentId}`,
        JSON.stringify(updatedConfig)
      );
      
      setConfig(updatedConfig);
      setHasChanges(false);
      toast.success('Configurações salvas!');
      
      // TODO: When backend is ready, save to API
      // await fetch('/api/auto-messages/config', {
      //   method: 'PUT',
      //   body: JSON.stringify(updatedConfig),
      // });
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

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

      {/* Info Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Funcionalidade em desenvolvimento</p>
            <p className="mt-1">
              As mensagens automáticas serão enviadas quando o backend estiver configurado. 
              Por enquanto, você pode configurar quais mensagens deseja ativar.
            </p>
          </div>
        </CardContent>
      </Card>

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
                {config.activeMessages.length}/{config.planLimit} mensagens
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MessageSelector
            activeMessageIds={config.activeMessages}
            planLimit={config.planLimit}
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
