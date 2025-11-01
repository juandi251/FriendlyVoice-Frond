// src/app/settings/privacy-security/page.tsx
// Esta página gestiona la privacidad, seguridad y la opción de modo oscuro.

"use client"; // Necesario para usar hooks como useTheme y useState.

import { useTheme } from '../../../contexts/theme-provider'; // Importa el hook useTheme
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react'; // Icono para volver atrás

export default function PrivacySecurityPage() {
  const { isDarkMode, toggleDarkMode } = useTheme(); // Usa el hook para acceder al estado y la función del tema.

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      {/* Encabezado de la página */}
      <header className="p-4 shadow-md bg-card text-card-foreground mb-6">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold">Privacidad y Seguridad</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-2xl space-y-8">
        {/* Sección de Privacidad */}
        <section className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Privacidad</h2>
          <div className="space-y-4">
            {/* Opción: Quién puede ver mi perfil */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Visibilidad del Perfil</span>
              <select className="px-3 py-1 rounded-md bg-input text-foreground border border-border">
                <option value="public">Público</option>
                <option value="friends">Solo Amigos</option>
                <option value="private">Privado</option>
              </select>
            </div>
            <p className="text-muted-foreground text-sm">
              Controla quién puede ver tu perfil y tus VozNotas.
            </p>

            {/* Opción: Mensajes Directos */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Mensajes Directos</span>
              <select className="px-3 py-1 rounded-md bg-input text-foreground border border-border">
                <option value="everyone">Todos</option>
                <option value="friends">Solo Amigos</option>
                <option value="none">Nadie</option>
              </select>
            </div>
            <p className="text-muted-foreground text-sm">
              Define quién puede iniciar una conversación contigo.
            </p>
          </div>
        </section>

        {/* Sección de Seguridad */}
        <section className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Seguridad</h2>
          <div className="space-y-4">
            {/* Opción: Cambiar Contraseña */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Cambiar Contraseña</span>
              <button
                // onClick={() => alert('Funcionalidad de cambiar contraseña por implementar con Firebase Auth')}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity duration-300"
              >
                Actualizar
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Protege tu cuenta actualizando tu contraseña.
            </p>

            {/* Opción: Autenticación de Dos Factores */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Autenticación de Dos Factores (2FA)</span>
              <button
                // onClick={() => alert('Funcionalidad 2FA por implementar')}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity duration-300"
              >
                Activar/Desactivar
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Añade una capa extra de seguridad a tu cuenta.
            </p>

            {/* Opción: Sesiones Activas */}
            <div className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
              <span className="text-lg">Sesiones Activas</span>
              <button
                // onClick={() => alert('Funcionalidad de gestionar sesiones por implementar')}
                className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity duration-300"
              >
                Ver/Cerrar
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Revisa los dispositivos donde tu cuenta está activa.
            </p>
          </div>
        </section>

        {/* Sección de Apariencia (Modo Oscuro) - Aquí la colocamos */}
        <section className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Apariencia</h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-lg">Modo Oscuro</span>
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity duration-300"
            >
              {isDarkMode ? 'Desactivar' : 'Activar'}
            </button>
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            Cambia el tema visual de la aplicación entre claro y oscuro.
          </p>
        </section>

      </main>
    </div>
  );
}
