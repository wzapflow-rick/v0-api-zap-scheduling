'use client';

import { useState, useEffect, use } from 'react';
import useSWR from 'swr';
import { format, addDays, isBefore, startOfToday, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Phone, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { publicApi } from '@/lib/api';
import type { Establishment, Professional, Service, TimeSlot } from '@/types';
import { cn } from '@/lib/utils';

const bookingSchema = z.object({
  clientName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  clientEmail: z.string().email('E-mail inválido'),
  clientPhone: z.string().min(10, 'Telefone inválido'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface PageParams {
  slug: string;
}

export default function AgendarPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  const { data: establishmentData, error } = useSWR(
    ['public-establishment', slug],
    () => publicApi.getEstablishment(slug).then((res) => res.data)
  );

  const { data: slotsData } = useSWR(
    selectedProfessional && selectedService && selectedDate
      ? ['public-slots', slug, selectedProfessional.id, selectedService.id, format(selectedDate, 'yyyy-MM-dd')]
      : null,
    () =>
      publicApi
        .getSlots(slug, {
          professionalId: selectedProfessional!.id,
          serviceId: selectedService!.id,
          date: format(selectedDate!, 'yyyy-MM-dd'),
        })
        .then((res) => res.data)
  );

  const establishment = establishmentData as Establishment & { professionals: Professional[]; services: Service[] };
  // API returns slots as string array ["09:00", "09:30", ...], convert to TimeSlot format
  const rawSlots = slotsData?.slots || [];
  const slots: TimeSlot[] = Array.isArray(rawSlots) 
    ? rawSlots.map((slot: string | TimeSlot) => 
        typeof slot === 'string' 
          ? { time: slot, available: true } 
          : slot
      )
    : [];

  // Filter out past time slots if selected date is today
  const filteredSlots = slots.filter((slot) => {
    if (!selectedDate || !isToday(selectedDate)) {
      return true; // Show all slots for future dates
    }
    // For today, filter out past times
    const now = new Date();
    const [hours, minutes] = slot.time.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime > now;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

  const filteredProfessionals = establishment?.professionals.filter((pro) =>
    pro.services?.some((s) => s.service.id === selectedService?.id)
  ) || [];

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const result = await publicApi.book(slug, {
        professionalId: selectedProfessional.id,
        serviceId: selectedService.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        notes: data.notes,
      });

      if (result.success) {
        setBookingComplete(true);
        toast.success('Agendamento realizado com sucesso!');
        
        // Note: WhatsApp confirmation message is sent by the backend
        // when USE_BACKEND_MESSAGES = true
        // Debug: show what would be sent
        toast.info(`[DEBUG] Backend deve enviar confirmação`, {
          description: `Slug: ${slug}\nTelefone: ${data.clientPhone}`,
          duration: 5000,
        });
      } else {
        toast.error(result.error || 'Erro ao realizar agendamento');
      }
    } catch {
      toast.error('Erro ao realizar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Estabelecimento não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Agendamento Confirmado!</h2>
            <p className="mb-6 text-muted-foreground">
              Você receberá uma confirmação por e-mail e WhatsApp.
            </p>
            <div className="rounded-lg bg-muted p-4 text-left">
              <p className="font-medium">{selectedService?.name}</p>
              <p className="text-sm text-muted-foreground">com {selectedProfessional?.name}</p>
              <p className="mt-2 text-sm">
                {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedTime}
              </p>
            </div>
            <Button
              className="mt-6 w-full"
              variant="outline"
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedProfessional(null);
                setSelectedDate(null);
                setSelectedTime(null);
                setBookingComplete(false);
              }}
            >
              Fazer Novo Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 shrink-0">
              <AvatarFallback className="bg-primary text-lg sm:text-xl text-primary-foreground">
                {getInitials(establishment.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{establishment.name}</h1>
              {establishment.address && (
                <p className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{establishment.address}, {establishment.city}</span>
                </p>
              )}
              {establishment.phone && (
                <p className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {establishment.phone}
                </p>
              )}
            </div>
          </div>
          {establishment.description && (
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">{establishment.description}</p>
          )}
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b bg-background">
        <div className="container mx-auto max-w-4xl px-4 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-medium transition-colors',
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={cn(
                      'mx-1 sm:mx-2 h-0.5 w-4 sm:w-8 transition-colors',
                      step > s ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <span>Serviço</span>
            <span>Profissional</span>
            <span>Data/Hora</span>
            <span>Dados</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Escolha o Serviço</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {establishment.services.map((service) => (
                <Card
                  key={service.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedService?.id === service.id && 'border-primary ring-1 ring-primary'
                  )}
                  onClick={() => setSelectedService(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        {service.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedService}
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Professional */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Escolha o Profissional</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredProfessionals.map((professional) => (
                <Card
                  key={professional.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedProfessional?.id === professional.id && 'border-primary ring-1 ring-primary'
                  )}
                  onClick={() => setSelectedProfessional(professional)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(professional.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{professional.name}</h3>
                      {professional.bio && (
                        <p className="text-sm text-muted-foreground">{professional.bio}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedProfessional}
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Escolha Data e Horário</h2>
            </div>

            {/* Date Selection */}
            <div>
              <Label className="mb-3 block">Data</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {availableDates.map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    className={cn(
                      'flex min-w-[70px] flex-col items-center rounded-lg border p-3 transition-colors',
                      selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-xs uppercase text-muted-foreground">
                      {format(date, 'EEE', { locale: ptBR })}
                    </span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(date, 'MMM', { locale: ptBR })}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <Label className="mb-3 block">Horário</Label>
                {slots.length > 0 ? (
                  filteredSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                      {filteredSlots.map((slot: TimeSlot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? 'default' : 'outline'}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={cn(!slot.available && 'opacity-50')}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum horário disponível para hoje. Selecione outra data.</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Carregando horários disponíveis...</p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(4)}
                disabled={!selectedDate || !selectedTime}
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Contact Info */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Seus Dados</h2>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Agendamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-medium">{selectedProfessional?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {selectedService &&
                      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        selectedService.price
                      )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome Completo</Label>
                <Input id="clientName" {...register('clientName')} disabled={isSubmitting} />
                {errors.clientName && <p className="text-sm text-destructive">{errors.clientName.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">E-mail</Label>
                  <Input id="clientEmail" type="email" {...register('clientEmail')} disabled={isSubmitting} />
                  {errors.clientEmail && <p className="text-sm text-destructive">{errors.clientEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">WhatsApp</Label>
                  <Input id="clientPhone" placeholder="(11) 99999-9999" {...register('clientPhone')} disabled={isSubmitting} />
                  {errors.clientPhone && <p className="text-sm text-destructive">{errors.clientPhone.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea id="notes" placeholder="Alguma informação adicional..." {...register('notes')} disabled={isSubmitting} />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Agendamento
              </Button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
