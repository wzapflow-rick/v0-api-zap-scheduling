'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Clock, Globe, Copy, Check, AlertCircle, MessageCircle } from 'lucide-react';
import { establishmentApi } from '@/lib/api';
import type { Establishment } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AutomaticMessages } from '@/components/dashboard/automatic-messages';
import { ConfiguracoesSkeleton } from '@/components/skeletons/dashboard-skeleton';

// Business hours type - API returns with isOpen/openTime/closeTime but expects enabled/open/close
type BusinessHoursAPI = {
  [key: string]: {
    isOpen?: boolean;
    openTime?: string;
    closeTime?: string;
  };
};

type BusinessHoursLocal = {
  [key: string]: {
    enabled: boolean;
    open: string;
    close: string;
  };
};

const establishmentSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  slotDuration: z.coerce.number().min(5, 'Duração mínima de 5 minutos'),
});

type EstablishmentFormData = z.infer<typeof establishmentSchema>;

// Safe fetcher that handles API errors gracefully
const establishmentFetcher = async () => {
  const res = await establishmentApi.get();
  if (!res.success) {
    return null;
  }
  return res.data;
};

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

// Generate time options every 15 minutes for more flexibility
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minuteIndex = i % 4;
  const minutes = ['00', '15', '30', '45'][minuteIndex];
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

export default function ConfiguracoesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHoursLocal>({
    monday: { enabled: false, open: '09:00', close: '18:00' },
    tuesday: { enabled: false, open: '09:00', close: '18:00' },
    wednesday: { enabled: false, open: '09:00', close: '18:00' },
    thursday: { enabled: false, open: '09:00', close: '18:00' },
    friday: { enabled: false, open: '09:00', close: '18:00' },
    saturday: { enabled: false, open: '09:00', close: '18:00' },
    sunday: { enabled: false, open: '09:00', close: '18:00' },
  });

  const { data: establishmentData, error, isLoading: isLoadingData, mutate } = useSWR(
    'establishment',
    establishmentFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const establishment = establishmentData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstablishmentFormData>({
    resolver: zodResolver(establishmentSchema),
  });

  useEffect(() => {
    if (establishment) {
      reset({
        name: establishment.name,
        description: establishment.description || '',
        phone: establishment.phone || '',
        email: establishment.email || '',
        address: establishment.address || '',
        city: establishment.city || '',
        state: establishment.state || '',
        zipCode: establishment.zipCode || '',
        slotDuration: establishment.slotDuration,
      });
      // Convert API format (isOpen/openTime/closeTime) to local format (enabled/open/close)
      const apiBusinessHours = (establishment as any).businessHours as BusinessHoursAPI || {};
      const convertedHours: BusinessHoursLocal = {};
      daysOfWeek.forEach(day => {
        const apiDay = apiBusinessHours[day.key];
        if (apiDay) {
          convertedHours[day.key] = {
            enabled: apiDay.isOpen ?? false,
            open: apiDay.openTime || '09:00',
            close: apiDay.closeTime || '18:00',
          };
        } else {
          convertedHours[day.key] = { enabled: false, open: '09:00', close: '18:00' };
        }
      });
      setBusinessHours(convertedHours);
    }
  }, [establishment, reset]);

  const publicUrl = establishment?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/agendar/${establishment.slug}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copiado!');
  };

  const onSubmit = async (data: EstablishmentFormData) => {
    setIsLoading(true);
    try {
      // Convert local format to API format and remove empty email
      const payload: any = {
        name: data.name,
        description: data.description || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined, // Don't send empty string
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zipCode: data.zipCode || undefined,
        slotDuration: data.slotDuration,
        businessHours: {} as any,
      };

      // Convert local format to API format (isOpen/openTime/closeTime)
      daysOfWeek.forEach(day => {
        const hours = businessHours[day.key];
        payload.businessHours[day.key] = {
          isOpen: hours.enabled,
          openTime: hours.open,
          closeTime: hours.close,
        };
      });
      
      // Also send as workingHours for backend compatibility
      payload.workingHours = payload.businessHours;
      
      const result = await establishmentApi.update(payload);

      if (result.success) {
        toast.success('Configurações salvas!');
        await mutate(undefined, { revalidate: true });
      } else {
        toast.error(result.error || 'Erro ao salvar configurações');
      }
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBusinessHour = (day: string, field: 'enabled' | 'open' | 'close', value: boolean | string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  // Show loading state
  if (isLoadingData) {
    return <ConfiguracoesSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar as configurações. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do seu estabelecimento</p>
      </div>

      {/* Public Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Página de Agendamento
          </CardTitle>
          <CardDescription>
            Compartilhe este link para seus clientes agendarem online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input value={publicUrl} readOnly className="flex-1 bg-muted" />
            <Button variant="outline" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
          <TabsTrigger value="horarios">Horários de Funcionamento</TabsTrigger>
          <TabsTrigger value="mensagens" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Mensagens Automáticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações do Estabelecimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Estabelecimento</Label>
                    <Input id="name" {...register('name')} disabled={isLoading} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slotDuration">Duração do Slot (minutos)</Label>
                    <Input id="slotDuration" type="number" min="5" step="5" {...register('slotDuration')} disabled={isLoading} />
                    {errors.slotDuration && <p className="text-sm text-destructive">{errors.slotDuration.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" placeholder="Descreva seu estabelecimento..." {...register('description')} disabled={isLoading} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" {...register('phone')} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" {...register('email')} disabled={isLoading} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" {...register('address')} disabled={isLoading} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...register('city')} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" {...register('state')} disabled={isLoading} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input id="zipCode" {...register('zipCode')} disabled={isLoading} />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Funcionamento
              </CardTitle>
              <CardDescription>
                Configure os dias e horários em que seu estabelecimento atende
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {daysOfWeek.map((day) => {
                  const dayHours = businessHours[day.key] || { enabled: false, open: '09:00', close: '18:00' };
                  return (
                    <div key={day.key} className="flex items-center gap-4 rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={dayHours.enabled}
                          onCheckedChange={(checked) => updateBusinessHour(day.key, 'enabled', checked)}
                        />
                        <span className="w-32 font-medium">{day.label}</span>
                      </div>
                      
                      {dayHours.enabled ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={dayHours.open}
                            onValueChange={(value) => updateBusinessHour(day.key, 'open', value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">até</span>
                          <Select
                            value={dayHours.close}
                            onValueChange={(value) => updateBusinessHour(day.key, 'close', value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Fechado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button onClick={handleSubmit(onSubmit)} className="mt-6" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Horários
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensagens">
          {establishment?.slug && (
            <AutomaticMessages slug={establishment.slug} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
