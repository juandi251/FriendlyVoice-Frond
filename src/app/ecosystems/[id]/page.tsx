'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Headphones, Users, LogOut, Hand } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function EcosystemRoomPage() {
  const params = useParams();
  const ecosystemId = params.id as string;
  const [ecosistemas] = useLocalStorage<any[]>('userEcosystems', []);
  const [ecosistema, setEcosistema] = useState<{ name: string; topic: string } | null>(null);

  useEffect(() => {
    // Buscar el ecosistema en localStorage
    const found = ecosistemas.find((eco: any) => eco.id === ecosystemId);
    if (found) {
      setEcosistema({ name: found.name, topic: found.topic });
    } else {
      // Si no se encuentra, usar datos mock por defecto
      setEcosistema({
        name: `Ecosistema #${ecosystemId}`,
        topic: 'Un tema fascinante para discutir',
      });
    }
  }, [ecosystemId, ecosistemas]);

  if (!ecosistema) {
    return <div className="container mx-auto max-w-3xl py-8">Cargando...</div>;
  }

  const mockEcosystem = ecosistema;
  const mockParticipants = [
    { id: 'host1', name: 'Anfitrión Alfa', role: 'Anfitrión', avatar: 'https://picsum.photos/seed/host1/40' },
    { id: 'speaker1', name: 'Orador Beta', role: 'Orador', avatar: 'https://picsum.photos/seed/speaker1/40' },
    { id: 'listener1', name: 'Oyente Gamma', role: 'Oyente', avatar: 'https://picsum.photos/seed/listener1/40' },
    { id: 'listener2', name: 'Oyente Delta', role: 'Oyente', avatar: 'https://picsum.photos/seed/listener2/40' },
  ];


  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card className="shadow-xl">
        <CardHeader className="bg-secondary">
          <div className="flex items-center space-x-3">
            <Headphones className="w-8 h-8 text-primary" />
            <div>
              <CardTitle className="text-2xl text-primary">{mockEcosystem.name}</CardTitle>
              <CardDescription>{mockEcosystem.topic}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5" /> Participantes</h3>
            <div className="space-y-3">
              {mockParticipants.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={p.avatar} alt={p.name} data-ai-hint="abstract geometric" />
                      <AvatarFallback>{p.name.substring(0,1)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    </div>
                  </div>
                  {/* Placeholder for speaking indicator or mute button */}
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t pt-6 space-y-3">
            <p className="text-center text-muted-foreground">La interfaz de la sala de audio y las interacciones están en desarrollo.</p>
             <div className="flex justify-center space-x-3">
                <Button variant="outline">
                    <Hand className="mr-2 h-4 w-4" /> Levantar la mano
                </Button>
                <Button variant="destructive" asChild>
                  <Link href="/">
                    <LogOut className="mr-2 h-4 w-4" /> Salir del Ecosistema
                  </Link>
                </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
