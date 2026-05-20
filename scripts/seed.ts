// Run with: npm run seed
// Reads every markdown file in data/seed-docs/, chunks + embeds them,
// and writes data/seed-embeddings.json. Idempotent.

import fs from 'node:fs/promises';
import path from 'node:path';
import { chunkText } from '../lib/chunker';
import { embedTexts } from '../lib/embeddings';
import type { ChunkRecord } from '../lib/vectorStore';
import { SEED_EMBEDDINGS_PATH } from '../lib/config';

const SEED_DIR = path.join(process.cwd(), 'data', 'seed-docs');
const OUTPUT = path.join(process.cwd(), SEED_EMBEDDINGS_PATH);

async function main() {
  const entries = await fs.readdir(SEED_DIR);
  const files = entries.filter((f) => f.endsWith('.md') || f.endsWith('.txt'));
  if (files.length === 0) {
    console.error(`No seed docs found in ${SEED_DIR}`);
    process.exit(1);
  }

  console.log(`Seeding from ${files.length} files in ${SEED_DIR}`);

  const allRecords: ChunkRecord[] = [];
  for (const file of files.sort()) {
    const full = path.join(SEED_DIR, file);
    const text = await fs.readFile(full, 'utf-8');
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      console.warn(`  ${file}: no chunks produced, skipping`);
      continue;
    }
    console.log(`  ${file}: ${chunks.length} chunks → embedding…`);
    const embeddings = await embedTexts(chunks);
    chunks.forEach((content, i) => {
      allRecords.push({
        id: `seed:${file}:${i}`,
        documentName: file,
        sourceType: 'seed',
        content,
        chunkIndex: i,
        embedding: embeddings[i],
      });
    });
  }

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(allRecords));
  console.log(
    `\nWrote ${allRecords.length} chunks (${allRecords[0].embedding.length}-dim) → ${path.relative(process.cwd(), OUTPUT)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
