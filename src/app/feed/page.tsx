// src/app/feed/page.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Voz, VozComment, User } from '@/types/friendly-voice';
import { CreateVozForm } from '@/components/create-voz-form';
import { VozCard } from '@/components/voz-card';
import { CommentModal } from '@/components/comment-modal';
import { ReportModal } from '@/components/report-modal';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Users, Rss, EyeOff, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { initialMockVoces as allMockVoces } from '@/lib/mock-data'; // Import all mock voces
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function FeedPage() {
  const { user, loading: authLoading, getUserById } = useAuth();
  const { toast } = useToast();
  const [voces, setVoces] = useState<Voz[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  const [selectedVozForComments, setSelectedVozForComments] = useState<Voz | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedVozForReport, setSelectedVozForReport] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Helper to load hidden IDs from localStorage
  const loadHiddenIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem('hiddenVozIds');
      if (!raw) return new Set();
      return new Set<string>(JSON.parse(raw));
    } catch { return new Set(); }
  };

  const saveHiddenIds = (setIds: Set<string>) => {
    try { localStorage.setItem('hiddenVozIds', JSON.stringify(Array.from(setIds))); } catch {}
  };

  useEffect(() => {
    setIsLoadingFeed(true);
    
    // Solo usar voces reales de Firestore - las voces mock fueron eliminadas para mantener coherencia
    let feedVoces: Voz[] = [];
    
    // Suscripción en tiempo real a Firestore (si existe colección 'voces')
    let unsubscribe: (() => void) | null = null;
    try {
      // Intentar con timestamp primero, si falla usar sin ordenamiento y ordenar en cliente
      unsubscribe = onSnapshot(
        collection(db, 'voces'),
        (snapshot) => {
          const firestoreVoces: Voz[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as Voz));
          
          // Ordenar por fecha en cliente (más robusto que depender de índices)
          firestoreVoces.sort((a, b) => {
            const aTime = a.createdAtTimestamp?.toDate?.() || new Date(a.createdAt || 0);
            const bTime = b.createdAtTimestamp?.toDate?.() || new Date(b.createdAt || 0);
            return bTime.getTime() - aTime.getTime();
          });
          
          // Combinar voces de Firestore con mock data
          const combinedVoces = [...firestoreVoces, ...feedVoces];
          
          // Eliminar duplicados por ID
          const uniqueVoces = Array.from(
            new Map(combinedVoces.map(v => [v.id, v])).values()
          );
          
          // Apply stored hidden flags
          const hiddenIds = loadHiddenIds();
          let processedVoces = uniqueVoces.map(v => hiddenIds.has(v.id) ? { ...v, hidden: true } : v);

          if (user && user.following && user.following.length > 0) {
            // Prioritize voces from followed users
            processedVoces.sort((a, b) => {
              const aIsFollowed = user.following!.includes(a.userId);
              const bIsFollowed = user.following!.includes(b.userId);
              if (aIsFollowed && !bIsFollowed) return -1;
              if (!aIsFollowed && bIsFollowed) return 1;
              const aTime = a.createdAtTimestamp?.toDate?.() || new Date(a.createdAt || 0);
              const bTime = b.createdAtTimestamp?.toDate?.() || new Date(b.createdAt || 0);
              return bTime.getTime() - aTime.getTime();
            });
          } else {
            // Default sort by date
            processedVoces.sort((a, b) => {
              const aTime = a.createdAtTimestamp?.toDate?.() || new Date(a.createdAt || 0);
              const bTime = b.createdAtTimestamp?.toDate?.() || new Date(b.createdAt || 0);
              return bTime.getTime() - aTime.getTime();
            });
          }
          
          // If not admin, filter out hidden voices
          const isAdmin = user?.role === 'admin';
          const visibleVoces = isAdmin ? processedVoces : processedVoces.filter(v => !v.hidden);

          setVoces(visibleVoces);
          setIsLoadingFeed(false);
        },
        (error) => {
          // Si Firestore falla (ej: no hay índice), usar solo mock data
          console.warn('Error en suscripción Firestore, usando datos mock:', error);
          let processedVoces = feedVoces.map(v => loadHiddenIds().has(v.id) ? { ...v, hidden: true } : v);
          processedVoces.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setVoces(processedVoces);
          setIsLoadingFeed(false);
        }
      );
    } catch (e) {
      // Si la suscripción falla al iniciar, usar mock data
      console.warn('Error al iniciar suscripción Firestore, usando datos mock:', e);
      let processedVoces = feedVoces.map(v => loadHiddenIds().has(v.id) ? { ...v, hidden: true } : v);
      processedVoces.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setVoces(processedVoces);
      setIsLoadingFeed(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]); // Re-fetch when user changes

  const handleVozCreated = (newVoz: Voz) => {
    setVoces(prevVoces => [newVoz, ...prevVoces]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())); // Re-sort after adding
      // Re-apply following sort if needed
      if (user && user.following && user.following.length > 0) {
         setVoces(prevVoces => [...prevVoces].sort((a,b) => {
             const aIsFollowed = user.following!.includes(a.userId);
             const bIsFollowed = user.following!.includes(b.userId);
             if (aIsFollowed && !bIsFollowed) return -1;
             if (!aIsFollowed && bIsFollowed) return 1;
             return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
         }));
      }
  };

  const toggleHide = (vozId: string) => {
    setVoces(prev => {
      const next = prev.map(v => v.id === vozId ? { ...v, hidden: !v.hidden } : v);
      // Persist hidden state
      const ids = loadHiddenIds();
      const target = next.find(v => v.id === vozId);
      if (target?.hidden) ids.add(vozId); else ids.delete(vozId);
      saveHiddenIds(ids);
      return next;
    });
  };

  const handleLikeToggle = (vozId: string) => {
    setVoces(prevVoces =>
      prevVoces.map(v =>
        v.id === vozId
          ? { ...v, isLiked: !v.isLiked, likesCount: v.isLiked ? v.likesCount - 1 : v.likesCount + 1 }
          : v
      )
    );
  };

  const handleOpenComments = (vozId: string) => {
    const voz = voces.find(v => v.id === vozId);
    if (voz) {
      setSelectedVozForComments(voz);
      setIsCommentModalOpen(true);
    }
  };

  const handleReport = (vozId: string) => {
    console.log('handleReport called with vozId:', vozId);
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para reportar.', variant: 'destructive' });
      return;
    }
    if (!vozId || vozId.trim() === '') {
      console.error('handleReport: vozId está vacío', vozId);
      toast({ 
        title: 'Error', 
        description: 'No se pudo identificar la publicación a reportar.', 
        variant: 'destructive' 
      });
      return;
    }
    console.log('handleReport: setting selectedVozForReport and opening modal', { vozId, user: user.id });
    setSelectedVozForReport(vozId);
    setIsReportModalOpen(true);
    console.log('handleReport: modal state updated');
  };

  const handleConfirmReport = async (vozId: string, motivo: string, mensaje: string) => {
    console.log('handleConfirmReport: llamado con', { vozId, motivo, mensaje, userId: user?.id });
    
    try {
      // Verificar el usuario actual en el momento de enviar
      if (!user || !user.id) {
        console.error('handleConfirmReport: usuario no encontrado', user);
        toast({ 
          title: 'Error', 
          description: 'Debes iniciar sesión para reportar. Por favor, recarga la página.', 
          variant: 'destructive' 
        });
        setIsReportModalOpen(false);
        setSelectedVozForReport(null);
        throw new Error('Usuario no autenticado');
      }

      // Verificar que tenemos el vozId
      if (!vozId || vozId.trim() === '') {
        console.error('handleConfirmReport: vozId no válido', vozId);
        toast({ 
          title: 'Error', 
          description: 'No se pudo identificar la publicación a reportar. Por favor, intenta nuevamente.', 
          variant: 'destructive' 
        });
        setIsReportModalOpen(false);
        setSelectedVozForReport(null);
        throw new Error('vozId no válido');
      }

      // Mapear el valor del motivo al label que se mostrará en admin
      const motivoLabels: Record<string, string> = {
        'abuso': 'Abuso',
        'hiriente': 'Mensaje hiriente',
        'inapropiado': 'Contenido inapropiado',
        'spam': 'Spam',
        'desinformacion': 'Desinformación',
        'violencia': 'Contenido violento',
        'otro': 'Otro'
      };
      const motivoLabel = motivoLabels[motivo] || motivo;

      console.log('handleConfirmReport: enviando reporte al backend', {
        vozId,
        userId: user.id,
        motivo: motivoLabel,
        mensaje: mensaje || null
      });

      // Enviar el reporte al backend
      await api.post('/api/reportes', {
        vozId: vozId,
        userId: user.id,
        motivo: motivoLabel,
        mensaje: mensaje || null
      });

      console.log('handleConfirmReport: reporte enviado exitosamente');
      toast({ 
        title: 'Reporte Enviado', 
        description: 'Tu reporte ha sido registrado. El administrador lo revisará pronto.' 
      });
      
      // Cerrar el modal después de enviar exitosamente
      setIsReportModalOpen(false);
      setSelectedVozForReport(null);
    } catch (error: any) {
      console.error('handleConfirmReport: error al enviar reporte', error);
      toast({ 
        title: 'Error al Reportar', 
        description: error.message || 'No se pudo enviar el reporte. Por favor, intenta nuevamente.', 
        variant: 'destructive' 
      });
      // Re-throw para que el modal sepa que hubo un error
      throw error;
    }
  };

  const handleAddComment = async (vozId: string, text: string): Promise<void> => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para comentar.', variant: 'destructive'});
      return Promise.reject("User not logged in");
    }
    // Simulate API call for adding comment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newComment: VozComment = {
      id: `comment-${Date.now()}`,
      vozId,
      userId: user.id,
      userName: user.name ?? 'Usuario',
      userAvatarUrl: user.avatarUrl || undefined,
      text,
      createdAt: new Date().toISOString(),
    };

    setVoces(prevVoces =>
      prevVoces.map(v =>
        v.id === vozId
          ? { 
              ...v, 
              comments: [...(v.comments || []), newComment],
              commentsCount: (v.commentsCount || 0) + 1,
            }
          : v
      )
    );
    // Update selectedVozForComments if it's the one being commented on
    setSelectedVozForComments(prevSelected => 
      prevSelected && prevSelected.id === vozId 
      ? { ...prevSelected, comments: [...(prevSelected.comments || []), newComment], commentsCount: (prevSelected.commentsCount || 0) + 1 } 
      : prevSelected
    );
    toast({ title: 'Comentario Añadido', description: 'Tu comentario ha sido publicado.' });
    return Promise.resolve();
  };


  if (authLoading) {
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
        <h2 className="text-2xl font-semibold mb-2">Únete a la Conversación</h2>
        <p className="text-muted-foreground mb-6">Inicia sesión o crea una cuenta para ver y compartir voces.</p>
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/signup">Registrarse</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <h1 className="text-3xl font-bold text-primary mb-6 flex items-center">
        <Rss className="mr-3 h-8 w-8" /> Voces Recientes
      </h1>
      
      <CreateVozForm onVozCreated={handleVozCreated} />

      {isLoadingFeed && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Cargando voces...</p>
        </div>
      )}

      {!isLoadingFeed && voces.length === 0 && (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">Aún no hay voces. ¡Sé el primero en publicar o sigue a otros usuarios!</p>
        </div>
      )}

      {!isLoadingFeed && voces.length > 0 && (
        <div className="space-y-6">
          {voces.map(voz => (
            <div key={voz.id || `voz-${voz.userId}-${Date.now()}`} className="space-y-2">
              {/* Admin moderation header */}
              {user?.role === 'admin' && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {voz.reported && (
                      <Badge variant="outline" className="border-red-500 text-red-600">Reportada</Badge>
                    )}
                    {voz.hidden && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">Oculta</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => toggleHide(voz.id)}>
                      {voz.hidden ? (<><Eye className="h-4 w-4 mr-1"/>Mostrar</>) : (<><EyeOff className="h-4 w-4 mr-1"/>Ocultar</>)}
                    </Button>
                  </div>
                </div>
              )}
              <VozCard voz={voz} onLikeToggle={handleLikeToggle} onOpenComments={handleOpenComments} onReport={handleReport} />
            </div>
          ))}
        </div>
      )}

      {selectedVozForComments && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          voz={selectedVozForComments}
          comments={selectedVozForComments.comments || []}
          onAddComment={handleAddComment}
          currentUser={user}
        />
      )}

      <ReportModal
        isOpen={isReportModalOpen && !!selectedVozForReport}
        onClose={() => {
          console.log('ReportModal onClose called');
          setIsReportModalOpen(false);
          setSelectedVozForReport(null);
        }}
        onConfirm={handleConfirmReport}
        vozId={selectedVozForReport || ''}
      />
    </div>
  );
}
