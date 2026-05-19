'use client';

import Link from 'next/link';
import { Calendar, CheckCircle2, Clock, Users, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  variant: 'login' | 'register' | 'forgot-password';
}

const features = [
  {
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Gerencie todos os seus agendamentos em um só lugar',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description: 'Confirmações e lembretes automáticos via WhatsApp',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Cadastro completo com histórico de atendimentos',
  },
  {
    icon: Clock,
    title: 'Disponível 24h',
    description: 'Seus clientes agendam a qualquer hora do dia',
  },
];

const stats = [
  { value: '+50.000', label: 'Agendamentos/mês' },
  { value: '+2.000', label: 'Estabelecimentos' },
  { value: '99.9%', label: 'Uptime garantido' },
];

export function AuthLayout({ children, variant }: AuthLayoutProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Visual Panel */}
      <div className="relative hidden w-1/2 lg:flex lg:flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-background overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-40 right-20 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl animate-pulse delay-1000" />
        <div className="absolute top-1/3 right-10 w-16 h-16 bg-emerald-300/20 rounded-full blur-xl animate-pulse delay-500" />

        {/* Header */}
        <div className="relative z-10 p-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-105">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ZapAgenda</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-8">
          <div className="space-y-8">
            {/* Tagline */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm text-emerald-300 border border-emerald-500/30">
                <Sparkles className="h-4 w-4" />
                <span>Simplifique seus agendamentos</span>
              </div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                {variant === 'login' && 'Bem-vindo de volta!'}
                {variant === 'register' && 'Comece gratuitamente'}
                {variant === 'forgot-password' && 'Recupere sua conta'}
              </h1>
              <p className="text-lg text-emerald-100/70 max-w-md">
                {variant === 'login' && 'Acesse sua conta e continue gerenciando seus agendamentos de forma inteligente.'}
                {variant === 'register' && 'Crie sua conta e transforme a forma como você gerencia agendamentos.'}
                {variant === 'forgot-password' && 'Não se preocupe, acontece com todo mundo. Vamos recuperar seu acesso.'}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = activeFeature === index;
                return (
                  <div
                    key={feature.title}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-xl transition-all duration-500',
                      isActive 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 scale-[1.02]' 
                        : 'bg-transparent border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-500',
                      isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-800/50 text-emerald-300'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className={cn(
                        'font-semibold transition-colors duration-500',
                        isActive ? 'text-white' : 'text-emerald-100'
                      )}>
                        {feature.title}
                      </h3>
                      <p className={cn(
                        'text-sm transition-colors duration-500',
                        isActive ? 'text-emerald-100' : 'text-emerald-200/60'
                      )}>
                        {feature.description}
                      </p>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto shrink-0 animate-in fade-in duration-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="relative z-10 border-t border-emerald-800/50 p-8">
          <div className="flex items-center justify-around">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-emerald-200/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form Panel */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Mobile Header */}
        <header className="border-b border-border bg-background p-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">ZapAgenda</span>
          </Link>
        </header>

        {/* Form Container */}
        <main className="flex flex-1 items-center justify-center bg-background px-4 py-8 lg:px-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-background py-4 px-4">
          <div className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ZapAgenda. Todos os direitos reservados.
          </div>
        </footer>
      </div>
    </div>
  );
}
