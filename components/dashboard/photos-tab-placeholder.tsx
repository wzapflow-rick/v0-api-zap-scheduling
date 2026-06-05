'use client';

import { ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotosTabPlaceholderProps {
  /** Texto que descreve de quem sao as fotos (ex.: "do cliente", "do profissional") */
  subjectLabel?: string;
}

/**
 * Placeholder da aba de Fotos.
 *
 * A galeria de fotos ainda nao foi implementada. Este componente reserva o
 * espaco na UI (uma aba dedicada) para uma implementacao futura onde sera
 * possivel adicionar e gerenciar fotos. O botao fica desabilitado de proposito.
 */
export function PhotosTabPlaceholder({ subjectLabel = '' }: PhotosTabPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ImageIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">Galeria de fotos em breve</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
        {`Em breve voce podera adicionar e organizar fotos ${subjectLabel}`.trim()}. Esta funcionalidade
        ainda esta em desenvolvimento.
      </p>
      <Button type="button" variant="outline" className="mt-4" disabled>
        <Upload className="mr-2 h-4 w-4" />
        Adicionar foto
      </Button>
    </div>
  );
}
