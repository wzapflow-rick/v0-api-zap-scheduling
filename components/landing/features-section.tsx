import { 
  Calendar, 
  Users, 
  Bell, 
  BarChart3, 
  Globe, 
  Smartphone,
  Clock,
  Shield
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Visualize e gerencie todos os agendamentos em um calendário intuitivo. Arraste e solte para remarcar.',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Mantenha o histórico completo de cada cliente, preferências e observações importantes.',
  },
  {
    icon: Bell,
    title: 'Notificações Automáticas',
    description: 'Lembretes via WhatsApp, SMS e e-mail. Reduza faltas em até 70%.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Detalhados',
    description: 'Acompanhe faturamento, serviços mais populares e performance dos profissionais.',
  },
  {
    icon: Globe,
    title: 'Página de Agendamento',
    description: 'Seus clientes agendam online 24h. Compartilhe o link nas redes sociais.',
  },
  {
    icon: Smartphone,
    title: 'Funciona em Qualquer Lugar',
    description: 'Acesse de qualquer dispositivo. Design responsivo para celular, tablet e desktop.',
  },
  {
    icon: Clock,
    title: 'Horários Flexíveis',
    description: 'Configure horários diferentes para cada profissional e dia da semana.',
  },
  {
    icon: Shield,
    title: 'Dados Seguros',
    description: 'Seus dados protegidos com criptografia. Backup automático diário.',
  },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="bg-muted/30 py-20 lg:py-32">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Tudo que você precisa para gerenciar seu negócio
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Funcionalidades pensadas para simplificar sua rotina e encantar seus clientes.
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
