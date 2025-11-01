// src/contexts/theme-provider.tsx
// Este archivo define el ThemeProvider para gestionar el modo oscuro/claro de la aplicación.

"use client"; // Este es un Client Component ya que usa hooks de React y localStorage.

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 1. Definir el tipo para el contexto del tema
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// 2. Crear el Contexto del Tema
// Se inicializa con valores por defecto que se sobrescribirán.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 3. Crear el ThemeProvider (el componente que proveerá el contexto)
interface ThemeProviderProps {
  children: ReactNode; // 'children' representa los componentes hijos que ThemeProvider envolverá.
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Estado para controlar si el modo oscuro está activado.
  // Se inicializa en 'false' y se ajustará en useEffect.
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // useEffect para leer la preferencia del usuario desde localStorage al cargar la app.
  useEffect(() => {
    // Ejecutar solo en el cliente (navegador) para evitar errores de SSR con localStorage.
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      // Si hay un tema guardado, úsalo. Si no, detecta la preferencia del sistema operativo.
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        // Detectar la preferencia del sistema operativo (si el navegador lo soporta).
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDarkMode);
      }
    }
  }, []); // Se ejecuta solo una vez al montar el componente.

  // useEffect para aplicar la clase 'dark' al elemento <html> y guardar la preferencia.
  useEffect(() => {
    // Asegurarse de que el DOM esté disponible.
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement; // Obtener el elemento <html>

      if (isDarkMode) {
        htmlElement.classList.add('dark'); // Añadir la clase 'dark'
        localStorage.setItem('theme', 'dark'); // Guardar la preferencia
      } else {
        htmlElement.classList.remove('dark'); // Eliminar la clase 'dark'
        localStorage.setItem('theme', 'light'); // Guardar la preferencia
      }
    }
  }, [isDarkMode]); // Se ejecuta cada vez que 'isDarkMode' cambia.

  // Función para alternar el modo oscuro.
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode); // Cambiar el estado a su opuesto.
  };

  // El ThemeProvider provee el estado y la función para alternar a sus hijos.
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Hook personalizado para usar el contexto del tema
// Este hook facilita el acceso a 'isDarkMode' y 'toggleDarkMode' desde cualquier componente.
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
