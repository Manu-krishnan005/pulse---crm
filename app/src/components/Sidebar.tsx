'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserRound,
  Megaphone,
  BarChart3,
  Zap,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: UserRound },
  { name: 'Audience', href: '/audience', icon: Users },
  { name: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-navy-800 border-r border-surface-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-glow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-base font-bold gradient-text">Pulse</div>
            <div className="text-[10px] text-gray-500 -mt-0.5 tracking-wide uppercase">AI CRM</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
          Main Menu
        </p>
        {navigation.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx('nav-item group', { active: isActive })}
            >
              <item.icon className={clsx('w-4 h-4', isActive ? 'text-accent-from' : 'text-gray-500 group-hover:text-gray-300')} />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent-from/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-border">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-xs font-bold text-white">
            D
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">Demo User</div>
            <div className="text-xs text-gray-500 truncate">admin@pulse.crm</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
