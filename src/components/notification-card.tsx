// src/components/notification-card.tsx
'use client';

import type { Notification } from '@/types/friendly-voice';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserPlus, Heart, MessageCircle, RadioTower, Info } from 'lucide-react';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
}

export function NotificationCard({ notification, onMarkAsRead }: NotificationCardProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es });

  let icon = <Info className="h-5 w-5 text-primary" />;
  let message = notification.genericMessage || 'Nueva notificación.';
  let link = notification.link || `/profile/${notification.userId}`;

  switch (notification.type) {
    case 'new_follower':
      icon = <UserPlus className="h-5 w-5 text-blue-500" />;
      message = `${notification.userName} comenzó a seguirte.`;
      link = `/profile/${notification.userId}`;
      break;
    case 'like':
      icon = <Heart className="h-5 w-5 text-red-500" />;
      message = `${notification.userName} le dio Me gusta a tu Voz: "${notification.vozCaptionPreview || 'tu Voz'}".`;
      link = notification.vozId ? `/feed#voz-${notification.vozId}` : '#'; // Link to Voz on feed page if ID exists
      break;
    case 'comment':
      icon = <MessageCircle className="h-5 w-5 text-green-500" />;
      message = `${notification.userName} comentó en tu Voz: "${notification.commentTextPreview || notification.vozCaptionPreview || 'tu Voz'}".`;
      link = notification.vozId ? `/feed#voz-${notification.vozId}` : '#'; // Link to Voz on feed page
      break;
    case 'ecosystem_invite':
      icon = <RadioTower className="h-5 w-5 text-purple-500" />;
      message = `Has sido invitado a unirte al ecosistema: ${notification.ecosystemName || 'un nuevo ecosistema'}.`;
      link = notification.ecosystemId ? `/ecosystems/${notification.ecosystemId}` : '#';
      break;
    default:
      // Generic notification uses default icon and message
      break;
  }

  return (
    <Link href={link} passHref onClick={() => !notification.isRead && onMarkAsRead(notification.id)}>
      <Card className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        notification.isRead ? "bg-card" : "bg-secondary border-primary/50"
      )}>
        <CardContent className="p-4 flex items-start space-x-4">
          <div className="flex-shrink-0 pt-1">{icon}</div>
          <div className="flex-grow">
            <div className="flex items-center space-x-2 mb-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={notification.userAvatarUrl} alt={notification.userName} data-ai-hint="abstract person"/>
                <AvatarFallback>{notification.userName.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className={cn("text-sm", !notification.isRead && "font-semibold")}>{message}</p>
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          {!notification.isRead && (
            <div className="flex-shrink-0 self-center">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary"></span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
