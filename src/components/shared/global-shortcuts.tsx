'use client';

import { useEffect } from 'react';
import { useIssueModal } from '@/context/issue-modal-context';
import { useCommandPalette } from '@/context/command-palette-context';
import { useShortcutsDialog } from '@/context/shortcuts-dialog-context';

export function GlobalShortcuts() {
  const { openCreateModal, closeModal, isOpen: isModalOpen } = useIssueModal();
  const { togglePalette, closePalette, isOpen: isPaletteOpen } = useCommandPalette();
  const { toggleShortcuts, closeShortcuts, isOpen: isShortcutsOpen } = useShortcutsDialog();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // Pressing "?" toggles the keyboard shortcuts dialog
      if (!isInput && e.key === '?') {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // Pressing "/" focuses the board filter/search input
      if (!isInput && e.key === '/') {
        e.preventDefault();
        const searchInput =
          document.getElementById('board-search-input') ||
          document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Pressing "c" or "C" opens the Create Issue modal
      if (!isInput && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        openCreateModal();
        return;
      }

      // Escape closes active modals or command palette
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          closeShortcuts();
        } else if (isPaletteOpen) {
          closePalette();
        } else if (isModalOpen) {
          closeModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openCreateModal,
    closeModal,
    isModalOpen,
    togglePalette,
    closePalette,
    isPaletteOpen,
    toggleShortcuts,
    closeShortcuts,
    isShortcutsOpen,
  ]);

  return null;
}
