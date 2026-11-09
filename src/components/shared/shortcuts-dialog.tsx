'use client';

import React from 'react';
import { useShortcutsDialog } from '@/context/shortcuts-dialog-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard, Sparkles } from 'lucide-react';

export function ShortcutsDialog() {
  const { isOpen, closeShortcuts } = useShortcutsDialog();

  const shortcutGroups = [
    {
      title: 'Global & Navigation',
      shortcuts: [
        { key: '⌘ K', desc: 'Open Command Palette' },
        { key: '?', desc: 'Show Keyboard Shortcuts' },
        { key: 'T', desc: 'Toggle Dark / Light Theme' },
        { key: 'G then B', desc: 'Go to Kanban Board' },
        { key: 'G then L', desc: 'Go to Project Backlog' },
        { key: 'G then T', desc: 'Go to Trash Bin' },
        { key: 'G then S', desc: 'Go to Project Settings' },
      ],
    },
    {
      title: 'Issue Actions',
      shortcuts: [
        { key: 'C', desc: 'Create new Issue' },
        { key: '/', desc: 'Focus Board Filter & Search' },
        { key: 'Esc', desc: 'Close open dialog or search' },
        { key: 'Click Card', desc: 'Open Issue Details Modal' },
        { key: 'Drag Card', desc: 'Move issue across workflow' },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeShortcuts()}>
      <DialogContent className="max-w-lg w-[95vw] sm:max-w-lg p-0 overflow-hidden bg-popover border border-border rounded-xl shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-primary" />
            <DialogTitle className="text-base font-semibold">Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Developer hotkeys for rapid issue triage and navigation
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5 text-xs">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </h4>
              <div className="border border-border/60 rounded-lg overflow-hidden divide-y divide-border/40">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.desc}
                    className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-foreground">{sc.desc}</span>
                    <kbd className="font-mono text-[11px] bg-muted border border-border/80 px-2 py-0.5 rounded shadow-2xs font-semibold text-muted-foreground">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground px-5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary" />
            <span>Tykket Developer Experience</span>
          </div>
          <kbd className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border">
            Press ESC to close
          </kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
