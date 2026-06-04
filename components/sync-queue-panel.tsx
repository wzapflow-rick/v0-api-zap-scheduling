'use client';

import { useState } from 'react';
import { useSyncQueue, type SyncQueueEntry } from '@/hooks/use-offline-data';
import { useConnection } from '@/hooks/use-connection';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  RefreshCw,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CloudUpload,
} from 'lucide-react';

const ENTITY_LABELS: Record<string, string> = {
  appointment: 'Agendamento',
  client: 'Cliente',
  professional: 'Profissional',
  service: 'Serviço',
};

const OPERATION_LABELS: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function QueueItemRow({
  item,
  isProcessing,
  onRetry,
  onDiscard,
}: {
  item: SyncQueueEntry;
  isProcessing: boolean;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const entityLabel = ENTITY_LABELS[item.entityType] ?? item.entityType;
  const operationLabel = OPERATION_LABELS[item.operationType] ?? item.operationType;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        item.isFailed
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border bg-muted/30'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          item.isFailed ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'
        )}
      >
        {item.isFailed ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {entityLabel}
          </p>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {operationLabel}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatRelativeTime(item.timestamp)}
          {item.attempts > 0 && !item.isFailed && ` · ${item.attempts} tentativa${item.attempts !== 1 ? 's' : ''}`}
        </p>
        {item.isFailed && item.error && (
          <p className="mt-1 text-xs text-destructive">{item.error}</p>
        )}

        {item.isFailed && (
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={isProcessing}
              onClick={() => onRetry(item.id)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Tentar novamente
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              disabled={isProcessing}
              onClick={() => onDiscard(item.id)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Descartar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SyncQueuePanel({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const {
    items,
    isLoading,
    isProcessing,
    failedCount,
    pendingCount,
    retry,
    discard,
    retryAll,
    syncNow,
  } = useSyncQueue();
  const { isOnline, isBackendAvailable } = useConnection();

  const total = items.length;
  const canSync = isOnline && isBackendAvailable;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <CloudUpload className="h-4 w-4" />
            Sincronização
            {total > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {total}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Fila de sincronização</SheetTitle>
          <SheetDescription>
            Alterações feitas offline aguardando envio ao servidor.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 py-3">
          {pendingCount > 0 && (
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge variant="outline" className="border-destructive/30 text-destructive">
              {failedCount} com falha
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            {failedCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                disabled={isProcessing || !canSync}
                onClick={retryAll}
              >
                Tentar todas
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={isProcessing || !canSync || total === 0}
              onClick={syncNow}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isProcessing && 'animate-spin')} />
              Sincronizar
            </Button>
          </div>
        </div>

        <ScrollArea className="-mx-2 flex-1 px-2">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-foreground">Tudo sincronizado</p>
              <p className="text-xs text-muted-foreground">
                Não há alterações pendentes de envio.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-4">
              {items.map((item) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  isProcessing={isProcessing}
                  onRetry={retry}
                  onDiscard={discard}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {!canSync && total > 0 && (
          <p className="border-t pt-3 text-center text-xs text-muted-foreground">
            {isOnline
              ? 'Servidor indisponível. As alterações serão enviadas quando ele voltar.'
              : 'Você está offline. As alterações serão enviadas ao reconectar.'}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
