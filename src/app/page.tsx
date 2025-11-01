'use client';

import { EcosystemCard } from '@/components/ecosystem-card';
import type { Ecosystem } from '@/types/friendly-voice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, History, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { mockEcosystems as allMockEcosystems } from '@/lib/mock-data'; // Import all mock ecosystems
import { usePreferences } from '@/contexts/preferences-context';


export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const { preferences, addToSearchHistory, clearSearchHistory } = usePreferences();

  const filteredEcosystems = allMockEcosystems.filter(eco => 
    eco.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eco.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (eco.tags && eco.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );
  
  const activeEcosystems = filteredEcosystems.filter(eco => eco.isActive);
  const inactiveEcosystems = filteredEcosystems.filter(eco => !eco.isActive);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim().length > 2) {
      addToSearchHistory(value.trim());
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchTerm(query);
    setShowHistory(false);
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-primary">Descubrir Ecosistemas</h1>
        <Button asChild>
          <Link href="/ecosystems/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Crear Ecosistema
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Buscar Ecosistemas por nombre, tema o etiqueta..." 
          className="pl-10 pr-10 w-full"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
        />
        {preferences.searchHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <History className="h-5 w-5" />
          </button>
        )}
        
        {/* Historial de búsquedas */}
        {showHistory && preferences.searchHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
            <div className="p-2 border-b flex justify-between items-center">
              <span className="text-sm font-semibold text-muted-foreground">Búsquedas recientes</span>
              <button
                onClick={clearSearchHistory}
                className="text-xs text-destructive hover:underline"
              >
                Limpiar
              </button>
            </div>
            {preferences.searchHistory.map((query, index) => (
              <button
                key={index}
                onClick={() => handleHistoryClick(query)}
                className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2 text-sm"
              >
                <History className="h-4 w-4 text-muted-foreground" />
                {query}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {filteredEcosystems.length === 0 && searchTerm && (
        <p className="text-center text-muted-foreground py-8">No se encontraron ecosistemas para "{searchTerm}".</p>
      )}


      {activeEcosystems.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Activos Ahora</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeEcosystems.map((ecosystem) => (
              <EcosystemCard key={ecosystem.id} ecosystem={ecosystem} />
            ))}
          </div>
        </div>
      )}
      
      {inactiveEcosystems.length > 0 && (
         <div>
          <h2 className="text-2xl font-semibold mb-4 mt-8">Otros Ecosistemas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveEcosystems.map((ecosystem) => (
              <EcosystemCard key={ecosystem.id} ecosystem={ecosystem} />
            ))}
          </div>
        </div>
      )}

       {filteredEcosystems.length === 0 && !searchTerm && (
        <p className="text-center text-muted-foreground py-8">No hay ecosistemas disponibles en este momento. ¡Intenta crear uno!</p>
      )}

    </div>
  );
}
