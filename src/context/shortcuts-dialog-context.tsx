'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ShortcutsContextType {
  isOpen: boolean;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  toggleShortcuts: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openShortcuts = useCallback(() => setIsOpen(true), []);
  const closeShortcuts = useCallback(() => setIsOpen(false), []);
  const toggleShortcuts = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <ShortcutsContext.Provider
      value={{
        isOpen,
        openShortcuts,
        closeShortcuts,
        toggleShortcuts,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcutsDialog() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsDialog must be used within ShortcutsProvider');
  }
  return context;
}

