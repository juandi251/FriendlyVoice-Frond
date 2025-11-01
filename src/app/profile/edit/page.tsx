'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Mic, StopCircle, Play, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

// Audio recording hook
import { useAudioRecorder } from '@/hooks/use-audio-recorder';

// Firebase Storage imports
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const profileSchema = z.object({
  name: z.string()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
    .max(50, { message: 'El nombre no puede exceder 50 caracteres.' })
    .refine((val) => val.trim().length >= 2, { message: 'El nombre no puede estar vacío.' }),
  bio: z.string().max(200, { message: 'La biografía no puede exceder 200 caracteres.' }).optional(),
  hobbies: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, loading: authLoading, updateUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { status, startRecording, stopRecording, audioDataUri, error: recorderError, reset: resetRecorder } = useAudioRecorder();
  
  const [localAudioBlob, setLocalAudioBlob] = useState<Blob | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Redirect if not authenticated (handled in useEffect to avoid render issues)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Effect to create Blob and URL when audioDataUri changes
  useEffect(() => {
    if (audioDataUri && status === 'stopped') {
      const byteString = atob(audioDataUri.split(',')[1]);
      const mimeString = audioDataUri.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      setLocalAudioBlob(blob);
      setLocalAudioUrl(URL.createObjectURL(blob));
    } else if (status === 'idle' || status === 'recording') {
      setLocalAudioBlob(null);
      setLocalAudioUrl(null);
    }
  }, [audioDataUri, status]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      hobbies: user?.hobbies?.join(', ') || '',
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        bio: user.bio || '',
        hobbies: user.hobbies?.join(', ') || '',
      });
    }
  }, [user, form]);

  const handleStartRecording = async () => {
    if (user?.id) {
      resetRecorder();
      try {
        await startRecording();
        toast({ title: "Grabando...", description: "Habla ahora para tu biografía sonora." });
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    toast({ title: "Grabación finalizada.", description: "Puedes reproducir tu biografía sonora." });
  };

  const handlePlayRecording = () => {
    if (localAudioUrl) {
      const audio = new Audio(localAudioUrl);
      audio.play();
      toast({ title: "Reproduciendo...", description: "Escucha tu grabación." });
    } else if (user?.bioSoundUrl) {
      const audio = new Audio(user.bioSoundUrl);
      audio.play();
      toast({ title: "Reproduciendo...", description: "Escucha tu biografía sonora actual." });
    }
  };

  const uploadAudioToFirebaseStorage = async (blob: Blob, userId: string): Promise<string> => {
    const audioFileName = `voice_bios/${userId}_${Date.now()}.webm`;
    const audioStorageRef = ref(storage, audioFileName);

    try {
      setIsUploadingAudio(true);
      toast({ title: "Subiendo audio...", description: "Tu biografía sonora se está subiendo.", duration: 3000 });
      const snapshot = await uploadBytes(audioStorageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      toast({ title: "Audio Subido", description: "Tu biografía sonora ha sido subida exitosamente." });
      return downloadURL;
    } catch (error: any) {
      console.error("Error al subir audio a Firebase Storage:", error);
      throw new Error(`Error al subir audio: ${error.message}`);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleDeleteAudio = async () => {
    if (!user?.bioSoundUrl) return;

    try {
      // Delete from Firebase Storage if it's a Firebase URL
      if (user.bioSoundUrl.includes('firebasestorage.googleapis.com')) {
        const audioRef = ref(storage, user.bioSoundUrl);
        await deleteObject(audioRef);
      }

      await updateUserProfile({ bioSoundUrl: '' });
      toast({ title: "Audio eliminado", description: "Tu biografía sonora ha sido eliminada." });
    } catch (error: any) {
      console.error("Error al eliminar audio:", error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el audio. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);
    try {
      let bioSoundFinalUrl: string = user.bioSoundUrl || '';

      // Upload new audio if recorded
      if (localAudioBlob) {
        bioSoundFinalUrl = await uploadAudioToFirebaseStorage(localAudioBlob, user.id);
      }

      const hobbiesArray = data.hobbies 
        ? data.hobbies.split(',').map(hobby => hobby.trim()).filter(hobby => hobby.length > 0)
        : [];

      await updateUserProfile({
        name: data.name,
        bio: data.bio || '',
        hobbies: hobbiesArray,
        bioSoundUrl: bioSoundFinalUrl,
      });

      toast({ title: "Perfil actualizado", description: "Tus cambios han sido guardados exitosamente." });
      router.push('/profile');
    } catch (error: any) {
      console.error("Error al actualizar perfil:", error);
      toast({
        title: 'Error al actualizar perfil',
        description: error.message || 'No se pudo guardar tu información. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isRecordingActive = status === 'recording';

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/profile">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Perfil
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Editar Perfil</CardTitle>
          <CardDescription>
            Actualiza tu información personal y biografía sonora
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-md flex items-center justify-center">
                  <Image 
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.id || 'default'}`} 
                    alt="Tu Avatar" 
                    width={128} 
                    height={128} 
                    className="object-cover" 
                    priority
                    unoptimized={true}
                  />
                </div>
              </div>

              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre o nickname (ej: Juan, juandi23156, Juan Díaz)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Puedes usar tu nombre real, un nickname, o cualquier combinación que prefieras (mínimo 2 caracteres, máximo 50).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio Field */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografía</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Cuéntanos sobre ti..." 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo 200 caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hobbies Field */}
              <FormField
                control={form.control}
                name="hobbies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hobbies (separados por comas)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Música, Lectura, Videojuegos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Voice Bio Section */}
              <div className="space-y-4 border-t pt-6">
                <div>
                  <FormLabel className="text-lg font-semibold">Biografía Sonora</FormLabel>
                  <p className="text-sm text-muted-foreground mt-1">
                    Graba una breve presentación de voz (5-10 segundos)
                  </p>
                </div>

                {/* Current Audio */}
                {user.bioSoundUrl && !localAudioUrl && (
                  <div className="bg-muted p-4 rounded-md space-y-2">
                    <p className="text-sm font-medium">Audio actual:</p>
                    <audio controls src={user.bioSoundUrl} className="w-full" />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteAudio}
                      disabled={isSaving || isUploadingAudio}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar Audio
                    </Button>
                  </div>
                )}

                {/* Error del grabador */}
                {recorderError && (
                  <div className="bg-destructive/10 border border-destructive rounded-md p-3">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" /> 
                      <span>{recorderError}</span>
                    </p>
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    onClick={handleStartRecording} 
                    disabled={isRecordingActive || isSaving || isUploadingAudio} 
                    variant="outline"
                  >
                    {isRecordingActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isRecordingActive ? 'Grabando...' : 'Grabar Nuevo Audio'}
                  </Button>
                  
                  <Button 
                    type="button" 
                    onClick={handleStopRecording} 
                    disabled={!isRecordingActive || isSaving || isUploadingAudio} 
                    variant="destructive"
                  >
                    <StopCircle className="mr-2 h-4 w-4" /> Detener
                  </Button>
                  
                  <Button 
                    type="button" 
                    onClick={handlePlayRecording} 
                    disabled={(!localAudioUrl && !user.bioSoundUrl) || isRecordingActive || isSaving || isUploadingAudio} 
                    variant="outline"
                  >
                    <Play className="mr-2 h-4 w-4" /> Reproducir
                  </Button>
                </div>

                {isRecordingActive && (
                  <p className="text-sm text-accent animate-pulse">Grabando... ¡Habla claro!</p>
                )}

                {localAudioUrl && status === 'stopped' && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ Nuevo audio grabado. Guarda los cambios para actualizar tu perfil.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSaving || isUploadingAudio || isRecordingActive}
                >
                  {isSaving || isUploadingAudio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving || isUploadingAudio ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button asChild type="button" variant="outline" disabled={isSaving || isUploadingAudio}>
                  <Link href="/profile">
                    Cancelar
                  </Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
