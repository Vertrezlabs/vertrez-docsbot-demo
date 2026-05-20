// End-to-end smoke test that exercises the RAG pipeline directly via the lib
// (not via HTTP) so we don't depend on a running dev server.
// Run with: npm run smoke

import fs from 'node:fs';
import path from 'node:path';
import { embedText } from '../lib/embeddings';
import { vectorStore } from '../lib/vectorStore';
import { generateAnswer, chunksToContext } from '../lib/generate';
import { RETRIEVE_TOP_K } from '../lib/config';

// Tiny .env.local loader — keeps this script free of extra deps.
const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const QUESTIONS = [
  'Give me a one-paragraph summary of the documents.',
  'What are the main topics covered?',
];

async function main() {
  await vectorStore.ensureSeeded();
  const docs = vectorStore.listDocuments();
  if (docs.length === 0) {
    console.error(
      'No documents in the store. Drop some .md files into data/seed-docs/ and run `npm run seed` first.',
    );
    process.exit(1);
  }
  console.log(
    `Store contains ${docs.length} documents:`,
    docs.map((d) => `${d.name}(${d.chunkCount})`).join(', '),
  );

  for (const q of QUESTIONS) {
    console.log(`\nQ: ${q}`);
    const embedding = await embedText(q);
    const hits = vectorStore.search(embedding, RETRIEVE_TOP_K);
    console.log(
      `  top sources: ${hits
        .map((h) => `${h.record.documentName}@${(h.similarity * 100).toFixed(0)}%`)
        .join(', ')}`,
    );
    const answer = await generateAnswer(q, chunksToContext(hits.map((h) => h.record)));
    console.log(`A: ${answer}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
