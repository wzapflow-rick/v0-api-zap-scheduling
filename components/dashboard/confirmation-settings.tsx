'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarCheck, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { confirmationApi } from '@/lib/api';
import {
  CONFIRMATION_MESSAGE_GROUPS,
  getDefaultTemplateSelection,
  resolveTemplateBody,
  renderTemplate,
  TEMPLATE_VARIABLES,
  type ConfirmationMessageType,
} from '@/lib/message-templates';
import type { ConfirmationSettings } from '@/types';

const PREVIEW_VARS = {
  cliente: 'Maria',
  servico: 'Corte de cabelo',
  profissional: 'Ana',
  data: '12/06/2026',
  hora: '14:30',
  estabelecimento: 'Studio Bella',
  link_confirmacao: 'https://seudominio.com/confirmar/abc123',
};

const leadTimeOptions = [1, 2, 3, 4, 6, 8, 12, 24];

const defaults: ConfirmationSettings = {
  enabled: false,
  leadTimeHours: 3,
  templates: getDefaultTemplateSelection(),
};

const settingsFetcher = async (): Promise<ConfirmationSettings> => {
  const res = await confirmationApi.getSettings();
  if (!res.success || !res.data) {
    return defaults;
  }
  return {
    enabled: res.data.enabled ?? defaults.enabled,
    leadTimeHours: res.data.leadTimeHours ?? defaults.leadTimeHours,
    templates: { ...defaults.templates, ...(res.data.templates || {}) },
  };
};

export function ConfirmationSettingsCard() {
  const { data, isLoading, mutate } = useSWR('confirmation-settings', settingsFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const [settings, setSettings] = useState<ConfirmationSettings>(defaults);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const updateTemplate = (type: ConfirmationMessageType, templateId: string) => {
    setSettings((prev) => ({
      ...prev,
      templates: { ...prev.templates, [type]: templateId },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await confirmationApi.updateSettings(settings);
    setIsSaving(false);
    if (res.success) {
      toast.success('Configurações de confirmação salvas!');
      mutate(settings, { revalidate: false });
    } else {
      toast.error(res.error || 'Erro ao salvar configurações');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Confirmação de Agendamento
          </CardTitle>
          <CardDescription>
            Envie automaticamente um link para o cliente confirmar a presença e libere horários não confirmados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar fluxo de confirmação</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, o sistema envia as mensagens do fluxo automaticamente.
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadTime">Antecedência do link de confirmação</Label>
            <Select
              value={String(settings.leadTimeHours)}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, leadTimeHours: Number(value) }))
              }
            >
              <SelectTrigger id="leadTime" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadTimeOptions.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h === 1 ? '1 hora antes' : `${h} horas antes`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Se o cliente agendar com menos antecedência que isso, o link é enviado imediatamente.
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Variáveis disponíveis nos modelos:{' '}
              {TEMPLATE_VARIABLES.map((v) => v.token).join(', ')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {CONFIRMATION_MESSAGE_GROUPS.map((group) => {
        const selectedId = settings.templates[group.type];
        const preview = renderTemplate(resolveTemplateBody(group.type, selectedId), PREVIEW_VARS);
        return (
          <Card key={group.type}>
            <CardHeader>
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={selectedId} onValueChange={(value) => updateTemplate(group.type, value)}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {group.templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Pré-visualização
                </Label>
                <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm text-foreground">
                  {preview}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Confirmação
        </Button>
      </div>
    </div>
  );
}
