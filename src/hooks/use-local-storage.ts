'use client';

import { useState, useEffect } from 'react';

/**
 * Hook personalizado para manejar localStorage de forma segura
 * Incluye manejo de errores y soporte para SSR
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado para almacenar el valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error al leer localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Función para actualizar el valor
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error al guardar en localStorage key "${key}":`, error);
    }
  };

  // Función para eliminar el valor
  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error al eliminar localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
}

/**
 * Utilidades para trabajar con localStorage
 */
export const localStorageUtils = {
  /**
   * Obtiene un item de localStorage
   */
  getItem: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error al leer localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Guarda un item en localStorage
   */
  setItem: <T>(key: string, value: T): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error al guardar en localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Elimina un item de localStorage
   */
  removeItem: (key: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error al eliminar localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Limpia todo el localStorage
   */
  clear: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
      return false;
    }
  },

  /**
   * Obtiene todas las keys de localStorage
   */
  getAllKeys: (): string[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      return Object.keys(window.localStorage);
    } catch (error) {
      console.error('Error al obtener keys de localStorage:', error);
      return [];
    }
  },

  /**
   * Obtiene el tamaño usado de localStorage en bytes
   */
  getSize: (): number => {
    if (typeof window === 'undefined') return 0;
    
    try {
      let total = 0;
      for (let key in window.localStorage) {
        if (window.localStorage.hasOwnProperty(key)) {
          total += window.localStorage[key].length + key.length;
        }
      }
      return total;
    } catch (error) {
      console.error('Error al calcular tamaño de localStorage:', error);
      return 0;
    }
  }
};
