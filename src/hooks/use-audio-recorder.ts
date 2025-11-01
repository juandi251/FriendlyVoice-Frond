'use client';

import { useState, useRef, useCallback } from 'react';

type RecordingStatus = 'idle' | 'recording' | 'stopped' | 'error';

interface AudioRecorderControls {
  status: RecordingStatus;
  startRecording: (deviceId?: string) => Promise<void>;
  stopRecording: () => void;
  audioDataUri: string | null;
  error: string | null;
  reset: () => void;
  audioMimeType?: string;
}

export function useAudioRecorder(): AudioRecorderControls {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string | undefined>(undefined);
  const setMimeType = (mt?: string) => { mimeTypeRef.current = mt; };

  const startRecording = useCallback(async (deviceId?: string) => {
    if (status === 'recording') return;
    setError(null);
    setAudioDataUri(null);
    audioChunksRef.current = [];
    setStatus('recording');

    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta grabación de audio. Por favor, usa Chrome, Firefox o Edge.');
      }

      // Check for microphone devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      if (audioInputs.length === 0) {
        throw new Error('No se detectó ningún micrófono. Por favor, conecta un micrófono e intenta de nuevo.');
      }

      // Estrategia de fallback: intentar con restricciones mínimas primero
      let stream: MediaStream;
      try {
        // Intento 1: Configuración mínima - solo audio, sin restricciones estrictas
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: deviceId ? { deviceId: { ideal: deviceId } } : true
        });
      } catch (e1: any) {
        try {
          // Intento 2: Si el deviceId específico falla, intentar sin especificar dispositivo
          if (deviceId) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } else {
            throw e1;
          }
        } catch (e2) {
          // Intento 3: Intentar con restricciones básicas (channelCount solo como ideal)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { 
                channelCount: { ideal: 1 },
                ...(deviceId ? { deviceId: { ideal: deviceId } } : {})
              }
            });
          } catch (e3) {
            // Intento 4: Si es NotReadableError/Could not start audio source, iterar por cada deviceId disponible
            const isStartErr = (msg: string) => /NotReadableError|Could not start audio source/i.test(msg);
            if (e1 && isStartErr(String(e1?.message || e1))) {
              let acquired: MediaStream | null = null;
              for (const dev of audioInputs) {
                try {
                  acquired = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { ideal: dev.deviceId } } });
                  if (acquired) break;
                } catch {}
              }
              if (!acquired) throw e1;
              stream = acquired;
            } else {
              throw e1; // reportar el primer error (normalmente más descriptivo)
            }
          }
        }
      }
      // Elegir mimeType soportado
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ];
      let selected: string | undefined = undefined;
      for (const c of candidates) {
        if ((window as any).MediaRecorder && (MediaRecorder as any).isTypeSupported?.(c)) {
          selected = c;
          break;
        }
      }
      mimeTypeRef.current = selected;
      // Crear MediaRecorder con el primer mimeType soportado
      mediaRecorderRef.current = new MediaRecorder(stream, selected ? { mimeType: selected } : undefined);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const type = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type });
        if (audioBlob.size === 0) {
          console.warn('Blob de audio vacío. Posible incompatibilidad del códec/permiso.');
          setError('No se capturó audio. Revisa permisos del micrófono o cambia de navegador.');
          setStatus('error');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        // Log de diagnóstico
        try {
          console.log('[Recorder] chunks:', audioChunksRef.current.length, 'blobSize:', audioBlob.size, 'type:', audioBlob.type);
        } catch {}
        // Transcodificar a WAV (PCM 16-bit) para compatibilidad total
        try {
          const arrayBuf = await audioBlob.arrayBuffer();
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const decoded = await audioCtx.decodeAudioData(arrayBuf);
          // Calcular nivel RMS para detectar silencio real
          const rms = computeRms(decoded);
          console.log('[Recorder] RMS:', rms.toFixed(5));
          const wavBlob = encodeWav(decoded);
          setMimeType('audio/wav');
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setAudioDataUri(result);
            setStatus('stopped');
            audioCtx.close?.();
          };
          reader.readAsDataURL(wavBlob);
          // Si la señal es prácticamente cero, informar al usuario
          if (rms < 0.0005) {
            setError('No se detectó señal de audio del micrófono. Revisa permisos del sitio y selecciona el micrófono correcto en Chrome (icono de candado → Micrófono).');
          }
        } catch (e) {
          console.warn('Fallo transcodificando a WAV, usando blob original', e);
          try {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              setAudioDataUri(result);
              setStatus('stopped');
            };
            reader.readAsDataURL(audioBlob);
          } catch {
            const objectUrl = URL.createObjectURL(audioBlob);
            setAudioDataUri(objectUrl);
            setStatus('stopped');
          }
        }
        // Stop all tracks on the stream to turn off the microphone light/indicator
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Error durante la grabación.');
        setStatus('error');
        stream.getTracks().forEach(track => track.stop());
      };

      // Iniciar grabación (sin timeslice mejora la consistencia en Chrome)
      mediaRecorderRef.current.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      let errorMessage = 'No se pudo acceder al micrófono.';
      
      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          errorMessage = 'No se encontró ningún micrófono. Por favor, conecta un micrófono y recarga la página.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permiso denegado. Por favor, permite el acceso al micrófono en la configuración de tu navegador.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'El micrófono está siendo usado por otra aplicación. Cierra otras aplicaciones y vuelve a intentar.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Configuración del micrófono no compatible. Por favor, intenta con otro navegador o revisa la configuración del micrófono en tu sistema.';
        } else if (err.message && /Could not start audio source/i.test(err.message)) {
          errorMessage = 'No se pudo iniciar la fuente de audio. Cierra apps que usen el micrófono (Zoom/Teams/Meet), revisa permisos y vuelve a intentar.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  }, [status]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      try {
        // Solicitar volcado del buffer antes de detener
        mediaRecorderRef.current.requestData?.();
      } catch {}
      mediaRecorderRef.current.stop();
      // Tracks are stopped in onstop to ensure data is processed
    }
  }, [status]);

  const reset = useCallback(() => {
    setStatus('idle');
    setAudioDataUri(null);
    setError(null);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    mediaRecorderRef.current = null;
  }, []);

  return { status, startRecording, stopRecording, audioDataUri, error, reset, audioMimeType: mimeTypeRef.current };
}

// Convierte un AudioBuffer a WAV PCM 16-bit (mono si es posible)
function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const channelData = [] as Float32Array[];
  for (let i = 0; i < numChannels; i++) channelData.push(buffer.getChannelData(i));

  // Mezclar a mono si hay más de un canal
  const length = buffer.length;
  const mono = new Float32Array(length);
  if (numChannels === 1) {
    mono.set(channelData[0]);
  } else {
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let c = 0; c < numChannels; c++) sum += channelData[c][i];
      mono[i] = sum / numChannels;
    }
  }

  // 16-bit PCM
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 1; // mono
  const dataSize = mono.length * bytesPerSample;
  const bufferSize = 44 + dataSize;
  const wavBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // samples
  let offset = 44;
  for (let i = 0; i < mono.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function computeRms(buffer: AudioBuffer): number {
  const ch0 = buffer.getChannelData(0);
  let sum = 0;
  for (let i = 0; i < ch0.length; i++) {
    const s = ch0[i];
    sum += s * s;
  }
  return Math.sqrt(sum / ch0.length);
}
