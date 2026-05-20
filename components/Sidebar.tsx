'use client';

import { useRef, useState } from 'react';
import { FileText, Upload, Trash2, Loader2, BookText, Lock } from 'lucide-react';
import type { DocumentSummary } from '@/lib/vectorStore';

interface SidebarProps {
  documents: DocumentSummary[];
  onUploaded: () => void;
  onCleared: () => void;
}

export function Sidebar({ documents, onUploaded, onCleared }: SidebarProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }
      onUploaded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleDelete(name: string) {
    setError(null);
    const url = `/api/documents?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'Delete failed');
      return;
    }
    onUploaded();
  }

  async function clearUploads() {
    setError(null);
    const uploads = documents.filter((d) => d.sourceType === 'upload');
    for (const d of uploads) {
      await fetch(`/api/documents?name=${encodeURIComponent(d.name)}`, {
        method: 'DELETE',
      });
    }
    onCleared();
  }

  const seeded = documents.filter((d) => d.sourceType === 'seed');
  const uploads = documents.filter((d) => d.sourceType === 'upload');

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto p-4">
      <div className="card p-3">
        <button
          type="button"
          className="btn w-full justify-center"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{busy ? 'Indexing…' : 'Upload document'}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
          }}
        />
        <p className="mt-2 text-[11px] leading-snug text-muted">
          .pdf, .txt, .md · max 5 MB · 50 chunks
        </p>
        {error && (
          <p className="mt-2 rounded-[8px] border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
            {error}
          </p>
        )}
      </div>

      <Section
        title="Seeded documents"
        icon={<BookText className="h-3.5 w-3.5" />}
        hint="From data/seed-docs"
      >
        {seeded.length === 0 ? (
          <EmptyHint>
            Drop files into <code className="text-secondary">data/seed-docs/</code>{' '}
            then run <code className="text-secondary">npm run seed</code>.
          </EmptyHint>
        ) : (
          seeded.map((d) => <DocRow key={d.name} doc={d} protectedDoc />)
        )}
      </Section>

      <Section
        title="Your uploads"
        icon={<Upload className="h-3.5 w-3.5" />}
        hint={uploads.length ? `${uploads.length} file(s)` : 'None yet'}
        action={
          uploads.length > 0 ? (
            <button
              type="button"
              onClick={clearUploads}
              className="text-[11px] text-muted underline-offset-2 transition-colors hover:text-secondary hover:underline"
            >
              Clear my uploads
            </button>
          ) : undefined
        }
      >
        {uploads.length === 0 ? (
          <EmptyHint>
            Upload a PDF or markdown file to add it to the bot’s knowledge.
          </EmptyHint>
        ) : (
          uploads.map((d) => (
            <DocRow key={d.name} doc={d} onDelete={() => handleDelete(d.name)} />
          ))
        )}
      </Section>
    </aside>
  );
}

function Section({
  title,
  icon,
  hint,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-3">
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-secondary">
          {icon}
          <h2 className="text-xs font-semibold uppercase tracking-wide">{title}</h2>
        </div>
        {action ?? (hint && <span className="text-[10px] text-muted">{hint}</span>)}
      </header>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function DocRow({
  doc,
  protectedDoc,
  onDelete,
}: {
  doc: DocumentSummary;
  protectedDoc?: boolean;
  onDelete?: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-[8px] border border-transparent px-2 py-1.5 transition-colors hover:border-subtle hover:bg-elevated">
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-primary" title={doc.name}>
          {doc.name}
        </div>
        <div className="text-[10px] text-muted">{doc.chunkCount} chunks</div>
      </div>
      {protectedDoc ? (
        <Lock className="h-3 w-3 text-muted" />
      ) : (
        onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${doc.name}`}
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted hover:text-red-400" />
          </button>
        )
      )}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-1 text-[11px] text-muted">{children}</p>;
}
