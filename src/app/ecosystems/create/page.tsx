'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioTower, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';

export default function CreateEcosystemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [ecosistemas, setEcosistemas] = useLocalStorage<any[]>('userEcosystems', []);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !topic.trim()) {
      toast({ 
        title: 'Error', 
        description: 'Por favor, completa todos los campos.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsCreating(true);
    // Simular creación (delay de 1 segundo)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newEcosystem = {
      id: `eco-${Date.now()}`,
      name: name.trim(),
      topic: topic.trim(),
      participantCount: 1, // El creador
      createdAt: new Date().toISOString(),
    };

    setEcosistemas([...ecosistemas, newEcosystem]);
    
    toast({ 
      title: '¡Ecosistema Creado!', 
      description: `"${name}" ha sido creado exitosamente. Redirigiendo a la sala...` 
    });
    
    setIsCreating(false);
    // Redirigir a la sala del ecosistema recién creado
    router.push(`/ecosystems/${newEcosystem.id}`);
  };

  return (
    <div className="container mx-auto max-w-lg py-8 px-4">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center gap-2">
            <RadioTower className="h-6 w-6" />
            Crear un Nuevo Ecosistema
          </CardTitle>
          <CardDescription>Da vida a tu propia sala de chat de audio temática.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Ecosistema</Label>
            <Input
              id="name"
              placeholder="Ej: Charlas de Tech Semanal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="topic">Tema o Descripción</Label>
            <Textarea
              id="topic"
              placeholder="Ej: Lo último en tecnología y desarrollo"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleCreate} 
              disabled={isCreating || !name.trim() || !topic.trim()}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Ecosistema'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/profile')}
              disabled={isCreating}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
