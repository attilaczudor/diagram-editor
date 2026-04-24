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

export interface OllamaLibraryModel {
  id: string;
  label: string;
  size: string;
  desc: string;
  category: 'local' | 'cloud';
  tags: string[];
}

export async function listModels(baseUrl: string): Promise<OllamaModel[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const data = (await res.json()) as { models?: OllamaModel[] };
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
        const evt = JSON.parse(line) as {
          status: string;
          total?: number;
          completed?: number;
          error?: string;
        };
        if (evt.error) throw new Error(evt.error);
        const percent =
          evt.total && evt.completed
            ? Math.round((evt.completed / evt.total) * 100)
            : undefined;
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

// ─── Full Ollama model library ────────────────────────────────────────────────
// category 'local'  = fits on consumer hardware (≤ ~14B / ≤ ~10 GB)
// category 'cloud'  = requires server / cloud GPU   (≥ 27B  / ≥ ~16 GB)

export const OLLAMA_LIBRARY: OllamaLibraryModel[] = [
  // ── Meta Llama ──────────────────────────────────────────────────────────────
  { id: 'llama3.2:1b',          label: 'Llama 3.2 1B',           size: '1.3 GB',  desc: 'Meta · ultra-light',            category: 'local', tags: ['meta', 'llama'] },
  { id: 'llama3.2:3b',          label: 'Llama 3.2 3B',           size: '2.0 GB',  desc: 'Meta · fast & efficient',       category: 'local', tags: ['meta', 'llama'] },
  { id: 'llama3.1:8b',          label: 'Llama 3.1 8B',           size: '4.7 GB',  desc: 'Meta · solid all-rounder',      category: 'local', tags: ['meta', 'llama'] },
  { id: 'llama3:8b',            label: 'Llama 3 8B',             size: '4.7 GB',  desc: 'Meta · popular base',           category: 'local', tags: ['meta', 'llama'] },
  { id: 'llama2:7b',            label: 'Llama 2 7B',             size: '3.8 GB',  desc: 'Meta · proven reliable',        category: 'local', tags: ['meta', 'llama'] },
  { id: 'llama2:13b',           label: 'Llama 2 13B',            size: '7.4 GB',  desc: 'Meta · larger base',            category: 'local', tags: ['meta', 'llama'] },
  { id: 'llama3.3:70b',         label: 'Llama 3.3 70B',          size: '43 GB',   desc: 'Meta · latest large',           category: 'cloud', tags: ['meta', 'llama'] },
  { id: 'llama3.1:70b',         label: 'Llama 3.1 70B',          size: '40 GB',   desc: 'Meta · high performance',       category: 'cloud', tags: ['meta', 'llama'] },
  { id: 'llama3.1:405b',        label: 'Llama 3.1 405B',         size: '231 GB',  desc: 'Meta · frontier model',         category: 'cloud', tags: ['meta', 'llama'] },
  { id: 'llama3:70b',           label: 'Llama 3 70B',            size: '40 GB',   desc: 'Meta · powerful',               category: 'cloud', tags: ['meta', 'llama'] },
  { id: 'llama2:70b',           label: 'Llama 2 70B',            size: '39 GB',   desc: 'Meta · large proven',           category: 'cloud', tags: ['meta', 'llama'] },
  // ── Mistral ─────────────────────────────────────────────────────────────────
  { id: 'mistral:7b',           label: 'Mistral 7B',             size: '4.1 GB',  desc: 'Mistral AI · instruction',      category: 'local', tags: ['mistral'] },
  { id: 'mistral-nemo',         label: 'Mistral Nemo',           size: '7.1 GB',  desc: 'Mistral AI · 12B latest',       category: 'local', tags: ['mistral'] },
  { id: 'mistral-large',        label: 'Mistral Large',          size: '69 GB',   desc: 'Mistral AI · flagship',         category: 'cloud', tags: ['mistral'] },
  { id: 'mixtral:8x7b',         label: 'Mixtral 8×7B',           size: '26 GB',   desc: 'Mistral AI · MoE efficient',    category: 'cloud', tags: ['mistral', 'moe'] },
  { id: 'mixtral:8x22b',        label: 'Mixtral 8×22B',          size: '80 GB',   desc: 'Mistral AI · large MoE',        category: 'cloud', tags: ['mistral', 'moe'] },
  // ── Qwen ────────────────────────────────────────────────────────────────────
  { id: 'qwen2.5:0.5b',         label: 'Qwen 2.5 0.5B',          size: '397 MB',  desc: 'Alibaba · tiny',                category: 'local', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5:1.5b',         label: 'Qwen 2.5 1.5B',          size: '1.0 GB',  desc: 'Alibaba · very small',          category: 'local', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5:3b',           label: 'Qwen 2.5 3B',            size: '2.0 GB',  desc: 'Alibaba · compact',             category: 'local', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5:7b',           label: 'Qwen 2.5 7B',            size: '4.7 GB',  desc: 'Alibaba · multilingual',        category: 'local', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5:14b',          label: 'Qwen 2.5 14B',           size: '9.0 GB',  desc: 'Alibaba · powerful',            category: 'local', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5:32b',          label: 'Qwen 2.5 32B',           size: '20 GB',   desc: 'Alibaba · very powerful',       category: 'cloud', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5:72b',          label: 'Qwen 2.5 72B',           size: '47 GB',   desc: 'Alibaba · flagship',            category: 'cloud', tags: ['alibaba', 'qwen'] },
  { id: 'qwen2.5-coder:1.5b',   label: 'Qwen 2.5 Coder 1.5B',   size: '986 MB',  desc: 'Alibaba · code tiny',           category: 'local', tags: ['alibaba', 'qwen', 'code'] },
  { id: 'qwen2.5-coder:7b',     label: 'Qwen 2.5 Coder 7B',     size: '4.7 GB',  desc: 'Alibaba · code',                category: 'local', tags: ['alibaba', 'qwen', 'code'] },
  { id: 'qwen2.5-coder:14b',    label: 'Qwen 2.5 Coder 14B',    size: '9.0 GB',  desc: 'Alibaba · strong code',         category: 'local', tags: ['alibaba', 'qwen', 'code'] },
  { id: 'qwen2.5-coder:32b',    label: 'Qwen 2.5 Coder 32B',    size: '20 GB',   desc: 'Alibaba · powerful code',       category: 'cloud', tags: ['alibaba', 'qwen', 'code'] },
  // ── Google Gemma ─────────────────────────────────────────────────────────────
  { id: 'gemma2:2b',            label: 'Gemma 2 2B',             size: '1.6 GB',  desc: 'Google · tiny & smart',         category: 'local', tags: ['google', 'gemma'] },
  { id: 'gemma2:9b',            label: 'Gemma 2 9B',             size: '5.4 GB',  desc: 'Google · high quality',         category: 'local', tags: ['google', 'gemma'] },
  { id: 'gemma2:27b',           label: 'Gemma 2 27B',            size: '16 GB',   desc: 'Google · best quality',         category: 'cloud', tags: ['google', 'gemma'] },
  { id: 'gemma:2b',             label: 'Gemma 2B',               size: '1.4 GB',  desc: 'Google · original tiny',        category: 'local', tags: ['google', 'gemma'] },
  { id: 'gemma:7b',             label: 'Gemma 7B',               size: '4.8 GB',  desc: 'Google · original',             category: 'local', tags: ['google', 'gemma'] },
  // ── Microsoft Phi ────────────────────────────────────────────────────────────
  { id: 'phi4:14b',             label: 'Phi-4 14B',              size: '8.9 GB',  desc: 'Microsoft · latest small',      category: 'local', tags: ['microsoft', 'phi'] },
  { id: 'phi3.5:mini',          label: 'Phi 3.5 Mini',           size: '2.2 GB',  desc: 'Microsoft · reasoning',         category: 'local', tags: ['microsoft', 'phi'] },
  { id: 'phi3:mini',            label: 'Phi 3 Mini',             size: '2.3 GB',  desc: 'Microsoft · efficient',         category: 'local', tags: ['microsoft', 'phi'] },
  { id: 'phi3:medium',          label: 'Phi 3 Medium',           size: '7.9 GB',  desc: 'Microsoft · balanced',          category: 'local', tags: ['microsoft', 'phi'] },
  // ── DeepSeek ─────────────────────────────────────────────────────────────────
  { id: 'deepseek-r1:1.5b',     label: 'DeepSeek-R1 1.5B',      size: '1.1 GB',  desc: 'DeepSeek · tiny reasoning',     category: 'local', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-r1:7b',       label: 'DeepSeek-R1 7B',        size: '4.7 GB',  desc: 'DeepSeek · reasoning',          category: 'local', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-r1:8b',       label: 'DeepSeek-R1 8B',        size: '4.9 GB',  desc: 'DeepSeek · reasoning',          category: 'local', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-r1:14b',      label: 'DeepSeek-R1 14B',       size: '9.0 GB',  desc: 'DeepSeek · strong reasoning',   category: 'local', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-r1:32b',      label: 'DeepSeek-R1 32B',       size: '20 GB',   desc: 'DeepSeek · powerful reasoning', category: 'cloud', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-r1:70b',      label: 'DeepSeek-R1 70B',       size: '43 GB',   desc: 'DeepSeek · very strong',        category: 'cloud', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-r1:671b',     label: 'DeepSeek-R1 671B',      size: '404 GB',  desc: 'DeepSeek · frontier',           category: 'cloud', tags: ['deepseek', 'reasoning'] },
  { id: 'deepseek-v3',          label: 'DeepSeek V3',           size: '404 GB',  desc: 'DeepSeek · latest frontier',    category: 'cloud', tags: ['deepseek'] },
  // ── Code models ──────────────────────────────────────────────────────────────
  { id: 'codellama:7b',         label: 'CodeLlama 7B',           size: '3.8 GB',  desc: 'Meta · code generation',        category: 'local', tags: ['meta', 'code'] },
  { id: 'codellama:13b',        label: 'CodeLlama 13B',          size: '7.4 GB',  desc: 'Meta · better code',            category: 'local', tags: ['meta', 'code'] },
  { id: 'codellama:34b',        label: 'CodeLlama 34B',          size: '19 GB',   desc: 'Meta · best code quality',      category: 'cloud', tags: ['meta', 'code'] },
  { id: 'codellama:70b',        label: 'CodeLlama 70B',          size: '39 GB',   desc: 'Meta · maximum code',           category: 'cloud', tags: ['meta', 'code'] },
  // ── Others ───────────────────────────────────────────────────────────────────
  { id: 'solar:10.7b',          label: 'Solar 10.7B',            size: '6.1 GB',  desc: 'Upstage · high performance',    category: 'local', tags: ['upstage'] },
  { id: 'neural-chat:7b',       label: 'Neural Chat 7B',         size: '4.1 GB',  desc: 'Intel · optimized chat',        category: 'local', tags: ['intel'] },
  { id: 'vicuna:7b',            label: 'Vicuna 7B',              size: '3.8 GB',  desc: 'LMSYS · instruction tuned',     category: 'local', tags: ['lmsys'] },
  { id: 'vicuna:13b',           label: 'Vicuna 13B',             size: '7.4 GB',  desc: 'LMSYS · larger',                category: 'local', tags: ['lmsys'] },
  { id: 'orca-mini:3b',         label: 'Orca Mini 3B',           size: '1.9 GB',  desc: 'Microsoft · reasoning tiny',    category: 'local', tags: ['microsoft'] },
  { id: 'command-r:35b',        label: 'Command-R 35B',          size: '20 GB',   desc: 'Cohere · RAG specialist',       category: 'cloud', tags: ['cohere', 'rag'] },
  { id: 'command-r-plus:104b',  label: 'Command-R+ 104B',        size: '60 GB',   desc: 'Cohere · enterprise RAG',       category: 'cloud', tags: ['cohere', 'rag'] },
  // ── Vision models ────────────────────────────────────────────────────────────
  { id: 'llava:7b',             label: 'LLaVA 7B',               size: '4.7 GB',  desc: 'Vision + language',             category: 'local', tags: ['vision'] },
  { id: 'llava:13b',            label: 'LLaVA 13B',              size: '8.0 GB',  desc: 'Vision · stronger',             category: 'local', tags: ['vision'] },
  { id: 'llava:34b',            label: 'LLaVA 34B',              size: '20 GB',   desc: 'Vision · best quality',         category: 'cloud', tags: ['vision'] },
  { id: 'bakllava:7b',          label: 'BakLLaVA 7B',            size: '4.7 GB',  desc: 'Mistral-based vision',          category: 'local', tags: ['vision'] },
  // ── Embeddings ───────────────────────────────────────────────────────────────
  { id: 'nomic-embed-text',     label: 'Nomic Embed Text',       size: '274 MB',  desc: 'Nomic · text embeddings',       category: 'local', tags: ['embeddings'] },
  { id: 'mxbai-embed-large',    label: 'MXBai Embed Large',      size: '670 MB',  desc: 'MixedBread · embeddings',       category: 'local', tags: ['embeddings'] },
  { id: 'all-minilm',           label: 'All-MiniLM',             size: '46 MB',   desc: 'Sentence transformers · tiny',  category: 'local', tags: ['embeddings'] },
];
