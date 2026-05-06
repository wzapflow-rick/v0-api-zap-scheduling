'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Users, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsApi } from '@/lib/api';
import type { Client } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

// Safe fetcher that handles API errors gracefully
const clientsFetcher = async (key: [string, string]) => {
  const [, search] = key;
  const res = await clientsApi.list({ search, limit: 100 });
  if (!res.success) {
    console.log('[v0] Clients API error:', res.error);
    return [];
  }
  // API returns { data: { clients: [...], pagination: {...} } }
  const clients = res.data?.clients || res.data || [];
  return Array.isArray(clients) ? clients : [];
};

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: clientsData, error, isLoading: isLoadingData, mutate } = useSWR(
    ['clients', search],
    clientsFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const clients = Array.isArray(clientsData) ? clientsData : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

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
          Não foi possível carregar os clientes. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  const openCreateForm = () => {
    setEditingClient(null);
    reset({ name: '', email: '', phone: '', birthDate: '', notes: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    reset({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      birthDate: client.birthDate || '',
      notes: client.notes || '',
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      const result = editingClient
        ? await clientsApi.update(editingClient.id, data)
        : await clientsApi.create(data);

      if (result.success) {
        toast.success(editingClient ? 'Cliente atualizado!' : 'Cliente cadastrado!');
        setIsFormOpen(false);
        mutate();
      } else {
        toast.error(result.error || 'Erro ao salvar cliente');
      }
    } catch {
      toast.error('Erro ao salvar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await clientsApi.delete(id);
      if (result.success) {
        toast.success('Cliente removido!');
        mutate();
      } else {
        toast.error(result.error || 'Erro ao remover cliente');
      }
    } catch {
      toast.error('Erro ao remover cliente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}
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
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input id="birthDate" type="date" {...register('birthDate')} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" {...register('notes')} disabled={isLoading} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
                placeholder="Buscar por nome, e-mail ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              <Button variant="link" onClick={openCreateForm}>
                Cadastrar primeiro cliente
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Agendamentos</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client: Client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell>{client.email || '-'}</TableCell>
                    <TableCell>{client._count?.appointments || 0}</TableCell>
                    <TableCell>
                      {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(client)}>
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
                              <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O cliente será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(client.id)}>
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
