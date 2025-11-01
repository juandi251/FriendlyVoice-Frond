// src/components/voice-message-item.tsx
'use client';

import type { Message as DirectMessage, User } from '@/types/friendly-voice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface VoiceMessageItemProps {
  message: DirectMessage;
  sender?: User; // Optional: pass sender details if available and different from currentUser
  isCurrentUserSender: boolean;
}

export function VoiceMessageItem({ message, sender, isCurrentUserSender }: VoiceMessageItemProps) {
  const formattedDate = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: es });

  return (
    <div className={cn(
      "flex items-end space-x-2 max-w-[75%] w-fit mb-4",
      isCurrentUserSender ? "ml-auto flex-row-reverse space-x-reverse" : "mr-auto"
    )}>
      {sender && !isCurrentUserSender && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={sender.avatarUrl} alt={sender.name ?? 'Usuario'} data-ai-hint="abstract person" />
          <AvatarFallback>{(sender.name ?? 'U').substring(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        "p-3 rounded-lg shadow",
        isCurrentUserSender ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <audio controls src={message.voiceUrl} className="w-full h-10 min-w-[200px] max-w-xs">
          Tu navegador no soporta el elemento de audio.
        </audio>
        <p className={cn(
          "text-xs mt-1",
          isCurrentUserSender ? "text-blue-200 text-right" : "text-muted-foreground text-left"
        )}>
          {formattedDate}
        </p>
      </div>
    </div>
  );
}
