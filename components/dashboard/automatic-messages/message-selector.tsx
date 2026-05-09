'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GripVertical, 
  ArrowRight, 
  ArrowLeft,
  Calendar, 
  Clock, 
  MessageSquare, 
  Gift, 
  UserX, 
  Users, 
  XCircle, 
  ListTodo, 
  Megaphone,
  Lock,
  Info,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AutomaticMessage, AUTOMATIC_MESSAGES } from '@/types/evolution';
import { MessagePreview } from './message-preview';

interface MessageSelectorProps {
  activeMessageIds: string[];
  planLimit: number;
  onActiveMessagesChange: (ids: string[]) => void;
  instanceName?: string | null;
  whatsappConnected?: boolean;
}

const triggerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  appointment_created: Calendar,
  reminder_24h: Clock,
  reminder_1h: Clock,
  appointment_completed: MessageSquare,
  client_birthday: Gift,
  no_show: UserX,
  client_inactive: Users,
  appointment_cancelled: XCircle,
  waitlist_available: ListTodo,
  promotion: Megaphone,
};

const categoryColors: Record<string, string> = {
  agendamento: 'border-l-blue-500',
  relacionamento: 'border-l-purple-500',
  marketing: 'border-l-orange-500',
};

interface MessageCardProps {
  message: AutomaticMessage;
  isActive: boolean;
  isDisabled?: boolean;
  onPreview: () => void;
}

function MessageCard({ message, isActive, isDisabled, onPreview }: MessageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: message.id, disabled: isDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = triggerIcons[message.trigger] || MessageSquare;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-all',
        categoryColors[message.category],
        'border-l-4',
        isDragging && 'opacity-50 shadow-lg',
        isDisabled && 'opacity-50 cursor-not-allowed',
        !isDisabled && 'hover:border-primary/50 hover:shadow-sm',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'touch-none p-1 text-muted-foreground transition-colors',
          isDisabled ? 'cursor-not-allowed' : 'cursor-grab hover:text-foreground active:cursor-grabbing'
        )}
        disabled={isDisabled}
      >
        {isDisabled ? (
          <Lock className="h-4 w-4" />
        ) : (
          <GripVertical className="h-4 w-4" />
        )}
      </button>
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{message.name}</p>
        <p className="truncate text-xs text-muted-foreground">{message.description}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      {isActive && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Ativa
        </Badge>
      )}
    </div>
  );
}

function DragOverlayCard({ message }: { message: AutomaticMessage }) {
  const Icon = triggerIcons[message.trigger] || MessageSquare;
  
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border border-primary bg-card p-3 shadow-xl',
      categoryColors[message.category],
      'border-l-4',
    )}>
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{message.name}</p>
      </div>
    </div>
  );
}

export function MessageSelector({ activeMessageIds, planLimit, onActiveMessagesChange, instanceName, whatsappConnected }: MessageSelectorProps) {
  const [previewMessage, setPreviewMessage] = useState<AutomaticMessage | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const availableMessages = useMemo(() => 
    AUTOMATIC_MESSAGES.filter(msg => !activeMessageIds.includes(msg.id)),
    [activeMessageIds]
  );

  const activeMessages = useMemo(() => 
    activeMessageIds
      .map(id => AUTOMATIC_MESSAGES.find(msg => msg.id === id))
      .filter((msg): msg is AutomaticMessage => msg !== undefined),
    [activeMessageIds]
  );

  const isAtLimit = activeMessageIds.length >= planLimit;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    
    const { active, over } = event;
    if (!over) return;

    const activeMessageId = active.id as string;
    const isCurrentlyActive = activeMessageIds.includes(activeMessageId);

    // Dropping on available area - deactivate
    if (over.id === 'available-drop-zone' && isCurrentlyActive) {
      onActiveMessagesChange(activeMessageIds.filter(id => id !== activeMessageId));
      return;
    }

    // Dropping on active area - activate (if not at limit)
    if (over.id === 'active-drop-zone' && !isCurrentlyActive && !isAtLimit) {
      onActiveMessagesChange([...activeMessageIds, activeMessageId]);
      return;
    }
  };

  const activateMessage = (messageId: string) => {
    if (isAtLimit) return;
    if (!activeMessageIds.includes(messageId)) {
      onActiveMessagesChange([...activeMessageIds, messageId]);
    }
  };

  const deactivateMessage = (messageId: string) => {
    onActiveMessagesChange(activeMessageIds.filter(id => id !== messageId));
  };

  const draggedMessage = activeId 
    ? AUTOMATIC_MESSAGES.find(msg => msg.id === activeId) 
    : null;

  return (
    <>
    <Dialog open={!!previewMessage} onOpenChange={(open) => !open && setPreviewMessage(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{previewMessage?.name}</DialogTitle>
        </DialogHeader>
        {previewMessage && (
          <MessagePreview 
            message={previewMessage} 
            instanceName={instanceName}
            whatsappConnected={whatsappConnected}
          />
        )}
      </DialogContent>
    </Dialog>
    
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Available Messages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mensagens Disponíveis</CardTitle>
            <CardDescription>
              Arraste ou clique para ativar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SortableContext
              id="available-drop-zone"
              items={availableMessages.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={cn(
                "max-h-80 space-y-2 overflow-y-auto pr-2",
                activeId && "overflow-hidden"
              )}>
                {availableMessages.map((message) => (
                  <div key={message.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <MessageCard
                        message={message}
                        isActive={false}
                        isDisabled={isAtLimit}
                        onPreview={() => setPreviewMessage(message)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => activateMessage(message.id)}
                      disabled={isAtLimit}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {availableMessages.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Todas as mensagens estão ativas
                  </p>
                )}
              </div>
            </SortableContext>
          </CardContent>
        </Card>

        {/* Active Messages */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Mensagens Ativas</CardTitle>
                <CardDescription>
                  {activeMessageIds.length}/{planLimit} ativas
                </CardDescription>
              </div>
              {isAtLimit && (
                <Badge variant="destructive" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Limite
                </Badge>
              )}
            </div>
            {isAtLimit && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                <span>Você atingiu o limite do seu plano. Faça upgrade para ativar mais mensagens.</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <SortableContext
              id="active-drop-zone"
              items={activeMessages.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={cn(
                "max-h-80 space-y-2 overflow-y-auto pr-2",
                activeId && "overflow-hidden"
              )}>
                {activeMessages.map((message) => (
                  <div key={message.id} className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => deactivateMessage(message.id)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                      <MessageCard
                        message={message}
                        isActive={true}
                        onPreview={() => setPreviewMessage(message)}
                      />
                    </div>
                  </div>
                ))}
                {activeMessages.length === 0 && (
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhuma mensagem ativa
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Arraste mensagens aqui
                    </p>
                  </div>
                )}
              </div>
            </SortableContext>
          </CardContent>
        </Card>
      </div>

      <DragOverlay>
        {draggedMessage ? <DragOverlayCard message={draggedMessage} /> : null}
      </DragOverlay>
    </DndContext>
    </>
  );
}
