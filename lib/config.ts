// Centralised config. One change here swaps model/provider for the whole app.

export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBEDDING_DIM = 384;

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

export const CHUNK_TARGET_TOKENS = 400;
export const CHUNK_OVERLAP_TOKENS = 50;
export const CHARS_PER_TOKEN = 4;

export const RETRIEVE_TOP_K = 5;

// Guardrails (kept conservative — also good practice to show in the code).
export const MAX_QUESTION_LENGTH = 1000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_CHUNKS_PER_UPLOAD = 50;

export const SEED_EMBEDDINGS_PATH = 'data/seed-embeddings.json';
