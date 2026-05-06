import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="bg-primary py-20 lg:py-32">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl">
          Pronto para transformar seu negócio?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80">
          Junte-se a milhares de profissionais que já simplificaram sua rotina de agendamentos. 
          Comece gratuitamente em menos de 5 minutos.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="gap-2"
          >
            <Link href="/register">
              Criar Conta Grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link href="#demo">Ver Demonstração</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
