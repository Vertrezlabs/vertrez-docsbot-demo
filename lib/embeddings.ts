import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EMBEDDING_MODEL } from './config';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // Cast to a relaxed signature — Transformers.js's overloaded `pipeline`
    // produces a union that TS struggles to resolve under strict mode.
    const factory = pipeline as unknown as (
      task: string,
      model: string,
      options?: Record<string, unknown>,
    ) => Promise<FeatureExtractionPipeline>;
    extractorPromise = factory('feature-extraction', EMBEDDING_MODEL, {
      dtype: 'fp32',
    });
  }
  return extractorPromise;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  // tolist() returns nested arrays; for a list of inputs it's number[][].
  const tensor = output as unknown as { tolist: () => number[][] };
  return tensor.tolist();
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // Embeddings come back already L2-normalised so this is effectively a dot product.
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
