import fs from 'node:fs/promises';
import path from 'node:path';
import { cosineSimilarity } from './embeddings';
import { SEED_EMBEDDINGS_PATH } from './config';

export type SourceType = 'seed' | 'upload';

export interface ChunkRecord {
  id: string;
  documentName: string;
  sourceType: SourceType;
  content: string;
  chunkIndex: number;
  embedding: number[];
}

export interface SearchHit {
  record: ChunkRecord;
  similarity: number;
}

export interface DocumentSummary {
  name: string;
  sourceType: SourceType;
  chunkCount: number;
}

// In-memory store. Persists for the lifetime of the Node process.
// Single-process Next.js dev/start is the only target; this is intentional.
class VectorStore {
  private records: ChunkRecord[] = [];
  private seeded = false;
  private loadingPromise: Promise<void> | null = null;

  async ensureSeeded(): Promise<void> {
    if (this.seeded) return;
    if (!this.loadingPromise) {
      this.loadingPromise = this.loadSeed();
    }
    await this.loadingPromise;
  }

  private async loadSeed(): Promise<void> {
    const file = path.join(process.cwd(), SEED_EMBEDDINGS_PATH);
    try {
      const buf = await fs.readFile(file, 'utf-8');
      const parsed = JSON.parse(buf) as ChunkRecord[];
      this.records.push(...parsed);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
      // No seed file yet — that's fine, e.g. before seed.ts has been run.
    }
    this.seeded = true;
  }

  addChunks(records: ChunkRecord[]): void {
    this.records.push(...records);
  }

  search(queryEmbedding: number[], k: number): SearchHit[] {
    if (this.records.length === 0) return [];
    const hits = this.records.map((record) => ({
      record,
      similarity: cosineSimilarity(queryEmbedding, record.embedding),
    }));
    hits.sort((a, b) => b.similarity - a.similarity);
    return hits.slice(0, k);
  }

  listDocuments(): DocumentSummary[] {
    const map = new Map<string, DocumentSummary>();
    for (const r of this.records) {
      const existing = map.get(r.documentName);
      if (existing) {
        existing.chunkCount++;
      } else {
        map.set(r.documentName, {
          name: r.documentName,
          sourceType: r.sourceType,
          chunkCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.sourceType !== b.sourceType) return a.sourceType === 'seed' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  deleteDocument(name: string): { deleted: number; protected: boolean } {
    const before = this.records.length;
    const isSeed = this.records.some(
      (r) => r.documentName === name && r.sourceType === 'seed',
    );
    if (isSeed) return { deleted: 0, protected: true };
    this.records = this.records.filter((r) => r.documentName !== name);
    return { deleted: before - this.records.length, protected: false };
  }
}

// Use a globalThis-scoped singleton so Next.js dev hot-reloads don't drop state.
const globalForStore = globalThis as unknown as { __vectorStore?: VectorStore };
export const vectorStore: VectorStore =
  globalForStore.__vectorStore ?? (globalForStore.__vectorStore = new VectorStore());
