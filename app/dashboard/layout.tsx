'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { OfflineBanner } from '@/components/connection-status';
import { Loader2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AutoMessagesProvider } from '@/contexts/auto-messages-context';
import { SubscriptionGuard } from '@/components/subscription-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const slug = user?.establishment?.slug;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AutoMessagesProvider slug={slug}>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onLinkClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <div className="lg:pl-64 transition-all duration-300">
          <OfflineBanner />
          <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
          <main className="p-4 lg:p-6">
            <SubscriptionGuard>
              {children}
            </SubscriptionGuard>
          </main>
        </div>
      </div>
    </AutoMessagesProvider>
  );
}
