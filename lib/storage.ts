import { ChatMessage, Lang, ModelMode, Project } from '@/types';
import { Node, Edge } from '@xyflow/react';

const KEYS = {
  // Settings
  API_KEY: 'gemini_api_key',
  MODEL_MODE: 'diagram_model_mode',
  OLLAMA_MODEL: 'diagram_ollama_model',
  OLLAMA_URL: 'diagram_ollama_url',
  GEMINI_MODEL: 'diagram_gemini_model',
  LANGUAGE: 'diagram_language',
  PREFERRED_DIAGRAM_TYPE: 'diagram_preferred_type',
  // Projects
  PROJECTS: 'diagram_projects',
  CURRENT_PROJECT_ID: 'diagram_current_project_id',
  // Legacy keys (pre-project era — used for migration only)
  LEGACY_MERMAID: 'diagram_mermaid_code',
  LEGACY_NODES: 'diagram_nodes',
  LEGACY_EDGES: 'diagram_edges',
  LEGACY_CHAT: 'diagram_chat_history',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — silently ignore */ }
}

export const storage = {
  // ── Settings ──────────────────────────────────────────────────────────────
  getApiKey: (): string => { try { return localStorage.getItem(KEYS.API_KEY) ?? ''; } catch { return ''; } },
  setApiKey: (k: string) => { try { localStorage.setItem(KEYS.API_KEY, k); } catch { /* noop */ } },
  removeApiKey: () => { try { localStorage.removeItem(KEYS.API_KEY); } catch { /* noop */ } },

  getModelMode: (): ModelMode => safeGet<ModelMode>(KEYS.MODEL_MODE, 'cloud'),
  setModelMode: (m: ModelMode) => safeSet(KEYS.MODEL_MODE, m),

  getOllamaModel: (): string => safeGet<string>(KEYS.OLLAMA_MODEL, 'llama3'),
  setOllamaModel: (m: string) => safeSet(KEYS.OLLAMA_MODEL, m),

  getOllamaUrl: (): string => safeGet<string>(KEYS.OLLAMA_URL, 'http://localhost:11434'),
  setOllamaUrl: (u: string) => safeSet(KEYS.OLLAMA_URL, u),

  getGeminiModel: (): string => safeGet<string>(KEYS.GEMINI_MODEL, 'gemini-2.0-flash'),
  setGeminiModel: (m: string) => safeSet(KEYS.GEMINI_MODEL, m),

  getLang: (): Lang => safeGet<Lang>(KEYS.LANGUAGE, 'en'),
  setLang: (l: Lang) => safeSet(KEYS.LANGUAGE, l),

  getPreferredDiagramType: (): 'erd' | 'uml' => safeGet<'erd' | 'uml'>(KEYS.PREFERRED_DIAGRAM_TYPE, 'erd'),
  setPreferredDiagramType: (t: 'erd' | 'uml') => safeSet(KEYS.PREFERRED_DIAGRAM_TYPE, t),

  // ── Projects ──────────────────────────────────────────────────────────────
  getProjects: (): Project[] => safeGet<Project[]>(KEYS.PROJECTS, []),
  setProjects: (p: Project[]) => safeSet(KEYS.PROJECTS, p),

  getCurrentProjectId: (): string | null => safeGet<string | null>(KEYS.CURRENT_PROJECT_ID, null),
  setCurrentProjectId: (id: string | null) => safeSet(KEYS.CURRENT_PROJECT_ID, id),

  // ── Legacy (migration only) ────────────────────────────────────────────────
  getLegacyMermaid: (): string => safeGet<string>(KEYS.LEGACY_MERMAID, ''),
  getLegacyNodes: (): Node[] => safeGet<Node[]>(KEYS.LEGACY_NODES, []),
  getLegacyEdges: (): Edge[] => safeGet<Edge[]>(KEYS.LEGACY_EDGES, []),
  getLegacyChat: (): ChatMessage[] => safeGet<ChatMessage[]>(KEYS.LEGACY_CHAT, []),
  clearLegacy: () => {
    try {
      [KEYS.LEGACY_MERMAID, KEYS.LEGACY_NODES, KEYS.LEGACY_EDGES, KEYS.LEGACY_CHAT].forEach(k =>
        localStorage.removeItem(k)
      );
    } catch { /* noop */ }
  },
};
