'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { OfflineBanner } from '@/components/connection-status';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AutoMessagesProvider } from '@/contexts/auto-messages-context';
import { BusinessConfigProvider } from '@/contexts/business-config-context';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[240px] p-0 bg-sidebar border-sidebar-border">
          <Sidebar onLinkClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      
      <div className={cn(
        'transition-all duration-300 ease-in-out',
        collapsed ? 'lg:pl-20' : 'lg:pl-64'
      )}>
        <OfflineBanner />
        <DashboardHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 lg:p-6">
          <SubscriptionGuard>
            {children}
          </SubscriptionGuard>
        </main>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const slug = user?.establishment?.slug;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <BusinessConfigProvider>
        <AutoMessagesProvider slug={slug}>
          <div className="min-h-screen bg-background">
            <DashboardContent>{children}</DashboardContent>
          </div>
        </AutoMessagesProvider>
      </BusinessConfigProvider>
    </SidebarProvider>
  );
}
