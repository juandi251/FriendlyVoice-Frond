// src/components/onboarding-form.tsx
// Componente para el formulario de onboarding (hobbies, biografía sonora, creación de avatar).

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Mic, StopCircle, Play, Save, CheckCircle, AlertTriangle, UserCheck, Upload, RotateCcw, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';

// Zod y React Hook Form para validación y manejo del formulario
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

// Audio recording hook (assuming it's defined in your project)
// IMPORTANT: This hook MUST return audioDataUri, status, error, reset, startRecording, stopRecording
// It should NOT return audioBlob or audioUrl directly, as we manage them locally here.
import { useAudioRecorder } from '@/hooks/use-audio-recorder'; 

// AI Flow (assuming it's defined in your project)
import { generateVoiceAvatar } from '@/ai/flows/generate-voice-avatar';
import type { GenerateVoiceAvatarInput } from '@/ai/flows/generate-voice-avatar';

// Firebase Storage imports
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase'; // Import storage service from firebase.ts

// Esquema de validación para el formulario de onboarding
const onboardingSchema = z.object({
  hobbies: z.string().min(3, { message: 'Por favor, introduce al menos un hobby.' }), // Hobbies como string separado por comas
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const { user, loading: authLoading, completeOnboarding, updateUserAvatar } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Destructure audioDataUri and status from useAudioRecorder
  const { status, startRecording, stopRecording, audioDataUri, error: recorderError, reset: resetRecorder } = useAudioRecorder(); 
  
  // Manage audioBlob and audioUrl locally based on audioDataUri
  const [localAudioBlob, setLocalAudioBlob] = useState<Blob | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);

  // Redirige si el usuario no está logueado o ya completó el onboarding
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && user.onboardingComplete) {
      router.push('/profile');
    }
    // Si el usuario tiene un avatar del registro (dicebear), muéstralo
    if (user?.avatarUrl && !generatedAvatarUrl) {
      setGeneratedAvatarUrl(user.avatarUrl);
    }
  }, [user, authLoading, router, generatedAvatarUrl]);

  // Effect to create Blob and URL when audioDataUri changes (i.e., after recording stops)
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


  // Inicializa el formulario con react-hook-form
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      hobbies: user?.hobbies?.join(', ') || '',
    },
  });

  // Funciones para la grabación de audio
  const handleStartRecording = async () => {
    if (user?.id) {
      resetRecorder();
      setAiError(null);
      try {
        await startRecording();
        toast({ title: "Grabando...", description: "Habla ahora para tu biografía sonora." });
      } catch (error) {
        // Error is already handled in the hook
        console.error('Error starting recording:', error);
      }
    } else {
      toast({ title: "Error", description: "Usuario no autenticado para grabar.", variant: "destructive" });
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
    }
  };

  // Función para subir el audio a Firebase Storage
  const uploadAudioToFirebaseStorage = async (blob: Blob, userId: string): Promise<string> => {
    const audioFileName = `voice_bios/${userId}_${Date.now()}.webm`;
    const audioStorageRef = ref(storage, audioFileName);

    try {
      toast({ title: "Subiendo audio...", description: "Tu biografía sonora se está subiendo.", duration: 3000 });
      const snapshot = await uploadBytes(audioStorageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);
      toast({ title: "Audio Subido", description: "Tu biografía sonora ha sido subida exitosamente." });
      return downloadURL;
    } catch (error: any) {
      console.error("Error al subir audio a Firebase Storage:", error);
      throw new Error(`Error al subir audio: ${error.message}`);
    }
  };

  // Función para simular la creación de avatar con IA
  const handleGenerateAvatar = async () => {
    if (!audioDataUri) {
      setAiError('Por favor, graba tu voz primero.');
      return;
    }
    if (!user) {
      setAiError('Usuario no encontrado. Por favor, inicia sesión de nuevo.');
      return;
    }

    setIsGeneratingAvatar(true);
    setAiError(null);

    try {
      const input: GenerateVoiceAvatarInput = { voiceDataUri: audioDataUri };
      const result = await generateVoiceAvatar(input);

      if (result.avatarDataUri) {
        setGeneratedAvatarUrl(result.avatarDataUri);
        toast({ title: '¡Avatar Generado!', description: 'Tu avatar de voz único está listo.' });
      } else {
        throw new Error('La IA no devolvió un avatar.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar el avatar.';
      setAiError(message);
      toast({ title: 'Falló la Generación de Avatar', description: message, variant: 'destructive' });
      setGeneratedAvatarUrl(user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.id || 'default'}`);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // Función que se ejecuta al enviar el formulario de onboarding
  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      router.push('/login');
      return;
    }
    
    setIsSavingOnboarding(true);
    try {
      let bioSoundFinalUrl: string = user.bioSoundUrl || '';
      
      // Solo subir audio si hay un blob disponible
      if (localAudioBlob) {
          bioSoundFinalUrl = await uploadAudioToFirebaseStorage(localAudioBlob, user.id);
      }
      // Si no hay audio, dejarlo vacío (es opcional)

      const finalAvatarForComplete = generatedAvatarUrl || user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.id || 'default'}`;

      const hobbiesArray = data.hobbies.split(',').map(hobby => hobby.trim()).filter(hobby => hobby.length > 0);

      await completeOnboarding({
        hobbies: hobbiesArray,
        bioSoundUrl: bioSoundFinalUrl,
        avatarUrl: finalAvatarForComplete,
      });

      toast({ title: "Onboarding Completo", description: "¡Tu perfil está listo! Redirigiendo...", variant: null });
    } catch (error: any) {
      console.error("Error al completar onboarding:", error);
      toast({
        title: 'Error al Completar Onboarding',
        description: error.message || 'No se pudo guardar tu información. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingOnboarding(false);
    }
  };

  // Condición para deshabilitar el botón de "Completar Perfil"
  // Desglosada para ayudar a TypeScript con la inferencia de tipos
  // La clave es que 'status' es una unión de tipos, y TypeScript a veces se confunde en cadenas OR.
  // Al usar una variable booleana simple, evitamos la inferencia compleja.
  const isRecordingActive = status === 'recording'; // Variable booleana simple
  const isCompleteButtonDisabled = 
    isSavingOnboarding || 
    isGeneratingAvatar || 
    isRecordingActive; // Usamos la variable simple aquí
    // Nota: Ya no requerimos avatar generado, el usuario puede usar el avatar por defecto

  // Muestra cargador si el usuario no ha cargado o no está autenticado
  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Si el onboarding ya está completo, muestra un mensaje (la redirección se maneja en useEffect)
  if (user.onboardingComplete) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">¡Bienvenido a FriendlyVoice!</CardTitle>
        <CardDescription>
          Para personalizar tu experiencia, cuéntanos un poco más sobre ti y crea tu avatar de voz único.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sección de Grabación de Voz para Avatar */}
            <div className="space-y-2 text-center">
              <FormLabel className="text-lg font-semibold">Crea tu Avatar con tu Voz (Opcional)</FormLabel>
              <CardDescription>
                Graba una breve biografía sonora (aprox. 5-10 segundos) diciendo "Hola, soy [tu nombre] y me gusta..."
                ¡Usaremos IA para generar un avatar abstracto único que represente tu voz!
                Si no tienes micrófono, puedes omitir este paso.
              </CardDescription>
              {/* Previsualización del Avatar */}
              <div className="flex flex-col items-center space-y-4 pt-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-md flex items-center justify-center">
                  <Image 
                    src={generatedAvatarUrl || user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.id || 'default'}`} 
                    alt="Tu Avatar" 
                    width={128} 
                    height={128} 
                    className="object-cover" 
                    data-ai-hint="abstract geometric" 
                    priority
                  />
                </div>
                {isGeneratingAvatar && <Progress value={undefined} className="w-full max-w-xs h-2 animate-pulse mt-2" />}
                {aiError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> {aiError}
                  </p>
                )}
              </div>

              {/* Error del grabador de audio */}
              {recorderError && (
                <div className="bg-destructive/10 border border-destructive rounded-md p-3 mt-2">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" /> 
                    <span>{recorderError}</span>
                  </p>
                </div>
              )}

              {/* Controles de Grabación */}
              <div className="flex justify-center gap-4 mt-4">
                <Button 
                  type="button" 
                  onClick={handleStartRecording} 
                  disabled={isRecordingActive || isGeneratingAvatar || isSavingOnboarding} 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isRecordingActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isRecordingActive ? 'Grabando...' : 'Grabar Voz'}
                </Button>
                <Button 
                  type="button" 
                  onClick={handleStopRecording} 
                  disabled={!isRecordingActive || isGeneratingAvatar || isSavingOnboarding} 
                  variant="destructive"
                >
                  <StopCircle className="mr-2 h-4 w-4" /> Detener
                </Button>
                {localAudioUrl && status === 'stopped' && (
                  <Button 
                    type="button" 
                    onClick={handlePlayRecording} 
                    disabled={isRecordingActive || isGeneratingAvatar || isSavingOnboarding} 
                    variant="outline"
                  >
                    <Play className="mr-2 h-4 w-4" /> Reproducir
                  </Button>
                )}
              </div>
              {isRecordingActive && (
                <p className="text-sm text-accent animate-pulse">Grabando... ¡Habla claro!</p>
              )}
              {localAudioUrl && status === 'stopped' && !generatedAvatarUrl && (
                <div className="flex justify-center pt-2">
                  <Button 
                    type="button" 
                    onClick={handleGenerateAvatar} 
                    disabled={isGeneratingAvatar || !localAudioBlob || isSavingOnboarding} 
                    className="bg-accent hover:bg-accent/90"
                  >
                    {isGeneratingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Generar Avatar
                  </Button>
                  <Button type="button" onClick={resetRecorder} variant="ghost" size="sm" disabled={isGeneratingAvatar || isSavingOnboarding}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Grabar de Nuevo
                  </Button>
                </div>
              )}
              {generatedAvatarUrl && !isGeneratingAvatar && (
                <p className="text-sm text-green-500 flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4" /> ¡Avatar generado!
                </p>
              )}
              
              {/* Botón para omitir la grabación de voz */}
              {!localAudioUrl && status !== 'recording' && (
                <div className="pt-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                    💡 <strong>¿No tienes micrófono?</strong> No te preocupes, puedes completar tu perfil ahora y agregar tu biografía sonora más tarde desde <strong>Editar Perfil</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Campo de Hobbies */}
            <FormField
              control={form.control}
              name="hobbies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tus Hobbies (separados por comas)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Música, Lectura, Videojuegos" {...field} />
                  </FormControl>
                  <FormDescription>
                    Esto nos ayudará a conectarte con personas con intereses similares.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isCompleteButtonDisabled}>
              {isSavingOnboarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Completar Perfil
              {isSavingOnboarding && <span className="ml-2">Guardando...</span>}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
