'use client';

import { useConnection } from '@/hooks/use-connection';
import { useSyncStatus } from '@/hooks/use-offline-data';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function ConnectionStatus({ className, showLabel = true, compact = false }: ConnectionStatusProps) {
  const { status, isOnline, isBackendAvailable, isSyncing, pendingCount, triggerSync } = useConnection();
  const { queueCount } = useSyncStatus();

  const totalPending = pendingCount + queueCount;

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: Cloud,
          label: 'Online',
          description: 'Conectado ao servidor',
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          label: 'Sincronizando',
          description: `Sincronizando ${totalPending} ${totalPending === 1 ? 'item' : 'itens'}...`,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          description: 'Sem conexão com a internet',
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-500/10',
          borderColor: 'border-zinc-500/20',
        };
      case 'backend-down':
        return {
          icon: CloudOff,
          label: 'Servidor indisponível',
          description: 'Trabalhando offline. Dados serão sincronizados quando o servidor voltar.',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
        };
      default:
        return {
          icon: AlertCircle,
          label: 'Desconhecido',
          description: 'Status desconhecido',
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-500/10',
          borderColor: 'border-zinc-500/20',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full border',
                config.bgColor,
                config.borderColor,
                className
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  config.color,
                  isSyncing && 'animate-spin'
                )}
              />
              {totalPending > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {totalPending}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          config.color,
          isSyncing && 'animate-spin'
        )}
      />
      
      {showLabel && (
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {config.description}
          </p>
        </div>
      )}

      {totalPending > 0 && (
        <Badge variant="secondary" className="shrink-0">
          {totalPending} pendente{totalPending !== 1 && 's'}
        </Badge>
      )}

      {(status === 'offline' || status === 'backend-down') && totalPending > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={triggerSync}
          disabled={isSyncing || !isOnline}
          className="shrink-0"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
        </Button>
      )}
    </div>
  );
}

// Banner for offline mode warning
export function OfflineBanner() {
  const { status, isOnline, isSyncing, pendingCount, triggerSync } = useConnection();
  const { queueCount } = useSyncStatus();

  // Only show when offline or backend is down
  if (status === 'online' || status === 'syncing') return null;

  const totalPending = pendingCount + queueCount;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {status === 'offline' ? (
            <WifiOff className="h-4 w-4 text-amber-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-amber-500" />
          )}
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {status === 'offline'
              ? 'Você está offline. As alterações serão sincronizadas quando a conexão for restaurada.'
              : 'O servidor está indisponível. Trabalhando em modo offline.'}
          </p>
        </div>
        
        {totalPending > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">
              {totalPending} alteração{totalPending !== 1 && 'ões'} pendente{totalPending !== 1 && 's'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={triggerSync}
              disabled={isSyncing || !isOnline}
              className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isSyncing && 'animate-spin')} />
              Tentar sincronizar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Pending sync indicator badge
export function PendingSyncBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{count} alteração{count !== 1 && 'ões'} aguardando sincronização</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
