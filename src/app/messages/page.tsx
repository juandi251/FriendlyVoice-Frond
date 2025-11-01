// src/app/messages/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { User, Message } from '@/types/friendly-voice';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquarePlus, Users, Loader2, LogIn, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ChatInfo {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isAdmin: boolean;
}

export default function MessagesPage() {
  const { user, loading, fetchDirectMessages, getUnreadMessagesCountForChat } = useAuth();
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [chatInfos, setChatInfos] = useState<Map<string, ChatInfo>>(new Map());
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const loadingRef = useRef(false);
  const functionsRef = useRef({ fetchDirectMessages, getUnreadMessagesCountForChat, toast });
  
  // Actualizar referencias cuando cambien las funciones
  useEffect(() => {
    functionsRef.current = { fetchDirectMessages, getUnreadMessagesCountForChat, toast };
  }, [fetchDirectMessages, getUnreadMessagesCountForChat, toast]);
  
  const ADMIN_EMAIL = 'juandi23154@gmail.com';

  useEffect(() => {
    const loadAllUsers = async () => {
      const currentUser = user;
      const { fetchDirectMessages: fetchMsgs, getUnreadMessagesCountForChat: getUnread, toast: showToast } = functionsRef.current;
      
      if (!currentUser || loadingRef.current) return;
      loadingRef.current = true;
      setIsLoadingUsers(true);
      try {
        const users = await api.get<User[]>('/api/usuarios');
        console.log('[Messages] Total usuarios:', users.length);
        console.log('[Messages] Usuario actual:', currentUser.email);
        
        // Separar el admin y filtrar usuario actual
        const admin = users.find(u => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
        const otherUsers = users.filter(u => {
          const isNotCurrentUser = u.id !== currentUser.id;
          const isNotAdmin = u.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase();
          return isNotCurrentUser && isNotAdmin;
        });
        
        console.log('[Messages] Admin encontrado:', admin?.email);
        console.log('[Messages] Otros usuarios:', otherUsers.length);
        
        setAdminUser(admin || null);
        setAllUsers(otherUsers);

        // Cargar información de chats (OPTIMIZADO: solo último mensaje y contador sin leer)
        const chatInfoMap = new Map<string, ChatInfo>();
        let totalUnread = 0;

        // Función optimizada para obtener resumen de chat sin cargar todos los mensajes
        const getChatSummary = async (chatPartnerId: string) => {
          try {
            const resumen = await api.get<{ lastMessage?: Message; unreadCount: number }>(
              `/api/mensajes/resumen/${currentUser.id}/${chatPartnerId}`
            );
            return resumen;
          } catch (error: any) {
            console.error(`[Messages] Error al obtener resumen del chat con ${chatPartnerId}:`, error);
            return { lastMessage: undefined, unreadCount: 0 };
          }
        };

        // Cargar info del admin si existe y el usuario no es admin
        if (admin && currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          const resumen = await getChatSummary(admin.id);
          chatInfoMap.set(admin.id, {
            userId: admin.id,
            userName: 'Soporte FriendlyVoice',
            userAvatar: admin.avatarUrl,
            lastMessage: resumen.lastMessage,
            unreadCount: resumen.unreadCount,
            isAdmin: true,
          });
          totalUnread += resumen.unreadCount;
        }

        // Cargar info de otros usuarios en paralelo (más rápido que secuencial)
        const userSummaries = await Promise.all(
          otherUsers.map(async (friend) => {
            const resumen = await getChatSummary(friend.id);
            const displayName = friend.name || 'Usuario';
            return {
              userId: friend.id,
              userName: displayName,
              userAvatar: friend.avatarUrl,
              lastMessage: resumen.lastMessage,
              unreadCount: resumen.unreadCount,
              isAdmin: false,
            };
          })
        );

        // Agregar todos los resúmenes al mapa
        userSummaries.forEach((chatInfo) => {
          chatInfoMap.set(chatInfo.userId, chatInfo);
          totalUnread += chatInfo.unreadCount;
        });

        setChatInfos(chatInfoMap);
        setTotalUnreadCount(totalUnread);
        console.log('[Messages] Total mensajes sin leer:', totalUnread);
      } catch (error: any) {
        console.error('[Messages] Error al cargar usuarios:', error);
        showToast({
          title: 'Error al cargar usuarios',
          description: error.message || 'No se pudieron cargar los usuarios',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingUsers(false);
        loadingRef.current = false;
      }
    };
    
    if (user) {
      loadAllUsers();
    }
    
    // Recargar cada 60 segundos para actualizar mensajes sin leer (reducido para evitar saturación)
    const interval = setInterval(() => {
      if (user && !loadingRef.current) {
        loadAllUsers();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.id]); // Solo depender de user.id para evitar re-renders innecesarios
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center p-4">
        <Users className="w-24 h-24 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Inicia Sesión para Chatear</h2>
        <p className="text-muted-foreground mb-6">Conéctate con tus Voces Amigas enviando mensajes de voz.</p>
        <Button asChild>
          <Link href="/login"><LogIn className="mr-2 h-4 w-4"/> Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center">
            <MessageSquarePlus className="mr-3 h-7 w-7" /> Mensajes Directos
          </CardTitle>
          <CardDescription>Comunícate con otros usuarios enviando mensajes de voz.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chat de Soporte del Admin (si existe y el usuario no es admin) */}
              {adminUser && user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (() => {
                const chatInfo = chatInfos.get(adminUser.id);
                return (
                  <Link href={`/messages/${adminUser.id}`} passHref>
                    <div className="flex items-center p-3 bg-primary/5 border-2 border-primary/20 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                      <div className="relative flex-shrink-0">
                        {/* Logo de FriendlyVoice (micrófono con mano) en lugar de avatar */}
                        <div className="h-10 w-10 mr-3 rounded-full bg-gradient-to-br from-blue-500/80 via-purple-500/70 to-pink-500/70 flex items-center justify-center overflow-hidden border-2 border-primary/50 shadow-lg ring-2 ring-primary/30">
                          <svg 
                            viewBox="0 0 200 200" 
                            className="w-full h-full p-2"
                            xmlns="http://www.w3.org/2000/svg"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <defs>
                              <linearGradient id="msgMicGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ffffff"/>
                                <stop offset="50%" stopColor="#dbeafe"/>
                                <stop offset="100%" stopColor="#bfdbfe"/>
                              </linearGradient>
                              <linearGradient id="msgHandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#fed7aa"/>
                                <stop offset="50%" stopColor="#fde68a"/>
                                <stop offset="100%" stopColor="#fecaca"/>
                              </linearGradient>
                            </defs>
                            
                            {/* Micrófono */}
                            <g transform="translate(100, 60)">
                              <ellipse cx="0" cy="0" rx="22" ry="30" fill="url(#msgMicGradient)" stroke="#ffffff" strokeWidth="1.5"/>
                              <line x1="-10" y1="-12" x2="-10" y2="-7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round"/>
                              <line x1="0" y1="-12" x2="0" y2="-7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round"/>
                              <line x1="10" y1="-12" x2="10" y2="-7" stroke="#ffffff" strokeWidth="1" strokeLinecap="round"/>
                              <rect x="-2.5" y="25" width="5" height="7" fill="#ffffff" rx="1"/>
                            </g>
                            
                            {/* Mano */}
                            <g transform="translate(100, 130)">
                              <ellipse cx="0" cy="10" rx="25" ry="20" fill="url(#msgHandGradient)" stroke="#ffffff" strokeWidth="1.5"/>
                              <ellipse cx="-17" cy="0" rx="6" ry="15" fill="url(#msgHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                              <ellipse cx="-9" cy="-2" rx="6" ry="16" fill="url(#msgHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                              <ellipse cx="1" cy="-4" rx="6" ry="17" fill="url(#msgHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                              <ellipse cx="11" cy="-2" rx="6" ry="16" fill="url(#msgHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                              <ellipse cx="19" cy="0" rx="6" ry="14" fill="url(#msgHandGradient)" stroke="#ffffff" strokeWidth="1"/>
                            </g>
                          </svg>
                        </div>
                        {chatInfo && chatInfo.unreadCount > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-background">
                            {chatInfo.unreadCount > 9 ? '9+' : chatInfo.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-primary truncate">Soporte FriendlyVoice</p>
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {chatInfo?.lastMessage ? (
                            <span className={chatInfo.unreadCount > 0 ? 'font-semibold text-foreground' : ''}>
                              {new Date(chatInfo.lastMessage.createdAt).toLocaleDateString('es-ES', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            'Resuelve dudas y gestiona problemas'
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 flex-shrink-0">
                        Verificado
                      </Badge>
                    </div>
                  </Link>
                );
              })()}
              
              {/* Separador si hay usuarios y soporte */}
              {adminUser && allUsers.length > 0 && user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                <div className="border-t my-4"></div>
              )}
              
              {/* Lista de usuarios normales - ordenar por mensajes sin leer primero, luego por último mensaje */}
              {allUsers.length > 0 ? (
                allUsers
                  .map((friend: User) => {
                    const chatInfo = chatInfos.get(friend.id);
                    return { friend, chatInfo };
                  })
                  .sort((a, b) => {
                    // Priorizar chats con mensajes sin leer
                    const unreadA = a.chatInfo?.unreadCount || 0;
                    const unreadB = b.chatInfo?.unreadCount || 0;
                    if (unreadA !== unreadB) return unreadB - unreadA; // Más sin leer primero
                    
                    // Luego ordenar por fecha del último mensaje
                    const dateA = a.chatInfo?.lastMessage?.createdAt ? new Date(a.chatInfo.lastMessage.createdAt).getTime() : 0;
                    const dateB = b.chatInfo?.lastMessage?.createdAt ? new Date(b.chatInfo.lastMessage.createdAt).getTime() : 0;
                    return dateB - dateA; // Más reciente primero
                  })
                  .map(({ friend, chatInfo }) => {
                    // Mostrar el nombre tal cual está en la base de datos (los usuarios pueden editarlo en su perfil)
                    const displayName = friend.name || 'Usuario';
                    
                    return (
                      <Link key={friend.id} href={`/messages/${friend.id}`} passHref>
                        <div className="flex items-center p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer gap-3">
                          {/* Avatar con badge pequeño opcional */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={friend.avatarUrl} alt={displayName} data-ai-hint="abstract person" />
                              <AvatarFallback className="text-xs">{(displayName.substring(0, 2)).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                          
                          {/* Contenido principal: nombre, badge, fecha */}
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                            {/* Nombre y badge alineados horizontalmente */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-medium truncate flex-1 ${chatInfo && chatInfo.unreadCount > 0 ? 'font-semibold' : ''}`}>
                                  {displayName}
                                </p>
                                {chatInfo && chatInfo.unreadCount > 0 && (
                                  <Badge className="h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center bg-red-500 text-white text-xs font-semibold flex-shrink-0 ml-1">
                                    {chatInfo.unreadCount > 9 ? '9+' : chatInfo.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {chatInfo?.lastMessage ? (
                                  <span className={chatInfo.unreadCount > 0 ? 'font-semibold text-foreground' : ''}>
                                    Mensaje de voz
                                  </span>
                                ) : (
                                  'Iniciar chat de voz'
                                )}
                              </p>
                            </div>
                            
                            {/* Fecha a la derecha */}
                            {chatInfo?.lastMessage && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                {new Date(chatInfo.lastMessage.createdAt).toLocaleDateString('es-ES', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                    </div>
                  </div>
                </Link>
                    );
                  })
          ) : (
            <div className="text-center py-10">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No hay usuarios disponibles</p>
              <p className="text-sm text-muted-foreground">
                    Aún no hay otros usuarios registrados en la plataforma.
              </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
