// src/components/create-voz-form.tsx
'use client';

import type { Voz } from '@/types/friendly-voice';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Send, Loader2, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useUserVoices } from '@/hooks/use-user-voices';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface CreateVozFormProps {
  onVozCreated: (newVoz: Voz) => void;
}

export function CreateVozForm({ onVozCreated }: CreateVozFormProps) {
  const { user } = useAuth();
  const { status, startRecording, stopRecording, audioDataUri, error: recorderError, reset: resetRecorder, audioMimeType } = useAudioRecorder();
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { addVoice } = useUserVoices();

  // Eliminado selector de micrófono por requerimiento

  const handleSubmit = async () => {
    if (!audioDataUri) {
      toast({ title: 'Error', description: 'Por favor, graba tu voz primero.', variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión para publicar.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Subir a Firebase Storage y obtener URL reproducible
    let publicUrl: string = '';
    try {
      // Convertir Data URL a Blob
      const resp = await fetch(audioDataUri);
      const blob = await resp.blob();
      const fileExt = (blob.type && blob.type.includes('wav')) ? 'wav' : 'webm';
      const objectRef = ref(storage, `voices/${user.id}/${Date.now()}.${fileExt}`);
      await uploadBytes(objectRef, blob, { contentType: blob.type || (fileExt === 'wav' ? 'audio/wav' : 'audio/webm') });
      publicUrl = await getDownloadURL(objectRef);
    } catch (e) {
      // Si Storage falla, mantener Data URL para no bloquear la demo
      publicUrl = audioDataUri;
    }

    // Guardar en Firestore para tiempo real
    let firestoreDocId: string | null = null;
    try {
      const docRef = await addDoc(collection(db, 'voces'), {
        userId: user.id,
        userName: user.name ?? 'Usuario',
        userAvatarUrl: user.avatarUrl || undefined,
        audioUrl: publicUrl,
        caption: caption || undefined,
        likesCount: 0,
        commentsCount: 0,
        createdAt: new Date().toISOString(),
        createdAtTimestamp: Timestamp.now(),
        isLiked: false,
      });
      firestoreDocId = docRef.id;
    } catch (e) {
      console.warn('Error al guardar en Firestore, continuando con localStorage:', e);
    }

    const newVoz: Voz = {
      id: firestoreDocId || `voz-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      userId: user.id,
      userName: user.name ?? 'Usuario',
      userAvatarUrl: user.avatarUrl || undefined,
      audioUrl: publicUrl,
      caption: caption || undefined,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isLiked: false,
    };

    // Si se guardó en Firestore, la suscripción en tiempo real la agregará automáticamente
    // Solo agregar localmente si NO se guardó en Firestore
    if (!firestoreDocId) {
      onVozCreated(newVoz);
    }
    // Persistir en localStorage para el usuario actual
    addVoice(user.id, newVoz);
    toast({ title: '¡Voz Publicada!', description: 'Tu voz ha sido compartida con la comunidad.' });
    
    // Reset form
    setCaption('');
    resetRecorder();
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Crear una Nueva Voz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Escribe un mensaje para acompañar tu voz (opcional)..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          disabled={isSubmitting || status === 'recording'}
        />

        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 w-full">
            {status === 'idle' || status === 'stopped' || status === 'error' ? (
              <Button onClick={() => startRecording()} disabled={isSubmitting} variant="outline">
                <Mic className="mr-2" /> Grabar Voz
              </Button>
            ) : null}
            {status === 'recording' ? (
              <Button onClick={stopRecording} disabled={isSubmitting} variant="destructive">
                <StopCircle className="mr-2" /> Detener Grabación
              </Button>
            ) : null}
          </div>
          {status === 'recording' && (
            <p className="text-sm text-accent animate-pulse">Grabando...</p>
          )}
        </div>

        {audioDataUri && status === 'stopped' && (
          <div className="p-3 bg-muted rounded-md text-center space-y-2">
            <CheckCircle className="mx-auto h-6 w-6 text-green-500" />
            <p className="text-sm font-medium">¡Grabación lista!</p>
            <audio controls className="w-full h-10">
              <source src={audioDataUri} type={audioMimeType || 'audio/webm'} />
            </audio>
            <Button onClick={() => { resetRecorder(); setCaption('');}} variant="ghost" size="sm" disabled={isSubmitting}>
              <RotateCcw className="mr-2 h-4 w-4" /> Grabar de Nuevo / Borrar
            </Button>
          </div>
        )}
        
        {recorderError && (
          <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4" /> {recorderError}
          </div>
        )}

      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting || !audioDataUri || status === 'recording'} className="w-full">
          {isSubmitting ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
          Publicar Voz
        </Button>
      </CardFooter>
    </Card>
  );
}
