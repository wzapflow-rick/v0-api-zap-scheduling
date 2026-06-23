'use client';

import { BusinessGuard } from '@/components/business/business-guard';
import { ComingSoonModule } from '@/components/business/coming-soon-module';

export default function ProntuariosPage() {
  return (
    <BusinessGuard feature="medicalRecords">
      <ComingSoonModule
        title="Prontuários"
        description="Em breve você poderá registrar anamneses, histórico de atendimentos e anexos de forma segura."
      />
    </BusinessGuard>
  );
}
