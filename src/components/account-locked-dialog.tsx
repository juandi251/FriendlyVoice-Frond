"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock, Mail } from "lucide-react";

interface AccountLockedDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AccountLockedDialog({ open, onClose }: AccountLockedDialogProps) {
  const adminEmail = "juandi23154@gmail.com";

  const handleEmailAdmin = () => {
    const subject = encodeURIComponent("Solicitud de Desbloqueo de Cuenta - FriendlyVoice");
    const body = encodeURIComponent(
      `Estimado Administrador,\n\n` +
      `Mi cuenta ha sido bloqueada y solicito su desbloqueo.\n\n` +
      `Nombre de Usuario: [Su nombre o email]\n` +
      `Motivo del Bloqueo: [Ej: Olvido de contraseña / Múltiples intentos fallidos]\n\n` +
      `Agradezco su atención.\n\n` +
      `Saludos cordiales.`
    );
    window.open(`mailto:${adminEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">Acceso Denegado</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <div className="font-semibold text-foreground">
                Su cuenta ha sido bloqueada temporalmente por razones de seguridad.
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                <div className="text-sm text-amber-900">
                  <strong>¿Por qué sucedió esto?</strong>
                </div>
                <div className="text-sm text-amber-800">
                  Esto ocurre automáticamente después de <strong>3 intentos fallidos</strong> de inicio de sesión.
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-2">
                <div className="text-sm text-blue-900">
                  <strong>¿Cómo solicitar el desbloqueo?</strong>
                </div>
                <div className="text-sm text-blue-800">
                  Por favor, envíe un correo electrónico al administrador especificando:
                </div>
                <ul className="text-sm text-blue-800 list-disc list-inside ml-2 space-y-1">
                  <li>Su <strong>Nombre de Usuario o Email</strong></li>
                  <li>El <strong>Motivo del Bloqueo</strong> (ej: "olvido de contraseña")</li>
                </ul>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
                <Mail className="h-4 w-4 text-gray-600" />
                <div className="flex-1">
                  <div className="text-xs text-gray-600">Correo del Administrador:</div>
                  <a 
                    href={`mailto:${adminEmail}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                    onClick={handleEmailAdmin}
                  >
                    {adminEmail}
                  </a>
                </div>
              </div>

              <div className="text-xs text-muted-foreground italic text-center pt-2">
                Agradecemos su comprensión.
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleEmailAdmin} className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Contactar al Administrador
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
