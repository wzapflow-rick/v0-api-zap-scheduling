'use client';

import { BusinessGuard } from '@/components/business/business-guard';
import { ComingSoonModule } from '@/components/business/coming-soon-module';

export default function TreinosPage() {
  return (
    <BusinessGuard feature="workouts">
      <ComingSoonModule
        title="Treinos"
        description="Em breve você poderá montar fichas de treino, acompanhar a evolução e compartilhar com seus alunos."
      />
    </BusinessGuard>
  );
}
