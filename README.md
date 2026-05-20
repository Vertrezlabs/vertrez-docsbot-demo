# Vertrez DocsBot

Small local RAG demo. Upload PDFs / markdown / text files, ask questions, get answers grounded in the documents you uploaded, with the source passages cited under each answer.

Embeddings run locally (Transformers.js, MiniLM-L6). Answer generation goes to Gemini's free tier. Everything stays on your machine — there's no deployment, no database.

## Setup

```bash
npm install
cp .env.example .env.local   # paste your Gemini key
npm run dev
```

Free Gemini key from https://aistudio.google.com — no credit card needed.

Open http://localhost:3000, drop a file in the sidebar, ask away.

## Optional: pre-seed docs

If you want the bot to start with some baseline knowledge that survives restarts, drop `.md` or `.txt` files into `data/seed-docs/` and run:

```bash
npm run seed
```

That builds `data/seed-embeddings.json`, which the server loads on startup. Re-run any time you change a seed file.

Without seeding, the bot just starts empty — uploads added through the UI live in memory until the server restarts.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind v3
- `@huggingface/transformers` — local embeddings (`Xenova/all-MiniLM-L6-v2`)
- `@google/genai` — `gemini-2.5-flash` for generation
- In-memory vector store with cosine search
- `pdf-parse` for PDFs

## Scripts

```
npm run dev      # dev server
npm run build    # production build
npm run start    # run the production build
npm run seed     # rebuild seed-embeddings.json from data/seed-docs/
```

## Notes

- Uploads are in-memory only and gone on server restart. For persistence, swap `lib/vectorStore.ts` for a real vector DB.
- Generation lives behind a single `generateAnswer()` in `lib/generate.ts` — switching providers is a one-file change.
- The model cache (~25 MB) is downloaded once on first run and cached locally.
- Guardrails in `lib/config.ts`: 1000 char question limit, 5 MB upload limit, 50 chunks per upload, top-5 retrieval.
