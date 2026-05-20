import { NextResponse } from 'next/server';
import { embedText } from '@/lib/embeddings';
import { vectorStore } from '@/lib/vectorStore';
import { generateAnswer, chunksToContext } from '@/lib/generate';
import { MAX_QUESTION_LENGTH, RETRIEVE_TOP_K } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  question?: unknown;
}

interface SourcePayload {
  documentName: string;
  sourceType: 'seed' | 'upload';
  chunkIndex: number;
  similarity: number;
  snippet: string;
}

const SNIPPET_LEN = 280;

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Question is too long (max ${MAX_QUESTION_LENGTH} chars)` },
      { status: 400 },
    );
  }

  await vectorStore.ensureSeeded();

  const queryEmbedding = await embedText(question);
  const hits = vectorStore.search(queryEmbedding, RETRIEVE_TOP_K);

  if (hits.length === 0) {
    return NextResponse.json({
      answer:
        "There are no documents loaded yet. Upload one in the sidebar, or restart the server after running `npm run seed`.",
      sources: [] satisfies SourcePayload[],
    });
  }

  const answer = await generateAnswer(
    question,
    chunksToContext(hits.map((h) => h.record)),
  );

  const sources: SourcePayload[] = hits.map((h) => ({
    documentName: h.record.documentName,
    sourceType: h.record.sourceType,
    chunkIndex: h.record.chunkIndex,
    similarity: Number(h.similarity.toFixed(4)),
    snippet:
      h.record.content.length > SNIPPET_LEN
        ? `${h.record.content.slice(0, SNIPPET_LEN).trim()}…`
        : h.record.content,
  }));

  return NextResponse.json({ answer, sources });
}
