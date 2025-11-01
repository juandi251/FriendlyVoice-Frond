// src/components/voz-card.tsx
'use client';

import type { Voz } from '@/types/friendly-voice';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale'; // Import Spanish locale
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VozCardProps {
  voz: Voz;
  onLikeToggle: (vozId: string) => void;
  onOpenComments: (vozId: string) => void; 
  onDelete?: (vozId: string) => void;
  onReport?: (vozId: string) => void;
  isOwn?: boolean;
}

export function VozCard({ voz, onLikeToggle, onOpenComments, onDelete, onReport, isOwn }: VozCardProps) {
  const { toast } = useToast();
  const [showFullCaption, setShowFullCaption] = useState(false);

  const formattedDate = formatDistanceToNow(new Date(voz.createdAt), { addSuffix: true, locale: es });

  const toggleCaption = () => {
    setShowFullCaption(!showFullCaption);
  };
  
  const captionDisplay = voz.caption ? (
    showFullCaption || voz.caption.length <= 150 
      ? voz.caption 
      : `${voz.caption.substring(0, 150)}...`
  ) : null;


  return (
    <Card className="w-full shadow-md">
      <CardHeader className="flex flex-row items-center space-x-3 pb-3">
        <Link href={`/profile/${voz.userId}`} passHref>
          <Avatar className="cursor-pointer">
            <AvatarImage src={voz.userAvatarUrl} alt={voz.userName} data-ai-hint="abstract person" />
            <AvatarFallback>{voz.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-grow">
          <Link href={`/profile/${voz.userId}`} passHref>
            <p className="font-semibold text-sm hover:underline cursor-pointer">{voz.userName}</p>
          </Link>
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreHorizontal className="h-5 w-5" />
              <span className="sr-only">Más opciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onReport && (
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  
                  // Intentar obtener el id de diferentes maneras
                  // Firestore puede tener el id en el documento o como propiedad
                  let vozIdToReport = voz?.id || voz?.['id'] || (voz as any)?._id || '';
                  
                  // Si todavía no hay id, intentar usar el userId y timestamp como fallback
                  if (!vozIdToReport && voz?.userId) {
                    // Para publicaciones sin id explícito, usar un identificador único
                    vozIdToReport = `temp-${voz.userId}-${voz.createdAt || Date.now()}`;
                    console.warn('Usando ID temporal para reporte:', vozIdToReport);
                  }
                  
                  console.log('DropdownMenuItem clicked', { 
                    vozId: voz?.id,
                    vozIdToReport,
                    vozKeys: voz ? Object.keys(voz) : [],
                    voz: voz
                  });
                  
                  if (!vozIdToReport || vozIdToReport.trim() === '') {
                    console.error('ERROR: No se puede reportar, vozId está vacío', { voz });
                    return;
                  }
                  
                  onReport(vozIdToReport.trim());
                }}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Flag className="mr-2 h-4 w-4" />
                Reportar Publicación
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        {captionDisplay && (
          <p className="text-sm whitespace-pre-line">
            {captionDisplay}
            {voz.caption && voz.caption.length > 150 && (
              <Button variant="link" size="sm" onClick={toggleCaption} className="p-0 h-auto ml-1 text-primary">
                {showFullCaption ? 'Ver menos' : 'Ver más'}
              </Button>
            )}
          </p>
        )}
        <audio controls className="w-full h-10 rounded-md">
          {/* El Data URI incluye el mime; agregar source mejora compatibilidad en algunos navegadores */}
          <source src={voz.audioUrl} />
          Tu navegador no soporta el elemento de audio.
        </audio>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-0 border-t pt-3">
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("text-muted-foreground hover:text-primary", voz.isLiked && "text-destructive hover:text-destructive/90")}
          onClick={() => onLikeToggle(voz.id)}
        >
          <Heart className={cn("mr-2 h-5 w-5", voz.isLiked && "fill-destructive")} /> {voz.likesCount} Me gusta
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-primary" 
          onClick={() => onOpenComments(voz.id)}
        >
          <MessageCircle className="mr-2 h-5 w-5" /> {voz.commentsCount} Comentarios
        </Button>
        <div className="flex items-center gap-1">
          {isOwn && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90"
              onClick={() => onDelete(voz.id)}
              title="Eliminar"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `Voz de ${voz.userName}`,
                text: voz.caption || 'Escucha esta voz',
                url: window.location.href
              }).catch(() => {
                toast({ title: "Compartir", description: "Enlace copiado a portapapeles." });
              });
            } else {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: "Compartir", description: "Enlace copiado a portapapeles." });
            }
          }}>
            <Send className="mr-2 h-5 w-5" /> Compartir
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
