// src/components/voice-message-input.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Send, Loader2, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageInputProps {
  onSendMessage: (voiceDataUri: string) => Promise<void>;
}

export function VoiceMessageInput({ onSendMessage }: VoiceMessageInputProps) {
  const { status, startRecording, stopRecording, audioDataUri, error: recorderError, reset: resetRecorder, audioMimeType } = useAudioRecorder();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!audioDataUri) {
      toast({ title: 'Error', description: 'Por favor, graba tu voz primero.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendMessage(audioDataUri);
      toast({ title: '¡Mensaje Enviado!', description: 'Tu mensaje de voz ha sido enviado.' });
      resetRecorder();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo enviar el mensaje.';
      toast({ title: 'Error al Enviar', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    resetRecorder();
  }

  return (
    <div className="p-4 border-t bg-background sticky bottom-0">
      {audioDataUri && status === 'stopped' && (
        <div className="mb-3 p-3 bg-muted rounded-md text-center space-y-2">
          <CheckCircle className="mx-auto h-6 w-6 text-green-500" />
          <p className="text-sm font-medium">¡Grabación lista para enviar!</p>
          <audio controls className="w-full h-10">
            <source src={audioDataUri} type={audioMimeType || 'audio/webm'} />
          </audio>
        </div>
      )}

      {recorderError && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm flex items-center">
          <AlertTriangle className="mr-2 h-4 w-4" /> {recorderError}
        </div>
      )}
      
      <div className="flex items-center space-x-3">
        {status === 'idle' || status === 'stopped' || status === 'error' ? (
          <Button onClick={startRecording} disabled={isSubmitting} variant="outline" size="icon" aria-label="Grabar voz">
            <Mic className="h-5 w-5" />
          </Button>
        ) : null}

        {status === 'recording' ? (
          <Button onClick={stopRecording} disabled={isSubmitting} variant="destructive" size="icon" aria-label="Detener grabación">
            <StopCircle className="h-5 w-5" />
          </Button>
        ) : null}
        
        {status === 'recording' && (
            <p className="text-sm text-accent animate-pulse flex-grow">Grabando...</p>
        )}

        {audioDataUri && status === 'stopped' && (
          <>
            <Button onClick={handleReset} variant="ghost" size="icon" disabled={isSubmitting} aria-label="Grabar de nuevo">
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button onClick={handleSend} disabled={isSubmitting} size="icon" className="bg-accent hover:bg-accent/90" aria-label="Enviar mensaje">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </>
        )}
        
        {(!audioDataUri || status !== 'stopped') && status !== 'recording' && (
            <p className="text-sm text-muted-foreground flex-grow text-center">
                {status === 'error' ? 'Error de grabación. Intenta de nuevo.' : 'Pulsa el micrófono para grabar.'}
            </p>
        )}
      </div>
    </div>
  );
}
