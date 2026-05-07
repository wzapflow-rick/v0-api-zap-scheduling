'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, CalendarIcon } from 'lucide-react';
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

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  onSuccess: () => void;
  initialDate?: Date;
  appointmentId?: string;
}

export function AppointmentForm({ onSuccess, initialDate, appointmentId }: AppointmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);

  const { data: professionalsData } = useSWR('professionals-form', () =>
    professionalsApi.list({ active: true, limit: 100 }).then((res) => {
      const data = res.data;
      // Handle both array and paginated response formats
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'items' in data) return (data as { items: Professional[] }).items;
      if (data && typeof data === 'object' && 'data' in data) return (data as { data: Professional[] }).data;
      return [];
    })
  );

  const { data: servicesData } = useSWR('services-form', () =>
    servicesApi.list({ active: true, limit: 100 }).then((res) => {
      const data = res.data;
      // Handle both array and paginated response formats
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'items' in data) return (data as { items: Service[] }).items;
      if (data && typeof data === 'object' && 'data' in data) return (data as { data: Service[] }).data;
      return [];
    })
  );

  const { data: clientsData } = useSWR('clients-form', () =>
    clientsApi.list({ limit: 1000 }).then((res) => {
      const data = res.data;
      // Handle both array and paginated response formats
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && 'items' in data) return (data as { items: Client[] }).items;
      if (data && typeof data === 'object' && 'data' in data) return (data as { data: Client[] }).data;
      return [];
    })
  );

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

  const professionals = professionalsData || [];
  const services = servicesData || [];
  const clients = clientsData || [];
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Client */}
      <div className="space-y-2">
        <Label>Cliente</Label>
        <Select
          onValueChange={(value) => setValue('clientId', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client: Client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name} {client.phone && `- ${client.phone}`}
              </SelectItem>
            ))}
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
            {professionals.map((pro: Professional) => (
              <SelectItem key={pro.id} value={pro.id}>
                {pro.name}
              </SelectItem>
            ))}
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
            {services.map((service: Service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name} - {service.duration}min -{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  service.price
                )}
              </SelectItem>
            ))}
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
