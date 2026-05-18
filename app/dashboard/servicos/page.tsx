'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Scissors, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { servicesApi } from '@/lib/api';
import type { Service } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServicosSkeleton } from '@/components/skeletons/dashboard-skeleton';

const serviceSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Preço deve ser maior ou igual a 0'),
  duration: z.coerce.number().min(5, 'Duração mínima de 5 minutos'),
  category: z.string().optional(),
  active: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

// Safe fetcher that handles API errors gracefully
const servicesFetcher = async (key: [string, string]) => {
  const [, search] = key;
  const res = await servicesApi.list({ search, limit: 100 });
  if (!res.success) {
    return [];
  }
  // API returns { data: { services: [...], pagination: {...} } }
  const services = res.data?.services || res.data || [];
  return Array.isArray(services) ? services : [];
};

export default function ServicosPage() {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: servicesData, error, isLoading: isLoadingData, mutate } = useSWR(
    ['services', search],
    servicesFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const services = Array.isArray(servicesData) ? servicesData : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { active: true, duration: 30, price: 0 },
  });

  const isActive = watch('active');

  // Show loading state
  if (isLoadingData) {
    return <ServicosSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os serviços. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  const openCreateForm = () => {
    setEditingService(null);
    reset({ name: '', description: '', price: 0, duration: 30, category: '', active: true });
    setIsFormOpen(true);
  };

  const openEditForm = (service: Service) => {
    setEditingService(service);
    reset({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration: service.duration,
      category: service.category || '',
      active: service.active,
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: ServiceFormData) => {
    setIsLoading(true);
    try {
      const result = editingService
        ? await servicesApi.update(editingService.id, data)
        : await servicesApi.create(data);

      if (result.success) {
        toast.success(editingService ? 'Serviço atualizado!' : 'Serviço cadastrado!');
        setIsFormOpen(false);
        mutate();
      } else {
        toast.error(result.error || 'Erro ao salvar serviço');
      }
    } catch {
      toast.error('Erro ao salvar serviço');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await servicesApi.delete(id);
      if (result.success) {
        toast.success('Serviço removido!');
        mutate();
      } else {
        toast.error(result.error || 'Erro ao remover serviço');
      }
    } catch {
      toast.error('Erro ao remover serviço');
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground">Gerencie seus serviços e preços</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
              <DialogDescription>
                {editingService ? 'Atualize os dados do serviço' : 'Cadastre um novo serviço'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Serviço</Label>
                <Input id="name" placeholder="Corte Masculino" {...register('name')} disabled={isLoading} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" placeholder="Descreva o serviço..." {...register('description')} disabled={isLoading} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input id="price" type="number" step="0.01" min="0" {...register('price')} disabled={isLoading} />
                  {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input id="duration" type="number" min="5" step="5" {...register('duration')} disabled={isLoading} />
                  {errors.duration && <p className="text-sm text-destructive">{errors.duration.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" placeholder="Cabelo, Barba, Estética..." {...register('category')} disabled={isLoading} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="active">Ativo</Label>
                  <p className="text-sm text-muted-foreground">Serviço disponível para agendamentos</p>
                </div>
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('active', checked)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Scissors className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum serviço encontrado</p>
              <Button variant="link" onClick={openCreateForm}>
                Cadastrar primeiro serviço
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Profissionais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service: Service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="max-w-xs truncate text-sm text-muted-foreground">{service.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.category || '-'}</TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell className="font-medium">{formatCurrency(service.price)}</TableCell>
                    <TableCell>
                      {service.professionals?.length || 0} profissional(is)
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.active ? 'default' : 'secondary'}>
                        {service.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O serviço será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(service.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
