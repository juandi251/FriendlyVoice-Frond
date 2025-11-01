"use client";
// src/components/layout/site-header.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';

export function SiteHeader() {
  const { user, unreadMessagesCount } = useAuth();
  const isAdmin = user?.role === 'admin';
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          FriendlyVoice
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/discover" className="text-muted-foreground hover:text-primary transition-colors">
            Ecosistemas
          </Link>
          <Link href="/feed" className="text-muted-foreground hover:text-primary transition-colors">
            Feed
          </Link>
          <Link href="/messages" className="text-muted-foreground hover:text-primary transition-colors relative inline-flex items-center">
            <span>Mensajes</span>
            {unreadMessagesCount > 0 && (
              <Badge className="ml-1.5 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center bg-red-500 text-white text-xs font-semibold">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </Badge>
            )}
          </Link>
          {!isAdmin && (
            <Link href="/notifications" className="text-muted-foreground hover:text-primary transition-colors">
              Notificaciones
            </Link>
          )}
        </nav>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile">
              <UserCircle2 className="h-6 w-6" />
              <span className="sr-only">Perfil</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
