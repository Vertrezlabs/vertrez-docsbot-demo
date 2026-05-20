import { NextResponse } from 'next/server';
import { extractText, inferKindFromName } from '@/lib/extract';
import { chunkText } from '@/lib/chunker';
import { embedTexts } from '@/lib/embeddings';
import { vectorStore, type ChunkRecord } from '@/lib/vectorStore';
import { MAX_CHUNKS_PER_UPLOAD, MAX_UPLOAD_BYTES } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart/form-data with a `file` field' },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing `file` field' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const kind = inferKindFromName(file.name);
  if (!kind) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use .pdf, .txt, or .md.' },
      { status: 415 },
    );
  }

  await vectorStore.ensureSeeded();

  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    text = await extractText(buf, file.name);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not parse ${file.name}: ${(err as Error).message}` },
      { status: 422 },
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: 'No extractable text found in file' },
      { status: 422 },
    );
  }

  const chunks = chunkText(text).slice(0, MAX_CHUNKS_PER_UPLOAD);
  if (chunks.length === 0) {
    return NextResponse.json({ error: 'Could not chunk file' }, { status: 422 });
  }

  const embeddings = await embedTexts(chunks);
  const documentName = file.name;
  const records: ChunkRecord[] = chunks.map((content, i) => ({
    id: `upload:${documentName}:${i}:${Date.now()}`,
    documentName,
    sourceType: 'upload',
    content,
    chunkIndex: i,
    embedding: embeddings[i],
  }));

  vectorStore.addChunks(records);

  return NextResponse.json({
    documentName,
    chunkCount: records.length,
  });
}
