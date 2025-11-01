'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import type { User, Voz } from '@/types/friendly-voice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VozCard } from '@/components/voz-card';
import { initialMockVoces } from '@/lib/mock-data';
import { Loader2, UserPlus, UserMinus, Mic, MessageSquareText, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading, followUser, unfollowUser, isFollowing, getUserById } = useAuth();
  const { toast } = useToast();
  
  // Validar que userId sea string o undefined
  const userId = typeof params.userId === 'string' ? params.userId : undefined;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userVoces, setUserVoces] = useState<Voz[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Log para debugging
  useEffect(() => {
    console.log('userId param:', userId);
  }, [userId]);

  useEffect(() => {
    if (authLoading) return; 

    if (!userId) {
      setIsLoadingProfile(false);
      return;
    }

    if (currentUser && currentUser.id === userId) {
      console.log('Navegando a /profile porque el usuario está viendo su propio perfil');
      router.replace('/profile');
      return;
    }
    
    (async () => {
      try {
        const fetchedUser = await getUserById(userId);
        if (fetchedUser) {
          setProfileUser(fetchedUser);
          const voces = initialMockVoces.filter(v => v.userId === userId)
                                       .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setUserVoces(voces);
        } else {
          // Si getUserById retorna undefined, el usuario no existe
          toast({ title: 'Perfil no encontrado', description: 'El usuario que buscas no existe o no está disponible.', variant: 'destructive' });
        }
      } catch (error: any) {
        console.error('Error al cargar perfil:', error);
        toast({ title: 'Error', description: 'No se pudo cargar el perfil. Intenta de nuevo.', variant: 'destructive' });
      } finally {
        setIsLoadingProfile(false);
      }
    })();
  }, [userId, authLoading, currentUser, router, getUserById, toast]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser) return;
    
    try {
      if (isFollowing(profileUser.id)) {
        await unfollowUser(profileUser.id);
        toast({ title: 'Dejaste de seguir', description: `Ya no sigues a ${profileUser.name}.` });
      } else {
        await followUser(profileUser.id);
        toast({ title: 'Ahora sigues a', description: `Empezaste a seguir a ${profileUser.name}.` });
      }
      const updatedProfileUser = await getUserById(profileUser.id);
      if (updatedProfileUser) setProfileUser(updatedProfileUser);

    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo completar la acción.', variant: 'destructive' });
    }
  };

  const handleLikeOnProfile = (vozId: string) => {
    setUserVoces(prevVoces =>
      prevVoces.map(v =>
        v.id === vozId
          ? { ...v, isLiked: !v.isLiked, likesCount: v.isLiked ? v.likesCount - 1 : v.likesCount + 1 }
          : v
      )
    );
  };
  const handleCommentOnProfile = (vozId: string) => {
     // Los comentarios se abren desde el feed, no desde el perfil de otro usuario
    toast({ title: 'Comentarios', description: 'Abre esta publicación desde el feed para comentar.'});
  };

  // Función para botón Volver que hace fallback a /profile si no hay historial
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/profile');
    }
  };

  if (authLoading || isLoadingProfile) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center p-4">
        <h2 className="text-2xl font-semibold mb-2">Perfil no Encontrado</h2>
        <p className="text-muted-foreground mb-6">El usuario que estás buscando no existe o no está disponible.</p>
        <Button onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }
  
  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
       <Button variant="outline" onClick={handleBack} className="mb-4 self-start">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
      </Button>
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-secondary to-muted p-8">
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name ?? 'Usuario'} data-ai-hint="abstract person" />
              <AvatarFallback>{(profileUser.name ?? 'US').substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl font-bold text-primary">{profileUser.name ?? 'Usuario'}</CardTitle>
            <CardDescription className="text-muted-foreground">{profileUser.bio || 'Usuario de FriendlyVoice'}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-2xl font-semibold">{profileUser.followers?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Seguidores</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{profileUser.following?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Siguiendo</p>
            </div>
          </div>

          {!isOwnProfile && currentUser && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleFollowToggle} className="flex-1">
                {isFollowing(profileUser.id) ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isFollowing(profileUser.id) ? 'Dejar de Seguir' : 'Seguir'}
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/messages/${profileUser.id}`}>
                  <MessageSquareText className="mr-2 h-4 w-4" /> Enviar Mensaje de Voz
                </Link>
              </Button>
            </div>
          )}
          {!currentUser && (
            <p className="text-center text-sm text-muted-foreground"> 
              <Link href="/login" className="underline text-primary">Inicia sesión</Link> para interactuar con este perfil.
            </p>
          )}

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-2 text-primary">Intereses</h3>
            <div className="flex flex-wrap gap-2">
              {(profileUser.interests?.length ? profileUser.interests : ['No especificado']).map(interest => (
                <Badge key={interest} variant="secondary" className="text-sm">{interest}</Badge>
              ))}
            </div>
          </div>
          
          {profileUser.personalityTags && profileUser.personalityTags.length > 0 && (
             <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Etiquetas de Personalidad</h3>
                <div className="flex flex-wrap gap-2">
                {profileUser.personalityTags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
                ))}
                </div>
            </div>
          )}

          {profileUser.bioSoundUrl && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary flex items-center"><Mic className="mr-2 h-5 w-5" />Biografía Sonora</h3>
              <audio controls src={profileUser.bioSoundUrl} className="w-full" />
            </div>
          )}
          
          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center"><Mic className="mr-2 h-5 w-5" />Voces de {profileUser.name}</h3>
            {userVoces.length > 0 ? (
              <div className="space-y-4">
                {userVoces.map(voz => (
                  <VozCard key={voz.id} voz={voz} onLikeToggle={handleLikeOnProfile} onOpenComments={handleCommentOnProfile} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Este usuario aún no ha publicado ninguna voz.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
