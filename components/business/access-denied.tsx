'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
  title?: string;
  description?: string;
}

/** Fallback padrão do BusinessGuard quando o módulo não está disponível. */
export function AccessDenied({
  title = 'Recurso indisponível',
  description = 'Este módulo não está disponível para o seu tipo de negócio ou plano atual.',
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/50 bg-card/50 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground text-balance">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
