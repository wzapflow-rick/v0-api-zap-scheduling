import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessLabel } from '@/components/business/business-label';
import { BusinessGuard } from '@/components/business/business-guard';

// auth-context é usado indiretamente; sem provider os componentes caem no
// DEFAULT_BUSINESS_CONFIG (nicho OTHER) — labels genéricas.
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: null }),
}));

// Controla o acesso a módulos no BusinessGuard de forma determinística.
const canAccessMock = vi.fn();
vi.mock('@/hooks/use-module-access', () => ({
  useModuleAccess: () => ({ canAccess: canAccessMock }),
}));

describe('BusinessLabel', () => {
  it('renderiza o singular por padrão (fallback genérico)', () => {
    render(<BusinessLabel label="client" />);
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });

  it('renderiza o plural quando solicitado', () => {
    render(<BusinessLabel label="professional" plural />);
    expect(screen.getByText('Profissionais')).toBeInTheDocument();
  });
});

describe('BusinessGuard', () => {
  it('renderiza o conteúdo quando a feature está habilitada', () => {
    canAccessMock.mockReturnValue(true);
    render(
      <BusinessGuard feature="products">
        <p>Conteúdo do módulo</p>
      </BusinessGuard>
    );
    expect(screen.getByText('Conteúdo do módulo')).toBeInTheDocument();
  });

  it('usa o fallback informado quando sem acesso', () => {
    canAccessMock.mockReturnValue(false);
    render(
      <BusinessGuard feature="workouts" fallback={<p>Sem acesso</p>}>
        <p>Treinos</p>
      </BusinessGuard>
    );
    expect(screen.getByText('Sem acesso')).toBeInTheDocument();
    expect(screen.queryByText('Treinos')).not.toBeInTheDocument();
  });

  it('renderiza AccessDenied por padrão quando sem acesso e sem fallback', () => {
    canAccessMock.mockReturnValue(false);
    render(
      <BusinessGuard feature="medicalRecords">
        <p>Prontuários</p>
      </BusinessGuard>
    );
    expect(screen.queryByText('Prontuários')).not.toBeInTheDocument();
  });
});
