// src/hooks/use-user-voices.ts
'use client';

import { useCallback } from 'react';
import type { Voz } from '@/types/friendly-voice';
import { localStorageUtils } from '@/hooks/use-local-storage';

const keyFor = (userId: string) => `fv_user_voces_${userId}`;

export function useUserVoices() {
  const getUserVoices = useCallback((userId: string): Voz[] => {
    const stored = localStorageUtils.getItem<Voz[]>(keyFor(userId), []);
    return Array.isArray(stored) ? stored : [];
  }, []);

  const addVoice = useCallback((userId: string, voz: Voz) => {
    const list = getUserVoices(userId);
    const next = [voz, ...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    localStorageUtils.setItem(keyFor(userId), next);
    localStorageUtils.setItem('friendlyvoice_preferences_lastUpdated', Date.now().toString());
  }, [getUserVoices]);

  const deleteVoice = useCallback((userId: string, vozId: string) => {
    const list = getUserVoices(userId);
    const next = list.filter(v => v.id !== vozId);
    localStorageUtils.setItem(keyFor(userId), next);
    localStorageUtils.setItem('friendlyvoice_preferences_lastUpdated', Date.now().toString());
  }, [getUserVoices]);

  return { getUserVoices, addVoice, deleteVoice };
}
