import type { Ecosystem } from '@/types/friendly-voice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Headphones, Hash } from 'lucide-react';
import Link from 'next/link';

interface EcosystemCardProps {
  ecosystem: Ecosystem;
}

export function EcosystemCard({ ecosystem }: EcosystemCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">{ecosystem.name}</CardTitle>
        <CardDescription className="flex items-center text-sm">
          <Headphones className="mr-2 h-4 w-4 text-muted-foreground" /> {ecosystem.topic}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        {ecosystem.description && <p className="text-sm text-muted-foreground">{ecosystem.description.substring(0,100)}{ecosystem.description.length > 100 ? "..." : ""}</p>}
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4" /> {ecosystem.participantCount || 0} participantes
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {ecosystem.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Hash className="mr-1 h-3 w-3" />{tag}
            </Badge>
          ))}
          {ecosystem.tags.length > 3 && <Badge variant="secondary" className="text-xs">...</Badge>}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href={`/ecosystems/${ecosystem.id}`}>
            Unirse al Ecosistema
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
