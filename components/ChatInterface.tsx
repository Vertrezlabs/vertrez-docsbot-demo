'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, FileText, ChevronDown, Upload } from 'lucide-react';
import { MAX_QUESTION_LENGTH } from '@/lib/config';

interface Source {
  documentName: string;
  sourceType: 'seed' | 'upload';
  chunkIndex: number;
  similarity: number;
  snippet: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  pending?: boolean;
  error?: boolean;
}

// Generic starter questions — these work against any document set
// because they describe shape rather than content.
const GENERIC_SUGGESTIONS = [
  'Give me a one-paragraph summary of the documents.',
  'What are the main topics covered?',
  'List anything in the docs about pricing or cost.',
];

interface ChatInterfaceProps {
  hasDocuments: boolean;
}

export function ChatInterface({ hasDocuments }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || sending) return;
    const trimmed = question.trim().slice(0, MAX_QUESTION_LENGTH);
    setInput('');

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const placeholder: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      pending: true,
    };
    setMessages((m) => [...m, userMsg, placeholder]);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = (await res.json()) as {
        answer?: string;
        sources?: Source[];
        error?: string;
      };
      if (!res.ok || !data.answer) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setMessages((m) =>
        m.map((msg) =>
          msg.id === placeholder.id
            ? {
                ...msg,
                content: data.answer ?? '',
                sources: data.sources ?? [],
                pending: false,
              }
            : msg,
        ),
      );
    } catch (err) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === placeholder.id
            ? {
                ...msg,
                content: (err as Error).message,
                pending: false,
                error: true,
              }
            : msg,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const disabled = sending || (!hasDocuments && messages.length === 0);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
          {messages.length === 0 ? (
            <EmptyState
              hasDocuments={hasDocuments}
              onPick={(q) => void ask(q)}
            />
          ) : (
            messages.map((m) => <Bubble key={m.id} msg={m} />)
          )}
        </div>
      </div>

      <div className="border-t border-subtle bg-base/80 px-4 py-3 backdrop-blur md:px-6">
        <form
          className="mx-auto flex max-w-3xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="card flex flex-1 items-end gap-2 px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_QUESTION_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              placeholder={
                hasDocuments
                  ? 'Ask a question about the documents…'
                  : 'Upload a document in the sidebar to get started…'
              }
              rows={1}
              className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
            />
            <span className="text-[10px] text-muted">
              {input.length}/{MAX_QUESTION_LENGTH}
            </span>
          </div>
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="btn h-[42px] px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({
  hasDocuments,
  onPick,
}: {
  hasDocuments: boolean;
  onPick: (q: string) => void;
}) {
  if (!hasDocuments) {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-subtle bg-elevated">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Upload a document to get started.
          </h1>
          <p className="max-w-md text-sm text-secondary">
            Drop a PDF, markdown, or text file into the sidebar. It's chunked
            and embedded locally — no key needed for indexing — then the bot can
            answer questions about it with citations.
          </p>
        </div>
        <p className="text-xs text-muted">
          Tip: to pre-load the bot with your own documents on every startup,
          drop them into <code className="text-secondary">data/seed-docs/</code>{' '}
          and run <code className="text-secondary">npm run seed</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-subtle bg-elevated">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Ask the docs.
        </h1>
        <p className="max-w-md text-sm text-secondary">
          A retrieval-augmented bot. Answers come only from the loaded documents,
          with the exact passages cited below each reply.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {GENERIC_SUGGESTIONS.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => onPick(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[12px] border border-subtle bg-elevated px-4 py-2.5 text-sm text-primary">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="animate-fade-in flex flex-col gap-2">
      <div className="rounded-[12px] border border-subtle bg-surface px-4 py-3 text-sm leading-relaxed text-primary">
        {msg.pending ? (
          <span className="inline-flex items-center gap-2 text-secondary">
            <span className="dot animate-pulse-soft" />
            <span className="dot animate-pulse-soft [animation-delay:150ms]" />
            <span className="dot animate-pulse-soft [animation-delay:300ms]" />
          </span>
        ) : msg.error ? (
          <span className="text-red-300">{msg.content}</span>
        ) : (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        )}
      </div>
      {msg.sources && msg.sources.length > 0 && <SourcesList sources={msg.sources} />}
    </div>
  );
}

function SourcesList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[10px] border border-subtle bg-base/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs text-secondary transition-colors hover:text-primary"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          Sources ({sources.length})
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-subtle px-3 py-2">
          {sources.map((s) => (
            <li
              key={`${s.documentName}-${s.chunkIndex}`}
              className="rounded-[8px] bg-elevated p-2.5 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-primary" title={s.documentName}>
                  {s.documentName}
                </span>
                <span className="shrink-0 text-[10px] text-muted">
                  {(s.similarity * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="line-clamp-3 leading-snug text-secondary">{s.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
