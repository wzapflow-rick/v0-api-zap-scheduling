'use client';

import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface ComingSoonModuleProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Placeholder para módulos habilitados por nicho cujo CRUD ainda
 * depende de endpoints de backend. Mostra "em desenvolvimento".
 */
export function ComingSoonModule({
  title,
  description = 'Este módulo está disponível para o seu tipo de negócio e será liberado em breve.',
  icon: Icon = Sparkles,
}: ComingSoonModuleProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Em desenvolvimento
          </div>
          <h2 className="text-lg font-semibold text-foreground text-balance">{title} chegando em breve</h2>
          <p className="max-w-md text-sm text-muted-foreground text-pretty leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
