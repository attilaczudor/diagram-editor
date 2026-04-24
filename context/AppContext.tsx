'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { ChatMessage, Lang, ModelMode } from '@/types';
import { storage } from '@/lib/storage';
import { parseMermaid, ParseResult } from '@/lib/mermaid-parser';
import { applyAutoLayout } from '@/lib/auto-layout';

interface AppContextValue {
  // Settings
  lang: Lang;
  setLang: (l: Lang) => void;
  modelMode: ModelMode;
  setModelMode: (m: ModelMode) => void;
  apiKey: string;
  setApiKey: (k: string) => void;
  ollamaModel: string;
  setOllamaModel: (m: string) => void;
  preferredDiagramType: 'erd' | 'uml';
  setPreferredDiagramType: (t: 'erd' | 'uml') => void;

  // Diagram state
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  mermaidCode: string;
  setMermaidCode: (code: string) => void;
  diagramType: ParseResult['diagramType'];

  // Chat
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // Actions
  applyMermaid: (code: string, autoLayout?: boolean) => void;
  runAutoLayout: () => void;
  clearDiagram: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [modelMode, setModelModeState] = useState<ModelMode>('cloud');
  const [apiKey, setApiKeyState] = useState('');
  const [ollamaModel, setOllamaModelState] = useState('llama3');
  const [preferredDiagramType, setPreferredDiagramTypeState] = useState<'erd' | 'uml'>('erd');

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mermaidCode, setMermaidCodeState] = useState('');
  const [diagramType, setDiagramType] = useState<ParseResult['diagramType']>('unknown');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hydrate from localStorage once
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    setLangState(storage.getLang());
    setModelModeState(storage.getModelMode());
    setApiKeyState(storage.getApiKey());
    setOllamaModelState(storage.getOllamaModel());
    setPreferredDiagramTypeState(storage.getPreferredDiagramType());
    setChatHistory(storage.getChatHistory());

    const savedCode = storage.getMermaidCode();
    if (savedCode) {
      const result = parseMermaid(savedCode);
      const layed = applyAutoLayout(result.nodes, result.edges);
      setNodes(layed.nodes);
      setEdges(layed.edges);
      setMermaidCodeState(savedCode);
      setDiagramType(result.diagramType);
    } else {
      setNodes(storage.getNodes());
      setEdges(storage.getEdges());
    }
  }, []);

  // Persist settings
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.setLang(l);
  }, []);

  const setModelMode = useCallback((m: ModelMode) => {
    setModelModeState(m);
    storage.setModelMode(m);
  }, []);

  const setApiKey = useCallback((k: string) => {
    setApiKeyState(k);
    if (k) storage.setApiKey(k);
    else storage.removeApiKey();
  }, []);

  const setOllamaModel = useCallback((m: string) => {
    setOllamaModelState(m);
    storage.setOllamaModel(m);
  }, []);

  const setPreferredDiagramType = useCallback((type: 'erd' | 'uml') => {
    setPreferredDiagramTypeState(type);
    storage.setPreferredDiagramType(type);
  }, []);

  const setMermaidCode = useCallback((code: string) => {
    setMermaidCodeState(code);
    storage.setMermaidCode(code);
  }, []);

  // Persist nodes/edges when they change (debounced)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated.current) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      storage.setNodes(nodes);
      storage.setEdges(edges);
    }, 800);
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current); };
  }, [nodes, edges]);

  // Persist chat history
  useEffect(() => {
    if (!hydrated.current) return;
    storage.setChatHistory(chatHistory);
  }, [chatHistory]);

  const applyMermaid = useCallback((code: string, autoLayout = true) => {
    const result = parseMermaid(code);
    const { nodes: n, edges: e } = autoLayout
      ? applyAutoLayout(result.nodes, result.edges)
      : { nodes: result.nodes, edges: result.edges };
    setNodes(n);
    setEdges(e);
    setDiagramType(result.diagramType);
    setMermaidCode(code);
  }, [setMermaidCode]);

  const runAutoLayout = useCallback(() => {
    setNodes((prev) => {
      const { nodes: n } = applyAutoLayout(prev, edges);
      return n;
    });
  }, [edges]);

  const clearDiagram = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setMermaidCodeState('');
    setDiagramType('unknown');
    setChatHistory([]);
    storage.clearDiagram();
  }, []);

  const value: AppContextValue = {
    lang, setLang,
    modelMode, setModelMode,
    apiKey, setApiKey,
    ollamaModel, setOllamaModel,
    preferredDiagramType, setPreferredDiagramType,
    nodes, setNodes,
    edges, setEdges,
    mermaidCode, setMermaidCode,
    diagramType,
    chatHistory, setChatHistory,
    isGenerating, setIsGenerating,
    applyMermaid,
    runAutoLayout,
    clearDiagram,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
