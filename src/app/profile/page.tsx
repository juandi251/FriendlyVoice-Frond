"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { 
  Settings, User as UserIcon, Mic, Lock, Database, LogOut, Loader2, Edit3, Users, Shield, LayoutGrid, Headphones 
} from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VozCard } from '@/components/voz-card';
import { CommentModal } from '@/components/comment-modal';
import { initialMockVoces } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import type { Voz, VozComment } from '@/types/friendly-voice';
import { useUserVoices } from '@/hooks/use-user-voices';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function ProfilePage() {
  const { user, loading, logout } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();
  const { getUserVoices, deleteVoice } = useUserVoices();
  const [ecosistemas, setEcosistemas] = useLocalStorage<any[]>('userEcosystems', []);
  const [ecosistemasState, setEcosistemasState] = useState<any[]>([]);

  const [userVoces, setUserVoces] = useState<Voz[]>([]);
  const [adminCounts, setAdminCounts] = useState<{ reports: number; abuses: number }>({ reports: 0, abuses: 0 });
  const [selectedVozForComments, setSelectedVozForComments] = useState<Voz | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      const voces = getUserVoices(user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUserVoces(voces);
    }
  }, [user, loading, router, getUserVoices]);

  // Sincronizar ecosistemas desde localStorage (actualizar cuando cambian)
  useEffect(() => {
    setEcosistemasState(ecosistemas);
  }, [ecosistemas]);

  // Listener para cambios en localStorage (sincronización cross-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userEcosystems' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          setEcosistemasState(updated);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const loadAdminCounts = async () => {
      if (!user || user.role !== 'admin') return;
      try {
        const reps = await getDocs(collection(db, 'reports'));
        const abs = await getDocs(collection(db, 'abuses'));
        setAdminCounts({ reports: reps.size, abuses: abs.size });
      } catch {
        // ignore
      }
    };
    loadAdminCounts();
  }, [user?.id, user?.role]);

  const handleLikeOnProfile = (vozId: string) => {
    setUserVoces(prevVoces =>
      prevVoces.map(v =>
        v.id === vozId
          ? { ...v, isLiked: !v.isLiked, likesCount: v.isLiked ? v.likesCount - 1 : v.likesCount + 1 }
          : v
      )
    );
    toast({ title: 'Me gusta', description: 'Funcionalidad de likes pendiente de backend.' });
  };
  
  const handleCommentOnProfile = (vozId: string) => {
    const voz = userVoces.find(v => v.id === vozId);
    if (voz) {
      setSelectedVozForComments(voz);
      setIsCommentModalOpen(true);
    }
  };

  const handleAddComment = async (vozId: string, text: string): Promise<void> => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para comentar.', variant: 'destructive' });
      return Promise.reject("User not logged in");
    }
    const newComment: VozComment = {
      id: `comment-${Date.now()}`,
      vozId,
      userId: user.id,
      userName: user.name ?? 'Usuario',
      userAvatarUrl: user.avatarUrl || undefined,
      text,
      createdAt: new Date().toISOString(),
    };
    setUserVoces(prevVoces =>
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
    if (selectedVozForComments?.id === vozId) {
      setSelectedVozForComments(prev => 
        prev ? { ...prev, comments: [...(prev.comments || []), newComment], commentsCount: (prev.commentsCount || 0) + 1 } : prev
      );
    }
    toast({ title: 'Comentario Añadido', description: 'Tu comentario ha sido publicado.' });
    return Promise.resolve();
  };

  const handleDeleteOwnVoz = (vozId: string) => {
    if (!user) return;
    deleteVoice(user.id, vozId);
    setUserVoces(prev => prev.filter(v => v.id !== vozId));
    toast({ title: 'Voz eliminada', description: 'Se ha eliminado la voz de tu lista.' });
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const followersCount = user.followers?.length || 0;
  const followingCount = user.following?.length || 0;

  // Combinar ecosistemas mock (para demo) con los creados por el usuario
  const mockJoinedEcosystems = [
    { id: 'eco1', name: 'Charlas de Tech Semanal', topic: 'Lo último en tecnología y desarrollo', participantCount: 120 },
    { id: 'eco2', name: 'Club de Lectura "Entre Líneas"', topic: 'Discusiones mensuales de libros', participantCount: 75 },
  ];
  // Usar ecosistemasState para reflejar cambios inmediatos
  const allEcosystems = [...ecosistemasState, ...mockJoinedEcosystems];

  const isAdmin = user.role === 'admin';
  const finalAvatarSrc = isAdmin
    ? 'https://api.dicebear.com/7.x/identicon/svg?seed=FriendlyVoice-Admin'
    : (user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.id || 'default'}`);
  const displayName = isAdmin ? 'FriendlyVoice' : (user.name || 'Usuario');
  const displaySub = isAdmin ? 'Administrador' : (user.bio || 'Usuario de FriendlyVoice');

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4">
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-blue-500 p-8 text-primary-foreground">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg flex items-center justify-center">
              {finalAvatarSrc ? (
                <Image
                  src={finalAvatarSrc}
                  alt={user.name || 'Avatar de Usuario'}
                  width={128}
                  height={128}
                  className="object-cover"
                  priority
                  unoptimized={true}
                />
              ) : (
                <UserIcon className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              {displayName}
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </CardTitle>
            {!isAdmin && (
              <CardDescription className="text-blue-100">{displaySub}</CardDescription>
            )}
            {user.bio && <p className="text-sm text-blue-50 mt-1">{user.bio}</p>}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-semibold">{followersCount}</p>
              <p className="text-sm text-muted-foreground">Seguidores</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{followingCount}</p>
              <p className="text-sm text-muted-foreground">Siguiendo</p>
            </div>
          </div>

          <Separator />

          {isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary flex items-center">
                <Shield className="mr-2 h-5 w-5" />Resumen de Administración
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Moderación</CardTitle>
                    <CardDescription>Eventos en la plataforma</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div>Reportes de contenido</div>
                      <div className="font-semibold">{adminCounts.reports}</div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>Abusos reportados</div>
                      <div className="font-semibold">{adminCounts.abuses}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Acciones rápidas</CardTitle>
                    <CardDescription>Accesos de administración</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Button asChild className="justify-start">
                      <Link href="/admin"><Shield className="mr-2 h-4 w-4" /> Abrir Panel de Administración</Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <Link href="/admin/notifications">Notificaciones de Moderación</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <Separator />
            </div>
          )}

          {!isAdmin && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-primary flex items-center">
              <Settings className="mr-2 h-5 w-5" />Intereses y Personalidad
            </h3>
            <div className="flex flex-wrap gap-2">
              {(user.hobbies && user.hobbies.length > 0 ? user.hobbies : ['Música', 'Tecnología', 'Creativo', 'Introvertido']).map(interest => (
                <Badge key={interest} variant="secondary" className="text-sm">{interest}</Badge>
              ))}
              {(user.personalityTags && user.personalityTags.length > 0) && user.personalityTags.map(tag => (
                <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
              ))}
            </div>
          </div>
          )}

          {!isAdmin && user.bioSoundUrl && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary flex items-center">
                <Mic className="mr-2 h-5 w-5" />Biografía Sonora
              </h3>
              <audio controls src={user.bioSoundUrl} className="w-full" />
            </div>
          )}

          <Separator />

          {!isAdmin && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center">
              <Mic className="mr-2 h-5 w-5" />Mis Voces Publicadas
            </h3>
            {userVoces.length > 0 ? (
              <div className="space-y-4">
                {userVoces.map(voz => (
                  <VozCard
                    key={voz.id}
                    voz={voz}
                    onLikeToggle={handleLikeOnProfile}
                    onOpenComments={handleCommentOnProfile}
                    onDelete={handleDeleteOwnVoz}
                    isOwn
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aún no has publicado ninguna voz.</p>
            )}
          </div>
          )}

          <Separator />

          {!isAdmin && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center">
              <LayoutGrid className="mr-2 h-5 w-5" />Mis Ecosistemas
            </h3>
            {allEcosystems.length > 0 ? (
              <div className="space-y-3">
                {allEcosystems.map(eco => (
                  <Link key={eco.id} href={`/ecosystems/${eco.id}`} passHref>
                    <div className="p-3 bg-muted rounded-md hover:bg-muted/80 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{eco.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Headphones className="mr-1.5 h-3 w-3" /> {eco.topic}
                          </p>
                        </div>
                        <Badge variant="outline">{eco.participantCount} part.</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no te has unido a ningún ecosistema.</p>
            )}
          </div>
          )}

          <Separator />

          <div className="space-y-2">
            {!isAdmin && (
              <>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/settings/preferences">
                    <Database className="mr-2 h-4 w-4" /> Preferencias y Almacenamiento
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/settings/voice-friends">
                    <Users className="mr-2 h-4 w-4" /> Gestionar Voces Amigas
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/settings/privacy-security">
                    <Shield className="mr-2 h-4 w-4" /> Privacidad y Seguridad
                  </Link>
                </Button>
              </>
            )}
          </div>

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 p-6 border-t">
          {!isAdmin && (
            <Button asChild variant="outline">
              <Link href="/profile/edit">
                <Edit3 className="mr-2 h-4 w-4" /> Editar Perfil
              </Link>
            </Button>
          )}
          <Button variant="destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
          </Button>
        </CardFooter>
      </Card>
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
    </div>
  );
}
