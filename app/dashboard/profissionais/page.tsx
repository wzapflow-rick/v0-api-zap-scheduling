'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Pencil, Trash2, Briefcase, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { professionalsApi } from '@/lib/api';
import type { Professional } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const professionalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  bio: z.string().optional(),
  active: z.boolean().default(true),
});

type ProfessionalFormData = z.infer<typeof professionalSchema>;

// Safe fetcher that handles API errors gracefully
const professionalsFetcher = async (key: [string, string]) => {
  const [, search] = key;
  const res = await professionalsApi.list({ search, limit: 100 });
  console.log('[v0] Professionals fetch response:', res);
  if (!res.success) {
    console.log('[v0] Professionals API error:', res.error);
    return [];
  }
  // Handle both array directly and wrapped in data property
  const data = Array.isArray(res.data) ? res.data : (res as any).data || [];
  console.log('[v0] Professionals data:', data);
  return data;
};

export default function ProfissionaisPage() {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: professionalsData, error, isLoading: isLoadingData, mutate } = useSWR(
    ['professionals', search],
    professionalsFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const professionals = Array.isArray(professionalsData) ? professionalsData : [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { active: true },
  });

  const isActive = watch('active');

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os profissionais. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  const openCreateForm = () => {
    setEditingProfessional(null);
    reset({ name: '', email: '', phone: '', bio: '', active: true });
    setIsFormOpen(true);
  };

  const openEditForm = (professional: Professional) => {
    setEditingProfessional(professional);
    reset({
      name: professional.name,
      email: professional.email || '',
      phone: professional.phone || '',
      bio: professional.bio || '',
      active: professional.active,
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: ProfessionalFormData) => {
    setIsLoading(true);
    try {
      const result = editingProfessional
        ? await professionalsApi.update(editingProfessional.id, data)
        : await professionalsApi.create(data);

      if (result.success) {
        toast.success(editingProfessional ? 'Profissional atualizado!' : 'Profissional cadastrado!');
        setIsFormOpen(false);
        mutate();
      } else {
        toast.error(result.error || 'Erro ao salvar profissional');
      }
    } catch {
      toast.error('Erro ao salvar profissional');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await professionalsApi.delete(id);
      if (result.success) {
        toast.success('Profissional removido!');
        mutate();
      } else {
        toast.error(result.error || 'Erro ao remover profissional');
      }
    } catch {
      toast.error('Erro ao remover profissional');
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground">Gerencie sua equipe</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Profissional
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
              <DialogDescription>
                {editingProfessional ? 'Atualize os dados do profissional' : 'Cadastre um novo profissional'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...register('name')} disabled={isLoading} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...register('email')} disabled={isLoading} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" {...register('phone')} disabled={isLoading} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biografia</Label>
                <Textarea id="bio" placeholder="Breve descrição do profissional..." {...register('bio')} disabled={isLoading} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="active">Ativo</Label>
                  <p className="text-sm text-muted-foreground">Profissional disponível para agendamentos</p>
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
                {editingProfessional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
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
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {professionals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum profissional encontrado</p>
              <Button variant="link" onClick={openCreateForm}>
                Cadastrar primeiro profissional
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {professionals.map((professional: Professional) => (
                  <TableRow key={professional.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{professional.name}</p>
                          <p className="text-sm text-muted-foreground">{professional.email || '-'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{professional.phone || '-'}</TableCell>
                    <TableCell>
                      {professional.services?.length || 0} serviço(s)
                    </TableCell>
                    <TableCell>
                      <Badge variant={professional.active ? 'default' : 'secondary'}>
                        {professional.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(professional.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(professional)}>
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
                              <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O profissional será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(professional.id)}>
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
