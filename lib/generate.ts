import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from './config';
import type { ChunkRecord } from './vectorStore';

const SYSTEM_PROMPT = `You are a precise documentation assistant. Answer the user's question using ONLY the context passages provided below.
- If the answer is in the context, answer concisely and accurately.
- If it is not in the context, say: "I couldn't find that in the available documents." Do not invent information.
- The system displays sources to the user separately, so answer naturally without inline citation markers.
- Keep answers focused, no filler.`;

let clientPromise: Promise<GoogleGenAI> | null = null;

function getClient(): Promise<GoogleGenAI> {
  if (!clientPromise) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Promise.reject(
        new Error(
          'GEMINI_API_KEY is not set. Add it to .env.local (free key from https://aistudio.google.com).',
        ),
      );
    }
    clientPromise = Promise.resolve(new GoogleGenAI({ apiKey }));
  }
  return clientPromise;
}

export interface ContextChunk {
  documentName: string;
  content: string;
}

// Provider-agnostic entry point. Swap this file to switch LLM provider
// (e.g. to Anthropic Claude in production); the rest of the app is unchanged.
export async function generateAnswer(
  question: string,
  contextChunks: ContextChunk[],
): Promise<string> {
  const client = await getClient();

  const contextBlock = contextChunks
    .map(
      (c, i) =>
        `[Passage ${i + 1} — ${c.documentName}]\n${c.content}`,
    )
    .join('\n\n');

  const userPrompt = `Context passages:\n${contextBlock}\n\nQuestion: ${question}`;

  const result = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
    },
  });

  const text = result.text?.trim();
  if (!text) {
    throw new Error('Empty response from generation model');
  }
  return text;
}

// Helper used by the chat route. Keeping the conversion here means the route
// stays a thin HTTP shim around the RAG library.
export function chunksToContext(chunks: ChunkRecord[]): ContextChunk[] {
  return chunks.map((c) => ({
    documentName: c.documentName,
    content: c.content,
  }));
}
