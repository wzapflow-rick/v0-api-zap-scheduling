'use client';

import { BusinessGuard } from '@/components/business/business-guard';
import { ComingSoonModule } from '@/components/business/coming-soon-module';

export default function PlanosPage() {
  return (
    <BusinessGuard feature="memberships">
      <ComingSoonModule
        title="Planos"
        description="Em breve você poderá criar planos de assinatura e mensalidades para seus clientes diretamente pelo painel."
      />
    </BusinessGuard>
  );
}
