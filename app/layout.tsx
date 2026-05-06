import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

const geist = Geist({ 
  subsets: ['latin'],
  variable: '--font-geist',
});

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'ZapAgenda - Sistema de Agendamentos Online',
    template: '%s | ZapAgenda',
  },
  description: 'Gerencie seus agendamentos, clientes e profissionais de forma simples e intuitiva. A melhor solução para barbearias, salões de beleza, personal trainers e muito mais.',
  keywords: ['agendamento online', 'barbearia', 'salão de beleza', 'agenda', 'gestão', 'clientes', 'profissionais'],
  authors: [{ name: 'ZapAgenda' }],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-background">
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
