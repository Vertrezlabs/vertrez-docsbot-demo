'use client';

import { Sparkles, Menu } from 'lucide-react';

export function TopBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-subtle bg-base/80 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="btn-ghost md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-subtle bg-elevated">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-primary">
            Vertrez DocsBot
          </span>
        </div>
      </div>
      <a
        href="https://vertrez.dev"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted transition-colors hover:text-secondary"
      >
        Built by Vertrez · vertrez.dev
      </a>
    </header>
  );
}
