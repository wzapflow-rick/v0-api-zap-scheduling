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
  CreditCard,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';

const sidebarLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true,
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
    label: 'Servicos',
    icon: Scissors,
  },
  {
    href: '/dashboard/assinatura',
    label: 'Assinatura',
    icon: CreditCard,
  },
  {
    href: '/dashboard/configuracoes',
    label: 'Configuracoes',
    icon: Settings,
  },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground whitespace-nowrap">
              ZapAgenda
            </span>
          )}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={toggleCollapsed}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const isActive = link.exact 
            ? pathname === link.href 
            : pathname === link.href || pathname.startsWith(link.href + '/');
          
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={toggleCollapsed}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200',
            collapsed && 'justify-center'
          )}
        >
          <ChevronLeft className={cn(
            'h-5 w-5 shrink-0 transition-transform duration-300',
            collapsed && 'rotate-180'
          )} />
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
