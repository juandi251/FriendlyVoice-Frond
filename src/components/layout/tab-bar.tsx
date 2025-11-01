// src/components/layout/tab-bar.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Bell, User, MicVocal, MessageSquare } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';

const navItems = [
  { href: '/discover', label: 'Ecosistemas', icon: LayoutGrid },
  { href: '/feed', label: 'Feed', icon: MicVocal },
  { href: '/messages', label: 'Mensajes', icon: MessageSquare },
  { href: '/notifications', label: 'Notificaciones', icon: Bell, adminOnly: false },
  { href: '/profile', label: 'Perfil', icon: User },
];

export function TabBar() {
  const pathname = usePathname();
  const { user, unreadMessagesCount } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Filtrar items según si es admin o no
  const filteredItems = navItems.filter(item => {
    // Si el item requiere no ser admin (adminOnly: false), ocultar para admin
    if (item.href === '/notifications' && isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container mx-auto flex h-16 items-center justify-around px-2">
        {filteredItems.map((item) => {
          let isActive = pathname === item.href;
          // More specific active states for routes with children
          if (item.href === '/discover') {
            isActive = pathname === '/discover' || pathname === '/' || pathname.startsWith('/ecosystems/');
          } else if (item.href === '/feed') {
            isActive = pathname.startsWith('/feed');
          } else if (item.href === '/messages') {
            isActive = pathname.startsWith('/messages');
          } else if (item.href === '/notifications') {
            isActive = pathname.startsWith('/notifications');
          } else if (item.href === '/profile') {
            isActive = pathname.startsWith('/profile');
          }
          
          const widthClass = filteredItems.length === 4 ? 'w-1/4' : filteredItems.length === 5 ? 'w-1/5' : 'flex-1';
          
          const showUnreadBadge = item.href === '/messages' && unreadMessagesCount > 0;
          
          return (
            <Link key={item.label} href={item.href} passHref>
              <div className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors relative",
                widthClass,
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}>
                <div className="relative">
                  <item.icon className="h-6 w-6" />
                  {showUnreadBadge && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
