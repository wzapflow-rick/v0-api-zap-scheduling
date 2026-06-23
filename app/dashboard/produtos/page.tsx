'use client';

import { BusinessGuard } from '@/components/business/business-guard';
import { ComingSoonModule } from '@/components/business/coming-soon-module';

export default function ProdutosPage() {
  return (
    <BusinessGuard feature="products">
      <ComingSoonModule
        title="Produtos"
        description="Em breve você poderá cadastrar produtos, controlar estoque e registrar vendas diretamente pelo painel."
      />
    </BusinessGuard>
  );
}
