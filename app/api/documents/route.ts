import { NextResponse } from 'next/server';
import { vectorStore } from '@/lib/vectorStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await vectorStore.ensureSeeded();
  return NextResponse.json({ documents: vectorStore.listDocuments() });
}

export async function DELETE(req: Request) {
  await vectorStore.ensureSeeded();
  const url = new URL(req.url);
  const name = url.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'name query param required' }, { status: 400 });
  }
  const result = vectorStore.deleteDocument(name);
  if (result.protected) {
    return NextResponse.json(
      { error: 'Seeded documents are protected and cannot be deleted' },
      { status: 403 },
    );
  }
  if (result.deleted === 0) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: result.deleted });
}
