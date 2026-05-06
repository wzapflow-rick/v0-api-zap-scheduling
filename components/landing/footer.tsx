import Link from 'next/link';
import { Calendar } from 'lucide-react';

const footerLinks = {
  produto: [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Preços', href: '#precos' },
    { label: 'Integrações', href: '#' },
    { label: 'Atualizações', href: '#' },
  ],
  empresa: [
    { label: 'Sobre', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Carreiras', href: '#' },
    { label: 'Contato', href: '#' },
  ],
  suporte: [
    { label: 'Central de Ajuda', href: '#' },
    { label: 'Tutoriais', href: '#' },
    { label: 'Status', href: '#' },
    { label: 'API Docs', href: '#' },
  ],
  legal: [
    { label: 'Termos de Uso', href: '#' },
    { label: 'Privacidade', href: '#' },
    { label: 'LGPD', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto max-w-7xl px-4 py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ZapAgenda</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              O sistema de agendamentos mais simples e intuitivo para profissionais de serviços.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Produto</h4>
            <ul className="space-y-3">
              {footerLinks.produto.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Empresa</h4>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Suporte</h4>
            <ul className="space-y-3">
              {footerLinks.suporte.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 lg:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ZapAgenda. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Instagram
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              LinkedIn
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              YouTube
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
