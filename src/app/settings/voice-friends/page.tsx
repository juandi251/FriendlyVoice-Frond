// src/app/settings/voice-friends/page.tsx
// Esta página gestiona tus VozNotas y opciones de voz.

"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Volume2, Mic } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useUserVoices } from '@/hooks/use-user-voices';
import type { Voz } from '@/types/friendly-voice';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function VoiceFriendsPage() {
  const { user } = useAuth();
  const { getUserVoices, deleteVoice, addVoice } = useUserVoices();
  const { toast } = useToast();

  const [userVoices, setUserVoices] = useState<Voz[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState<string>('');

  // Refs de audio por vozId para Reproducir
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const setAudioRef = (id: string) => (el: HTMLAudioElement | null) => {
    audioRefs.current[id] = el;
  };

  useEffect(() => {
    if (user?.id) {
      const voces = getUserVoices(user.id);
      setUserVoices(voces);
    }
  }, [user, getUserVoices]);

  const handlePlay = (id: string) => {
    const el = audioRefs.current[id];
    if (el) el.play();
  };

  const handleStartEdit = (voz: Voz) => {
    setEditingId(voz.id);
    setEditCaption(voz.caption ?? '');
  };

  const handleSaveEdit = () => {
    if (!user || !editingId) return;
    const updated = userVoices.map(v => v.id === editingId ? { ...v, caption: editCaption || undefined } : v);
    setUserVoices(updated);
    try {
      const key = `fv_user_voces_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updated));
      setEditingId(null);
      toast({ title: 'Voz actualizada', description: 'La descripción de la voz fue actualizada.' });
    } catch {}
  };

  const handleDelete = (id: string) => {
    if (!user) return;
    deleteVoice(user.id, id);
    setUserVoices(prev => prev.filter(v => v.id !== id));
    toast({ title: 'Voz eliminada', description: 'Se eliminó la voz.' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      {/* Encabezado de la página */}
      <header className="p-4 shadow-md bg-card text-card-foreground mb-6">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold">Gestionar Voces Amigas</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-8">
        {/* Sección: Mis VozNotas */}
        <section className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Mis VozNotas</h2>
          {user && userVoices.length > 0 ? (
            <div className="space-y-4">
              {userVoices.map((voz) => (
                <div key={voz.id} className="p-3 rounded-md bg-muted">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-primary" />
                      <div>
                        {editingId === voz.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editCaption}
                              onChange={(e) => setEditCaption(e.target.value)}
                              placeholder="Descripción de la voz"
                              className="h-8"
                            />
                            <Button size="sm" onClick={handleSaveEdit}>Guardar</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{voz.caption ?? 'Voz grabada'}</p>
                            <p className="text-sm text-muted-foreground">{new Date(voz.createdAt).toLocaleDateString()}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handlePlay(voz.id)} size="sm">Reproducir</Button>
                      <Button onClick={() => handleStartEdit(voz)} variant="secondary" size="sm">Editar Voz</Button>
                      <Button onClick={() => handleDelete(voz.id)} variant="destructive" size="sm">Eliminar</Button>
                    </div>
                  </div>
                  <audio ref={setAudioRef(voz.id)} src={voz.audioUrl} className="mt-2 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aún no tienes VozNotas publicadas.</p>
          )}
          <div className="mt-6 text-center">
            <Link href="/feed" className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-300">
              <Mic className="mr-2 h-5 w-5" /> Grabar Nueva VozNota
            </Link>
          </div>
        </section>

        {/* Sección: Opciones de Voz (para cambiar la voz de mis audios y seleccionar entre una variedad) */}
        <section className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Opciones de Voz</h2>
          <div className="space-y-4">
            {/* Opción: Seleccionar Tipo de Voz por Defecto */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Voz por Defecto para Grabaciones</span>
              <select className="px-3 py-1 rounded-md bg-input text-foreground border border-border">
                <option value="original">Mi Voz Original</option>
                <option value="pitch-shift">Voz Aguda</option>
                <option value="robot">Voz de Robot</option>
                <option value="echo">Voz con Eco</option>
                {/* Más opciones de voz aquí */}
              </select>
            </div>
            <p className="text-muted-foreground text-sm">
              Elige el efecto de voz que se aplicará a tus nuevas grabaciones.
            </p>

            {/* Opción: Gestionar Amigos Bloqueados/Silenciados (si aplica aquí o en Privacidad) */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Amigos Bloqueados/Silenciados</span>
              <button
                // onClick={() => alert('Gestionar amigos bloqueados/silenciados por implementar')}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity duration-300"
              >
                Ver Lista
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Administra las voces de amigos que has bloqueado o silenciado.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}
