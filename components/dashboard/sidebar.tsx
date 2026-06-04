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
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

const navItems = [
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
];

const adminItems = [
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

// Componente de item do menu com animacoes
function NavItem({ 
  item, 
  isActive, 
  isOpen, 
  onClick,
  index 
}: { 
  item: typeof navItems[0]; 
  isActive: boolean; 
  isOpen: boolean; 
  onClick?: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
          isActive
            ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary"
            : "text-white/55 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        {/* Barra indicadora lateral animada */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full"
            />
          )}
        </AnimatePresence>

        {/* Icone com efeito de glow quando ativo */}
        <div className={cn(
          "relative flex items-center justify-center size-9 rounded-lg transition-all duration-300 shrink-0",
          isActive 
            ? "bg-primary/20 shadow-[0_0_20px_rgba(34,209,90,0.35)]" 
            : "bg-white/[0.04] group-hover:bg-white/[0.08]"
        )}>
          <item.icon className={cn(
            "size-[18px] transition-all duration-300",
            isActive ? "text-primary" : "text-white/55 group-hover:text-white"
          )} />
        </div>

        {/* Nome do item com animacao */}
        {isOpen && (
          <motion.span 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className={cn(
              "text-sm font-medium whitespace-nowrap transition-colors duration-300",
              isActive ? "text-primary font-semibold" : "text-white/70 group-hover:text-white"
            )}
          >
            {item.label}
          </motion.span>
        )}

        {/* Seta indicadora no hover */}
        {isOpen && !isActive && (
          <ChevronRight className="size-4 text-white/40 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ml-auto" />
        )}
      </Link>
    </motion.div>
  );
}

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();
  const isOpen = !collapsed;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full transition-all duration-300 z-40 flex flex-col",
        "bg-gradient-to-b from-[#0B1310] via-[#0A0F0D] to-[#080B0A]",
        "border-r border-white/[0.06]",
        "shadow-[4px_0_24px_rgba(0,0,0,0.4)]",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Glow verde sutil no topo */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-primary/20 blur-[80px]" />
      {/* Header - Logo */}
      <div className="p-4 flex items-center justify-center">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative size-10 rounded-xl overflow-hidden shrink-0 shadow-lg ring-2 ring-primary/20 bg-primary/10 flex items-center justify-center">
              <Calendar className="size-5 text-primary" />
            </div>
            
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <h1 className="font-bold text-white leading-none text-lg">
                  ZapAgenda
                </h1>
                <p className="text-[9px] text-primary/80 mt-1 uppercase tracking-widest font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  by ZapFlow
                </p>
              </motion.div>
            )}
          </Link>
        </motion.div>
      </div>

      {/* Navegacao */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, index) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive}
              isOpen={isOpen}
              onClick={onLinkClick}
              index={index}
            />
          );
        })}

        {/* Secao Administracao */}
        <div className="pt-3 mt-3">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />
          
          {isOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2 block"
            >
              Administracao
            </motion.span>
          )}
          
          <div className="space-y-1">
            {adminItems.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  isOpen={isOpen}
                  onClick={onLinkClick}
                  index={navItems.length + index}
                />
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer - Collapse Button */}
      <div className="p-3 border-t border-white/5">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={toggleCollapsed}
          className={cn(
            "group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-300",
            "text-white/55 hover:text-white hover:bg-white/[0.06]"
          )}
        >
          <div className="relative flex items-center justify-center size-9 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] transition-all duration-300 shrink-0">
            <ChevronLeft className={cn(
              "size-[18px] text-white/55 group-hover:text-white transition-all duration-300",
              collapsed && "rotate-180"
            )} />
          </div>
          
          {isOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            className="text-sm font-medium text-white/70 group-hover:text-white whitespace-nowrap"
          >
            Recolher
            </motion.span>
          )}
        </motion.button>
      </div>
    </aside>
  );
}
