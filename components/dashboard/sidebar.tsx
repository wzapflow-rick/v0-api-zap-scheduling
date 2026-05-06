'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  Briefcase,
  Settings,
  LayoutDashboard,
  Scissors,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const sidebarLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/agendamentos',
    label: 'Agendamentos',
    icon: Calendar,
  },
  {
    href: '/dashboard/clientes',
    label: 'Clientes',
    icon: Users,
  },
  {
    href: '/dashboard/profissionais',
    label: 'Profissionais',
    icon: Briefcase,
  },
  {
    href: '/dashboard/servicos',
    label: 'Serviços',
    icon: Scissors,
  },
  {
    href: '/dashboard/configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Calendar className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">ZapAgenda</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Calendar className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href || 
            (link.href !== '/dashboard' && pathname.startsWith(link.href));
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Recolher
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
