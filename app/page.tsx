'use client';

import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { ChatInterface } from '@/components/ChatInterface';
import type { DocumentSummary } from '@/lib/vectorStore';

export default function Page() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' });
      const data = (await res.json()) as { documents: DocumentSummary[] };
      setDocuments(data.documents ?? []);
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`${
            sidebarOpen ? 'flex' : 'hidden'
          } w-72 shrink-0 border-r border-subtle bg-base md:flex`}
        >
          <Sidebar documents={documents} onUploaded={reload} onCleared={reload} />
        </div>
        <main className="flex-1 overflow-hidden">
          <ChatInterface hasDocuments={documents.length > 0} />
        </main>
      </div>
    </div>
  );
}
