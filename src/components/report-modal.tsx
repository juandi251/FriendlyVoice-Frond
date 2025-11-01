'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (vozId: string, motivo: string, mensaje: string) => Promise<void>;
  vozId: string;
}

const REPORT_REASONS = [
  { value: 'abuso', label: 'Abuso o acoso', adminLabel: 'Abuso' },
  { value: 'hiriente', label: 'Mensaje hiriente', adminLabel: 'Mensaje hiriente' },
  { value: 'inapropiado', label: 'Contenido inapropiado', adminLabel: 'Contenido inapropiado' },
  { value: 'spam', label: 'Spam o contenido promocional', adminLabel: 'Spam' },
  { value: 'desinformacion', label: 'Desinformación', adminLabel: 'Desinformación' },
  { value: 'violencia', label: 'Contenido violento', adminLabel: 'Contenido violento' },
  { value: 'otro', label: 'Otro', adminLabel: 'Otro' },
];

export function ReportModal({ isOpen, onClose, onConfirm, vozId }: ReportModalProps) {
  const [motivo, setMotivo] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const vozIdRef = useRef<string>('');

  // Guardar el vozId cuando el modal se abre
  useEffect(() => {
    if (isOpen && vozId && vozId.trim() !== '') {
      vozIdRef.current = vozId;
      console.log('ReportModal: vozId guardado', vozId);
    }
  }, [isOpen, vozId]);

  // Resetear el formulario cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      setMotivo('');
      setMensaje('');
      setIsSubmitting(false);
      vozIdRef.current = '';
    }
  }, [isOpen]);

  // Verificar que tenemos vozId cuando el modal está abierto
  useEffect(() => {
    if (isOpen && !vozId && !vozIdRef.current) {
      console.error('ReportModal: vozId no está disponible cuando el modal está abierto', { vozId, vozIdRef: vozIdRef.current, isOpen });
      // Cerrar el modal si no hay vozId
      onClose();
    }
  }, [isOpen, vozId, onClose]);

  const handleSubmit = async () => {
    // Usar vozIdRef si vozId prop está vacío
    const currentVozId = vozId && vozId.trim() !== '' ? vozId : vozIdRef.current;
    
    console.log('handleSubmit: llamado', { motivo, vozId, vozIdRef: vozIdRef.current, currentVozId, isOpen });
    
    if (!motivo) {
      console.log('handleSubmit: falta motivo', { motivo, currentVozId });
      return;
    }
    
    if (!currentVozId || currentVozId.trim() === '') {
      console.error('handleSubmit: vozId está vacío o no válido', { motivo, vozId, vozIdRef: vozIdRef.current, currentVozId });
      return;
    }

    console.log('handleSubmit: iniciando envío', { vozId: currentVozId, motivo });
    setIsSubmitting(true);
    try {
      await onConfirm(currentVozId, motivo, mensaje.trim());
      console.log('handleSubmit: onConfirm completado exitosamente');
      // Si el reporte se envió exitosamente, el modal se cerrará desde el padre
      // Solo reseteamos el formulario aquí
      setMotivo('');
      setMensaje('');
      setIsSubmitting(false);
      // No llamamos onClose aquí porque el padre ya lo hace
    } catch (error) {
      console.error('handleSubmit: error en onConfirm', error);
      // Error handling is done in parent
      // El modal permanecerá abierto para que el usuario pueda intentar nuevamente
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMotivo('');
      setMensaje('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Reportar Publicación
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a mantener la comunidad segura. Selecciona el motivo del reporte y proporciona detalles adicionales si los hay.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del reporte *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecciona un motivo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensaje">Mensaje adicional (opcional)</Label>
            <Textarea
              id="mensaje"
              placeholder="Proporciona más detalles sobre el reporte..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {mensaje.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!motivo || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

