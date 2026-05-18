'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCell, setActiveCell] = useState(5);

  useEffect(() => {
    setIsVisible(true);
    
    // Animate calendar cells
    const interval = setInterval(() => {
      setActiveCell((prev) => {
        const cells = [5, 12, 19, 26, 6, 13, 20, 27];
        const currentIndex = cells.indexOf(prev);
        return cells[(currentIndex + 1) % cells.length];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-1/4 -top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container relative mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div 
            className={cn(
              "mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Novo: Notificações via WhatsApp
          </div>

          {/* Main heading */}
          <h1 
            className={cn(
              "max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl transition-all duration-700 delay-100",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            Simplifique seus agendamentos.{' '}
            <span className="text-primary">Cresça seu negócio.</span>
          </h1>

          {/* Subtitle */}
          <p 
            className={cn(
              "mt-6 max-w-2xl text-pretty text-lg text-muted-foreground lg:text-xl transition-all duration-700 delay-200",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            O sistema de agendamentos mais intuitivo para barbearias, salões de beleza, 
            personal trainers e profissionais de serviços. Comece a usar em minutos.
          </p>

          {/* CTA Buttons */}
          <div 
            className={cn(
              "mt-10 flex flex-col gap-4 sm:flex-row transition-all duration-700 delay-300",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <Button size="lg" asChild className="gap-2 group">
              <Link href="/register">
                Começar Gratuitamente
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#demo">Ver Demonstração</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div 
            className={cn(
              "mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground transition-all duration-700 delay-[400ms]",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            <div className="flex items-center gap-2 group">
              <Calendar className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              <span className="text-sm">+50.000 agendamentos/mês</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Users className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              <span className="text-sm">+2.000 estabelecimentos</span>
            </div>
            <div className="flex items-center gap-2 group">
              <Clock className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
              <span className="text-sm">Setup em 5 minutos</span>
            </div>
          </div>

          {/* Hero Image/Demo */}
          <div 
            className={cn(
              "mt-16 w-full max-w-5xl transition-all duration-1000 delay-500",
              isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
            )}
          >
            <div className="relative rounded-xl border border-border bg-card p-2 shadow-2xl shadow-primary/5 group hover:shadow-primary/10 transition-shadow duration-500">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 opacity-50 blur group-hover:opacity-70 transition-opacity duration-500" />
              <div className="relative overflow-hidden rounded-lg bg-muted">
                {/* Dashboard Preview Mock */}
                <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 p-4 lg:p-8">
                  <div className="flex h-full flex-col gap-4">
                    {/* Top bar mock */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/20 animate-pulse" />
                        <div className="h-4 w-24 rounded bg-foreground/10" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 rounded-md bg-foreground/10" />
                        <div className="h-8 w-8 rounded-full bg-foreground/10" />
                      </div>
                    </div>
                    
                    {/* Content mock */}
                    <div className="flex flex-1 gap-4">
                      {/* Sidebar mock */}
                      <div className="hidden w-48 space-y-2 lg:block">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "h-10 rounded-md transition-all duration-500",
                              i === 1 ? 'bg-primary/30 shadow-sm shadow-primary/20' : 'bg-foreground/5 hover:bg-foreground/10'
                            )}
                            style={{ 
                              animationDelay: `${i * 100}ms`,
                              animation: isVisible ? 'slideInLeft 0.5s ease-out forwards' : 'none',
                              opacity: 0
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Main content mock */}
                      <div className="flex-1 space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div 
                              key={i} 
                              className="rounded-lg bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-300"
                              style={{ 
                                animationDelay: `${600 + i * 100}ms`,
                                animation: isVisible ? 'fadeInUp 0.5s ease-out forwards' : 'none',
                                opacity: 0
                              }}
                            >
                              <div className="mb-2 h-3 w-16 rounded bg-foreground/10" />
                              <div className="h-6 w-12 rounded bg-primary/20" />
                            </div>
                          ))}
                        </div>
                        
                        {/* Calendar mock */}
                        <div 
                          className="rounded-lg bg-card p-4 shadow-sm"
                          style={{ 
                            animationDelay: '1000ms',
                            animation: isVisible ? 'fadeInUp 0.5s ease-out forwards' : 'none',
                            opacity: 0
                          }}
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="h-4 w-32 rounded bg-foreground/10" />
                            <div className="flex gap-2">
                              <div className="h-6 w-6 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors cursor-pointer" />
                              <div className="h-6 w-6 rounded bg-foreground/10 hover:bg-foreground/20 transition-colors cursor-pointer" />
                            </div>
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 35 }).map((_, i) => {
                              const isActive = [5, 12, 19, 26].includes(i);
                              const isAnimated = i === activeCell;
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "aspect-square rounded transition-all duration-500",
                                    isActive 
                                      ? "bg-primary/30" 
                                      : "bg-foreground/5",
                                    isAnimated && "ring-2 ring-primary ring-offset-1 ring-offset-card scale-110 bg-primary/40"
                                  )}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global animations */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
