'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, CalendarIcon, Plus, UserPlus } from 'lucide-react';
import { professionalsApi, servicesApi, clientsApi, appointmentsApi } from '@/lib/api';
import type { Professional, Service, Client, TimeSlot } from '@/types';
import { cn } from '@/lib/utils';

const appointmentSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  professionalId: z.string().min(1, 'Profissional é obrigatório'),
  serviceId: z.string().min(1, 'Serviço é obrigatório'),
  date: z.date({ required_error: 'Data é obrigatória' }),
  startTime: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().optional(),
});

const quickClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;
type QuickClientFormData = z.infer<typeof quickClientSchema>;

interface AppointmentFormProps {
  onSuccess: () => void;
  initialDate?: Date;
  appointmentId?: string;
}

// Helper function to extract array from API response
function extractArrayFromResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // Check for specific API response properties (professionals, services, clients, etc.)
    const knownArrayProps = ['professionals', 'services', 'clients', 'appointments', 'items', 'data'];
    for (const prop of knownArrayProps) {
      if (prop in obj && Array.isArray(obj[prop])) {
        return obj[prop] as T[];
      }
    }
    // Fallback: find any array property in the object
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }
  }
  return [];
}

export function AppointmentForm({ onSuccess, initialDate, appointmentId }: AppointmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const { data: professionalsData, error: profError } = useSWR('professionals-form', async () => {
    const res = await professionalsApi.list({ active: true, limit: 100 });
    return extractArrayFromResponse<Professional>(res.data);
  });

  const { data: servicesData, error: servError } = useSWR('services-form', async () => {
    const res = await servicesApi.list({ active: true, limit: 100 });
    return extractArrayFromResponse<Service>(res.data);
  });

  const { data: clientsData, error: clientError, mutate: mutateClients } = useSWR('clients-form', async () => {
    const res = await clientsApi.list({ limit: 1000 });
    return extractArrayFromResponse<Client>(res.data);
  });

  const { data: slotsData } = useSWR(
    selectedProfessional && selectedService && selectedDate
      ? ['slots', selectedProfessional, selectedService, format(selectedDate, 'yyyy-MM-dd')]
      : null,
    () =>
      appointmentsApi
        .getSlots({
          professionalId: selectedProfessional,
          serviceId: selectedService,
          date: format(selectedDate!, 'yyyy-MM-dd'),
        })
        .then((res) => res.data)
  );



  const professionals: Professional[] = professionalsData || [];
  const services: Service[] = servicesData || [];
  const clients: Client[] = clientsData || [];
  
  // API returns slots as string array ["09:00", "09:30", ...], convert to TimeSlot format
  const rawSlots = slotsData?.slots || [];
  const slots: TimeSlot[] = Array.isArray(rawSlots) 
    ? rawSlots.map((slot: string | TimeSlot) => 
        typeof slot === 'string' 
          ? { time: slot, available: true } 
          : slot
      )
    : [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: initialDate,
    },
  });

  const {
    register: registerQuickClient,
    handleSubmit: handleSubmitQuickClient,
    reset: resetQuickClient,
    formState: { errors: quickClientErrors },
  } = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
  });

  const watchedDate = watch('date');

  useEffect(() => {
    if (watchedDate) {
      setSelectedDate(watchedDate);
    }
  }, [watchedDate]);

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true);
    try {
      const result = appointmentId
        ? await appointmentsApi.update(appointmentId, {
            ...data,
            date: format(data.date, 'yyyy-MM-dd'),
          })
        : await appointmentsApi.create({
            ...data,
            date: format(data.date, 'yyyy-MM-dd'),
          });

      if (result.success) {
        toast.success(appointmentId ? 'Agendamento atualizado!' : 'Agendamento criado!');
        onSuccess();
      } else {
        toast.error(result.error || 'Erro ao salvar agendamento');
      }
    } catch {
      toast.error('Erro ao salvar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  const onQuickClientSubmit = async (data: QuickClientFormData) => {
    setIsCreatingClient(true);
    try {
      // Generate a placeholder email using phone number to ensure uniqueness
      const placeholderEmail = `${data.phone.replace(/\D/g, '')}@temp.agendamento.com`;
      const result = await clientsApi.create({
        name: data.name,
        phone: data.phone,
        email: placeholderEmail,
      });

      if (result.success && result.data) {
        toast.success('Cliente criado com sucesso!');
        // Refresh clients list
        await mutateClients();
        // Select the new client
        setValue('clientId', result.data.id);
        // Close dialog and reset form
        setIsQuickClientOpen(false);
        resetQuickClient();
      } else {
        toast.error(result.error || 'Erro ao criar cliente');
      }
    } catch {
      toast.error('Erro ao criar cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Client */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cliente</Label>
          <Dialog open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-auto p-1 text-xs text-primary hover:text-primary/80">
                <UserPlus className="mr-1 h-3 w-3" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitQuickClient(onQuickClientSubmit)} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-name">Nome *</Label>
                  <Input
                    id="quick-name"
                    placeholder="Nome do cliente"
                    {...registerQuickClient('name')}
                    disabled={isCreatingClient}
                  />
                  {quickClientErrors.name && (
                    <p className="text-sm text-destructive">{quickClientErrors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-phone">Telefone *</Label>
                  <Input
                    id="quick-phone"
                    placeholder="(00) 00000-0000"
                    {...registerQuickClient('phone')}
                    disabled={isCreatingClient}
                  />
                  {quickClientErrors.phone && (
                    <p className="text-sm text-destructive">{quickClientErrors.phone.message}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Você pode completar o cadastro do cliente posteriormente na seção de Clientes.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsQuickClientOpen(false)}
                    disabled={isCreatingClient}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreatingClient}>
                    {isCreatingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Cliente
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Select
          onValueChange={(value) => setValue('clientId', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              clients.map((client: Client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} {client.phone && `- ${client.phone}`}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.clientId && (
          <p className="text-sm text-destructive">{errors.clientId.message}</p>
        )}
      </div>

      {/* Professional */}
      <div className="space-y-2">
        <Label>Profissional</Label>
        <Select
          onValueChange={(value) => {
            setValue('professionalId', value);
            setSelectedProfessional(value);
            setValue('startTime', '');
          }}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o profissional" />
          </SelectTrigger>
          <SelectContent>
            {professionals.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : (
              professionals.map((pro: Professional) => (
                <SelectItem key={pro.id} value={pro.id}>
                  {pro.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.professionalId && (
          <p className="text-sm text-destructive">{errors.professionalId.message}</p>
        )}
      </div>

      {/* Service */}
      <div className="space-y-2">
        <Label>Serviço</Label>
        <Select
          onValueChange={(value) => {
            setValue('serviceId', value);
            setSelectedService(value);
            setValue('startTime', '');
          }}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o serviço" />
          </SelectTrigger>
          <SelectContent>
            {services.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum serviço encontrado
              </div>
            ) : (
              services.map((service: Service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - {service.duration}min -{' '}
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(service.price)
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.serviceId && (
          <p className="text-sm text-destructive">{errors.serviceId.message}</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label>Data</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !watchedDate && 'text-muted-foreground'
              )}
              disabled={isLoading}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedDate ? format(watchedDate, 'PPP', { locale: ptBR }) : 'Selecione uma data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={watchedDate}
              onSelect={(date) => {
                setValue('date', date!);
                setValue('startTime', '');
              }}
              disabled={(date) => date < new Date()}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date.message}</p>
        )}
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        <Label>Horário</Label>
        {selectedProfessional && selectedService && selectedDate ? (
          slots.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((slot: TimeSlot) => (
                <Button
                  key={slot.time}
                  type="button"
                  variant={watch('startTime') === slot.time ? 'default' : 'outline'}
                  size="sm"
                  disabled={!slot.available || isLoading}
                  onClick={() => setValue('startTime', slot.time)}
                  className={cn(!slot.available && 'opacity-50')}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando horários...</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione profissional, serviço e data para ver os horários
          </p>
        )}
        {errors.startTime && (
          <p className="text-sm text-destructive">{errors.startTime.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Observações sobre o agendamento..."
          {...register('notes')}
          disabled={isLoading}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {appointmentId ? 'Salvar Alterações' : 'Criar Agendamento'}
      </Button>
    </form>
  );
}
