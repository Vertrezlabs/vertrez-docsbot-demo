// Text extraction for uploaded files. PDF parsing is loaded dynamically because
// the `pdf-parse` package executes a debug branch on bare require that tries
// to read a non-existent test file — breaking Next.js bundling. Dynamic import
// at call time sidesteps that.

export type SupportedMime =
  | 'application/pdf'
  | 'text/plain'
  | 'text/markdown'
  | 'application/octet-stream'; // some browsers send this for .md

export function inferKindFromName(name: string): 'pdf' | 'text' | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'text';
  return null;
}

export async function extractText(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const kind = inferKindFromName(filename);
  if (kind === 'text') {
    return buffer.toString('utf-8');
  }
  if (kind === 'pdf') {
    const mod = (await import('pdf-parse/lib/pdf-parse.js')) as unknown as {
      default: (data: Buffer) => Promise<{ text: string }>;
    };
    const parsed = await mod.default(buffer);
    return parsed.text;
  }
  throw new Error(`Unsupported file type: ${filename}. Use .pdf, .txt or .md.`);
}
