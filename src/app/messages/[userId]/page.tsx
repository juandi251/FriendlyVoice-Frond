// src/app/messages/[userId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import type { User, Message as DirectMessage } from '@/types/friendly-voice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceMessageItem } from '@/components/voice-message-item';
import { VoiceMessageInput } from '@/components/voice-message-input';
import { ArrowLeft, Loader2, UserX, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading, getUserById, getDirectMessages, fetchDirectMessages, sendDirectMessage, markChatAsRead } = useAuth();
  const { toast } = useToast();
  
  const ADMIN_EMAIL = 'juandi23154@gmail.com';
  const chatPartnerId = typeof params.userId === 'string' ? params.userId : undefined;
  const [chatPartner, setChatPartner] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  
  const isAdminChat = chatPartner?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = async () => {
      if (chatPartnerId && currentUser) {
        try {
          const partner = await getUserById(chatPartnerId);
          if (partner) {
            setChatPartner(partner);
            // Cargar mensajes desde el backend (Firestore)
            const fetchedMessages = await fetchDirectMessages(chatPartnerId);
            setMessages(fetchedMessages);
            console.log(`[Chat] Cargados ${fetchedMessages.length} mensajes para chat con ${partner.name}`);
            // Marcar chat como leído al abrir
            await markChatAsRead(chatPartnerId);
          } else {
            toast({ title: "Error", description: "Usuario no encontrado.", variant: "destructive" });
            router.push('/messages');
          }
        } catch (error: any) {
          console.error('[Chat] Error al cargar chat:', error);
          toast({ title: "Error", description: "No se pudieron cargar los mensajes.", variant: "destructive" });
        } finally {
          setIsLoadingChat(false);
        }
      } else if (!authLoading && !currentUser) {
        router.push('/login');
      }
    };
    run();
  }, [chatPartnerId, currentUser, authLoading, getUserById, getDirectMessages, fetchDirectMessages, router, toast]);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async (voiceDataUri: string) => {
    if (!currentUser || !chatPartner) return;
    try {
      await sendDirectMessage(chatPartner.id, voiceDataUri);
      // Recargar mensajes desde el backend para asegurar que incluya el nuevo
      const updatedMessages = await fetchDirectMessages(chatPartner.id);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('[Chat] Error al enviar mensaje:', error);
      toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
    }
  };

  if (authLoading || isLoadingChat) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-5rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!chatPartner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] text-center p-4">
        <UserX className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Chat no disponible</h2>
        <p className="text-muted-foreground mb-6">No se pudo cargar la información del chat.</p>
        <Button onClick={() => router.push('/messages')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mensajes
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-var(--site-header-height,4rem)-var(--tab-bar-height,4rem))] md:h-[calc(100vh-var(--site-header-height,4rem))] bg-background">
      {/* Header */}
      <div className="flex items-center p-3 border-b bg-card shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => router.push('/messages')} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Link href={`/profile/${chatPartner.id}`} className="flex items-center space-x-3 hover:opacity-80 transition-opacity flex-1">
          {isAdminChat ? (
            /* Logo de FriendlyVoice (micrófono con mano) en lugar de avatar */
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500/80 via-purple-500/70 to-pink-500/70 flex items-center justify-center overflow-hidden border-2 border-primary/50 shadow-lg ring-2 ring-primary/30 flex-shrink-0">
              <svg 
                viewBox="0 0 200 200" 
                className="w-full h-full p-1.5"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="chatMicGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="50%" stopColor="#dbeafe"/>
                    <stop offset="100%" stopColor="#bfdbfe"/>
                  </linearGradient>
                  <linearGradient id="chatHandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fed7aa"/>
                    <stop offset="50%" stopColor="#fde68a"/>
                    <stop offset="100%" stopColor="#fecaca"/>
                  </linearGradient>
                </defs>
                
                {/* Micrófono */}
                <g transform="translate(100, 60)">
                  <ellipse cx="0" cy="0" rx="22" ry="30" fill="url(#chatMicGradient)" stroke="#ffffff" strokeWidth="1.5"/>
                  <line x1="-10" y1="-12" x2="-10" y2="-7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="0" y1="-12" x2="0" y2="-7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round"/>
                  <line x1="10" y1="-12" x2="10" y2="-7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round"/>
                  <rect x="-2.5" y="25" width="5" height="7" fill="#ffffff" rx="1"/>
                </g>
                
                {/* Mano */}
                <g transform="translate(100, 130)">
                  <ellipse cx="0" cy="10" rx="25" ry="20" fill="url(#chatHandGradient)" stroke="#ffffff" strokeWidth="1.5"/>
                  <ellipse cx="-17" cy="0" rx="6" ry="15" fill="url(#chatHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                  <ellipse cx="-9" cy="-2" rx="6" ry="16" fill="url(#chatHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                  <ellipse cx="1" cy="-4" rx="6" ry="17" fill="url(#chatHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                  <ellipse cx="11" cy="-2" rx="6" ry="16" fill="url(#chatHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                  <ellipse cx="19" cy="0" rx="6" ry="14" fill="url(#chatHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                </g>
              </svg>
            </div>
          ) : (
            <Avatar className="h-9 w-9">
              <AvatarImage src={chatPartner.avatarUrl} alt={chatPartner.name ?? 'Usuario'} data-ai-hint="abstract person" />
              <AvatarFallback>
                {(chatPartner.name ?? 'U').substring(0,1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm ${isAdminChat ? 'text-primary' : ''}`}>
              {isAdminChat ? 'Soporte FriendlyVoice' : (chatPartner.name ?? 'Usuario')}
            </span>
            {isAdminChat && (
              <>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
                  Verificado
                </Badge>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aún no hay mensajes. ¡Envía el primero!
          </p>
        ) : (
          messages.map(msg => (
            <VoiceMessageItem 
              key={msg.id} 
              message={msg} 
              sender={msg.senderId === chatPartner.id ? chatPartner : undefined}
              isCurrentUserSender={msg.senderId === currentUser?.id}
            />
          ))
        )}
      </ScrollArea>

      {/* Input Area */}
      <VoiceMessageInput onSendMessage={handleSendMessage} />
      
      {/* CSS Variables for header/tab bar height for h-screen calculation */}
      <style jsx global>{`
        :root {
          --site-header-height: 4rem; /* Adjust if your header height is different */
          --tab-bar-height: 4rem; /* Adjust if your tab bar height is different */
        }
      `}</style>
    </div>
  );
}
