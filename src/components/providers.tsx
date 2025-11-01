// src/components/providers.tsx
// Este componente agrupa todos los Context Providers de tu aplicación.

"use client"; // Este es un Client Component ya que contiene Context Providers.

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Ya lo tenías
import { AuthProvider } from '@/contexts/auth-context';                 // Ya lo tenías
import { ThemeProvider } from "@/contexts/theme-provider";             // ¡Importa tu ThemeProvider!
import { PreferencesProvider } from '@/contexts/preferences-context';  // Nuevo: Preferencias con localStorage
import { useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    // Envuelve la aplicación con todos los Context Providers
    // El orden puede importar si un proveedor depende del otro.
    <QueryClientProvider client={queryClient}> {/* Tu QueryClientProvider */}
      <PreferencesProvider> {/* Preferencias del usuario en localStorage */}
        <AuthProvider> {/* Tu AuthProvider */}
          <ThemeProvider> {/* ¡Aquí está el ThemeProvider! */}
            {children} {/* Aquí se renderizan todas tus páginas y componentes */}
          </ThemeProvider>
        </AuthProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
