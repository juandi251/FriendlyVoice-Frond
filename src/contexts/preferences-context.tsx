'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

/**
 * Preferencias del usuario almacenadas en localStorage
 */
interface UserPreferences {
  // Preferencias de notificaciones
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  
  // Preferencias de visualización
  autoPlayAudio: boolean;
  showAvatars: boolean;
  compactView: boolean;
  
  // Preferencias de privacidad
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  
  // Historial de búsquedas (últimas 10)
  searchHistory: string[];
  
  // Ecosistemas favoritos
  favoriteEcosystems: string[];
  
  // Última vez que se actualizó
  lastUpdated: string;
}

const defaultPreferences: UserPreferences = {
  notificationsEnabled: true,
  soundEnabled: true,
  emailNotifications: false,
  autoPlayAudio: false,
  showAvatars: true,
  compactView: false,
  showOnlineStatus: true,
  allowDirectMessages: true,
  searchHistory: [],
  favoriteEcosystems: [],
  lastUpdated: new Date().toISOString(),
};

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  toggleFavoriteEcosystem: (ecosystemId: string) => void;
  isFavoriteEcosystem: (ecosystemId: string) => boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences, resetPreferences] = useLocalStorage<UserPreferences>(
    'friendlyvoice_preferences',
    defaultPreferences
  );

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;
    
    setPreferences(prev => {
      const newHistory = [
        query,
        ...prev.searchHistory.filter(q => q !== query)
      ].slice(0, 10); // Mantener solo las últimas 10 búsquedas
      
      return {
        ...prev,
        searchHistory: newHistory,
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const clearSearchHistory = () => {
    setPreferences(prev => ({
      ...prev,
      searchHistory: [],
      lastUpdated: new Date().toISOString(),
    }));
  };

  const toggleFavoriteEcosystem = (ecosystemId: string) => {
    setPreferences(prev => {
      const isFavorite = prev.favoriteEcosystems.includes(ecosystemId);
      const newFavorites = isFavorite
        ? prev.favoriteEcosystems.filter(id => id !== ecosystemId)
        : [...prev.favoriteEcosystems, ecosystemId];
      
      return {
        ...prev,
        favoriteEcosystems: newFavorites,
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const isFavoriteEcosystem = (ecosystemId: string): boolean => {
    return preferences.favoriteEcosystems.includes(ecosystemId);
  };

  const handleResetPreferences = () => {
    resetPreferences();
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences: handleResetPreferences,
        addToSearchHistory,
        clearSearchHistory,
        toggleFavoriteEcosystem,
        isFavoriteEcosystem,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
