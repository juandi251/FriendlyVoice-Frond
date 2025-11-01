// src/components/comment-modal.tsx
'use client';

import type { Voz, VozComment, User } from '@/types/friendly-voice';
import { useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  voz: Voz | null;
  comments: VozComment[];
  onAddComment: (vozId: string, text: string) => Promise<void>;
  currentUser: User | null;
}

export function CommentModal({ isOpen, onClose, voz, comments, onAddComment, currentUser }: CommentModalProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newCommentText.trim() || !voz || !currentUser) return;

    setIsSubmitting(true);
    try {
      await onAddComment(voz.id, newCommentText.trim());
      setNewCommentText('');
    } catch (error) {
      // Error handling can be improved with toast
      console.error("Failed to add comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!voz) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Comentarios sobre la Voz de {voz.userName}</DialogTitle>
          {voz.caption && <DialogDescription className="text-xs truncate">{voz.caption}</DialogDescription>}
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6 max-h-[50vh] min-h-[200px]"> {/* Added min-h */}
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay comentarios aún. ¡Sé el primero!</p>
          ) : (
            <div className="space-y-4 py-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <Link href={`/profile/${comment.userId}`} passHref>
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarImage src={comment.userAvatarUrl} alt={comment.userName} data-ai-hint="abstract person" />
                      <AvatarFallback>{comment.userName.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 bg-muted p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                       <Link href={`/profile/${comment.userId}`} passHref>
                        <p className="text-xs font-semibold hover:underline cursor-pointer">{comment.userName}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-line">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {currentUser ? (
          <DialogFooter className="pt-4 border-t">
            <div className="flex items-start space-x-2 w-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name ?? 'Usuario'} data-ai-hint="abstract geometric" />
                <AvatarFallback>{(currentUser.name ?? 'U').substring(0,1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Textarea
                placeholder="Escribe un comentario..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={2}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button onClick={handleSubmitComment} disabled={isSubmitting || !newCommentText.trim()} size="icon">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Enviar Comentario</span>
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <p className="text-sm text-muted-foreground text-center pt-4 border-t">
            <Link href="/login" className="text-primary underline">Inicia sesión</Link> para comentar.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
