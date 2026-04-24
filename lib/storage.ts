import { ChatMessage, Lang, ModelMode } from '@/types';
import { Node, Edge } from '@xyflow/react';

const KEYS = {
  API_KEY: 'gemini_api_key',
  MODEL_MODE: 'diagram_model_mode',
  OLLAMA_MODEL: 'diagram_ollama_model',
  LANGUAGE: 'diagram_language',
  PREFERRED_DIAGRAM_TYPE: 'diagram_preferred_type',
  CHAT_HISTORY: 'diagram_chat_history',
  MERMAID_CODE: 'diagram_mermaid_code',
  NODES: 'diagram_nodes',
  EDGES: 'diagram_edges',
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
  } catch {
    // Storage quota exceeded or unavailable — silently ignore
  }
}

export const storage = {
  getApiKey: (): string => {
    try { return localStorage.getItem(KEYS.API_KEY) ?? ''; } catch { return ''; }
  },
  setApiKey: (key: string): void => {
    try { localStorage.setItem(KEYS.API_KEY, key); } catch { /* noop */ }
  },
  removeApiKey: (): void => {
    try { localStorage.removeItem(KEYS.API_KEY); } catch { /* noop */ }
  },

  getModelMode: (): ModelMode => safeGet<ModelMode>(KEYS.MODEL_MODE, 'cloud'),
  setModelMode: (m: ModelMode) => safeSet(KEYS.MODEL_MODE, m),

  getOllamaModel: (): string => safeGet<string>(KEYS.OLLAMA_MODEL, 'llama3'),
  setOllamaModel: (m: string) => safeSet(KEYS.OLLAMA_MODEL, m),

  getLang: (): Lang => safeGet<Lang>(KEYS.LANGUAGE, 'en'),
  setLang: (l: Lang) => safeSet(KEYS.LANGUAGE, l),

  getPreferredDiagramType: (): 'erd' | 'uml' => safeGet<'erd' | 'uml'>(KEYS.PREFERRED_DIAGRAM_TYPE, 'erd'),
  setPreferredDiagramType: (t: 'erd' | 'uml') => safeSet(KEYS.PREFERRED_DIAGRAM_TYPE, t),

  getChatHistory: (): ChatMessage[] => safeGet<ChatMessage[]>(KEYS.CHAT_HISTORY, []),
  setChatHistory: (h: ChatMessage[]) => safeSet(KEYS.CHAT_HISTORY, h),

  getMermaidCode: (): string => safeGet<string>(KEYS.MERMAID_CODE, ''),
  setMermaidCode: (c: string) => safeSet(KEYS.MERMAID_CODE, c),

  getNodes: (): Node[] => safeGet<Node[]>(KEYS.NODES, []),
  setNodes: (n: Node[]) => safeSet(KEYS.NODES, n),

  getEdges: (): Edge[] => safeGet<Edge[]>(KEYS.EDGES, []),
  setEdges: (e: Edge[]) => safeSet(KEYS.EDGES, e),

  clearDiagram: (): void => {
    try {
      localStorage.removeItem(KEYS.CHAT_HISTORY);
      localStorage.removeItem(KEYS.MERMAID_CODE);
      localStorage.removeItem(KEYS.NODES);
      localStorage.removeItem(KEYS.EDGES);
    } catch { /* noop */ }
  },
};
