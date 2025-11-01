'use client';

import { usePreferences } from '@/contexts/preferences-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Trash2, Database } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { localStorageUtils } from '@/hooks/use-local-storage';
import { useState, useEffect } from 'react';

export default function PreferencesPage() {
  const { preferences, updatePreferences, resetPreferences, clearSearchHistory } = usePreferences();
  const { toast } = useToast();
  const [storageSize, setStorageSize] = useState(0);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setStorageSize(localStorageUtils.getSize());
    setStorageKeys(localStorageUtils.getAllKeys());
  }, [preferences]);

  const handleResetPreferences = () => {
    resetPreferences();
    toast({
      title: 'Preferencias restablecidas',
      description: 'Todas las preferencias han sido restablecidas a sus valores por defecto.',
    });
  };

  const handleClearSearchHistory = () => {
    clearSearchHistory();
    toast({
      title: 'Historial limpiado',
      description: 'Tu historial de búsquedas ha sido eliminado.',
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/profile">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Perfil
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Preferencias y Almacenamiento Local
          </CardTitle>
          <CardDescription>
            Gestiona tus preferencias guardadas en el navegador (localStorage)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información de localStorage */}
          <div className="bg-muted p-4 rounded-md space-y-2">
            <h3 className="font-semibold text-sm">Información de Almacenamiento</h3>
            <div className="text-sm space-y-1">
              <p>📊 <strong>Tamaño usado:</strong> {formatBytes(storageSize)}</p>
              <p>🔑 <strong>Claves almacenadas:</strong> {storageKeys.length}</p>
              <p>📅 <strong>Última actualización:</strong> {new Date(preferences.lastUpdated).toLocaleString('es-ES')}</p>
            </div>
          </div>

          <Separator />

          {/* Preferencias de Notificaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notificaciones</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificaciones habilitadas</Label>
                <p className="text-sm text-muted-foreground">Recibe notificaciones en la aplicación</p>
              </div>
              <Switch
                id="notifications"
                checked={preferences.notificationsEnabled}
                onCheckedChange={(checked) => updatePreferences({ notificationsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound">Sonido de notificaciones</Label>
                <p className="text-sm text-muted-foreground">Reproducir sonido con las notificaciones</p>
              </div>
              <Switch
                id="sound"
                checked={preferences.soundEnabled}
                onCheckedChange={(checked) => updatePreferences({ soundEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email">Notificaciones por email</Label>
                <p className="text-sm text-muted-foreground">Recibe notificaciones en tu correo</p>
              </div>
              <Switch
                id="email"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreferences({ emailNotifications: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Preferencias de Visualización */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Visualización</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoplay">Reproducción automática</Label>
                <p className="text-sm text-muted-foreground">Reproducir audios automáticamente</p>
              </div>
              <Switch
                id="autoplay"
                checked={preferences.autoPlayAudio}
                onCheckedChange={(checked) => updatePreferences({ autoPlayAudio: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="avatars">Mostrar avatares</Label>
                <p className="text-sm text-muted-foreground">Ver avatares de usuarios</p>
              </div>
              <Switch
                id="avatars"
                checked={preferences.showAvatars}
                onCheckedChange={(checked) => updatePreferences({ showAvatars: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact">Vista compacta</Label>
                <p className="text-sm text-muted-foreground">Mostrar contenido de forma más compacta</p>
              </div>
              <Switch
                id="compact"
                checked={preferences.compactView}
                onCheckedChange={(checked) => updatePreferences({ compactView: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Preferencias de Privacidad */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Privacidad</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="online">Mostrar estado en línea</Label>
                <p className="text-sm text-muted-foreground">Otros usuarios verán cuando estés activo</p>
              </div>
              <Switch
                id="online"
                checked={preferences.showOnlineStatus}
                onCheckedChange={(checked) => updatePreferences({ showOnlineStatus: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="messages">Permitir mensajes directos</Label>
                <p className="text-sm text-muted-foreground">Recibir mensajes de otros usuarios</p>
              </div>
              <Switch
                id="messages"
                checked={preferences.allowDirectMessages}
                onCheckedChange={(checked) => updatePreferences({ allowDirectMessages: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Historial de Búsquedas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Historial de Búsquedas</h3>
            <p className="text-sm text-muted-foreground">
              Tienes {preferences.searchHistory.length} búsquedas guardadas
            </p>
            {preferences.searchHistory.length > 0 && (
              <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                <ul className="space-y-1 text-sm">
                  {preferences.searchHistory.map((query, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground">•</span>
                      {query}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleClearSearchHistory}
              disabled={preferences.searchHistory.length === 0}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar Historial de Búsquedas
            </Button>
          </div>

          <Separator />

          {/* Ecosistemas Favoritos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ecosistemas Favoritos</h3>
            <p className="text-sm text-muted-foreground">
              Tienes {preferences.favoriteEcosystems.length} ecosistemas marcados como favoritos
            </p>
          </div>

          <Separator />

          {/* Acciones */}
          <div className="space-y-2">
            <Button
              variant="destructive"
              onClick={handleResetPreferences}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Restablecer Todas las Preferencias
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Esto restablecerá todas las preferencias a sus valores por defecto
            </p>
          </div>

          {/* Información avanzada (desarrolladores) */}
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => setShowAdvanced(v => !v)}>
              {showAdvanced ? 'Ocultar Información Avanzada' : 'Mostrar Información Avanzada'}
            </Button>
            {showAdvanced && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
                <h4 className="font-semibold text-sm mb-2">🔍 Claves en localStorage:</h4>
                <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {storageKeys.map((key, index) => (
                    <div key={index} className="font-mono bg-background p-1 rounded">
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
