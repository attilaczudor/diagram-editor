export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

export interface PullProgress {
  status: string;
  percent?: number;
  done?: boolean;
}

export async function listModels(baseUrl: string): Promise<OllamaModel[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const data = await res.json() as { models?: OllamaModel[] };
  return data.models ?? [];
}

export async function pullModel(
  baseUrl: string,
  modelName: string,
  onProgress: (p: PullProgress) => void
): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: true }),
  });
  if (!res.ok) throw new Error(`Pull failed: ${res.status} ${res.statusText}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line) as { status: string; total?: number; completed?: number; error?: string };
        if (evt.error) throw new Error(evt.error);
        const percent =
          evt.total && evt.completed ? Math.round((evt.completed / evt.total) * 100) : undefined;
        onProgress({ status: evt.status, percent, done: evt.status === 'success' });
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

export function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export const OLLAMA_LIBRARY = [
  { id: 'llama3.2:3b',         label: 'Llama 3.2 3B',         size: '2.0 GB', desc: 'Meta · fast & efficient' },
  { id: 'llama3.2:1b',         label: 'Llama 3.2 1B',         size: '1.3 GB', desc: 'Meta · ultra-light' },
  { id: 'llama3.1:8b',         label: 'Llama 3.1 8B',         size: '4.7 GB', desc: 'Meta · solid all-rounder' },
  { id: 'mistral:7b',          label: 'Mistral 7B',           size: '4.1 GB', desc: 'Mistral AI · instruction' },
  { id: 'qwen2.5:7b',          label: 'Qwen 2.5 7B',          size: '4.7 GB', desc: 'Alibaba · multilingual' },
  { id: 'qwen2.5:14b',         label: 'Qwen 2.5 14B',         size: '9.0 GB', desc: 'Alibaba · powerful' },
  { id: 'qwen2.5-coder:7b',    label: 'Qwen 2.5 Coder 7B',   size: '4.7 GB', desc: 'Alibaba · code specialist' },
  { id: 'gemma2:2b',           label: 'Gemma 2 2B',           size: '1.6 GB', desc: 'Google · tiny & smart' },
  { id: 'gemma2:9b',           label: 'Gemma 2 9B',           size: '5.4 GB', desc: 'Google · high quality' },
  { id: 'phi3.5:mini',         label: 'Phi 3.5 Mini',         size: '2.2 GB', desc: 'Microsoft · reasoning' },
  { id: 'deepseek-r1:7b',      label: 'DeepSeek-R1 7B',       size: '4.7 GB', desc: 'DeepSeek · reasoning' },
  { id: 'deepseek-r1:14b',     label: 'DeepSeek-R1 14B',      size: '9.0 GB', desc: 'DeepSeek · strong reasoning' },
  { id: 'codellama:7b',        label: 'CodeLlama 7B',         size: '3.8 GB', desc: 'Meta · code generation' },
  { id: 'nomic-embed-text',    label: 'Nomic Embed Text',     size: '274 MB', desc: 'Embeddings model' },
];
