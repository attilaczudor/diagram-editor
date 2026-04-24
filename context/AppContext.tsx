'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { ChatMessage, Lang, ModelMode, Project } from '@/types';
import { storage } from '@/lib/storage';
import { parseMermaid, ParseResult } from '@/lib/mermaid-parser';
import { applyAutoLayout } from '@/lib/auto-layout';

// ─── Name generator ──────────────────────────────────────────────────────────

const NAME_PREFIXES = ['Quantum', 'Cosmic', 'Crystal', 'Digital', 'Electric', 'Fluid',
  'Kinetic', 'Luminal', 'Neural', 'Prism', 'Stellar', 'Turbo', 'Vertex', 'Wave'];
const NAME_SUFFIXES = ['Blueprint', 'Canvas', 'Design', 'Flow', 'Graph',
  'Matrix', 'Model', 'Schema', 'Sketch', 'Structure'];

function generateProjectName(): string {
  const p = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const s = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  return `${p} ${s}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Context shape ────────────────────────────────────────────────────────────

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
  ollamaUrl: string;
  setOllamaUrl: (u: string) => void;
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
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;

  // Projects
  projects: Project[];
  currentProjectId: string | null;
  createProject: () => void;
  switchProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  togglePinProject: (id: string) => void;

  // Diagram actions
  applyMermaid: (code: string, autoLayout?: boolean) => void;
  runAutoLayout: () => void;
  clearDiagram: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Settings
  const [lang, setLangState] = useState<Lang>('en');
  const [modelMode, setModelModeState] = useState<ModelMode>('cloud');
  const [apiKey, setApiKeyState] = useState('');
  const [ollamaModel, setOllamaModelState] = useState('llama3');
  const [ollamaUrl, setOllamaUrlState] = useState('http://localhost:11434');
  const [preferredDiagramType, setPreferredDiagramTypeState] = useState<'erd' | 'uml'>('erd');

  // Diagram state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mermaidCode, setMermaidCodeState] = useState('');
  const [diagramType, setDiagramType] = useState<ParseResult['diagramType']>('unknown');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Projects
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);

  const hydrated = useRef(false);
  // Prevents auto-save from firing while we are loading a project
  const suppressSave = useRef(false);

  // ── Hydrate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // Settings
    setLangState(storage.getLang());
    setModelModeState(storage.getModelMode());
    setApiKeyState(storage.getApiKey());
    setOllamaModelState(storage.getOllamaModel());
    setOllamaUrlState(storage.getOllamaUrl());
    setPreferredDiagramTypeState(storage.getPreferredDiagramType());

    // Projects
    let storedProjects = storage.getProjects();
    let currentId = storage.getCurrentProjectId();

    // Migration: if no projects but legacy data exists, import it
    if (storedProjects.length === 0) {
      const legacyMermaid = storage.getLegacyMermaid();
      const legacyChat = storage.getLegacyChat();
      const legacyNodes = storage.getLegacyNodes();
      const legacyEdges = storage.getLegacyEdges();

      const firstProject: Project = {
        id: generateId(),
        name: legacyMermaid ? 'My First Diagram' : generateProjectName(),
        mermaidCode: legacyMermaid,
        nodes: legacyNodes,
        edges: legacyEdges,
        chatHistory: legacyChat,
        preferredDiagramType: storage.getPreferredDiagramType(),
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      storedProjects = [firstProject];
      currentId = firstProject.id;
      storage.setProjects(storedProjects);
      storage.setCurrentProjectId(currentId);
      storage.clearLegacy();
    }

    // Ensure currentId points to a valid project
    if (!currentId || !storedProjects.find(p => p.id === currentId)) {
      currentId = storedProjects[0]?.id ?? null;
      storage.setCurrentProjectId(currentId);
    }

    setProjectsState(storedProjects);
    setCurrentProjectIdState(currentId);

    // Load current project into diagram state
    const current = storedProjects.find(p => p.id === currentId);
    if (current) {
      loadProjectIntoState(current);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────

  function loadProjectIntoState(project: Project) {
    suppressSave.current = true;
    if (project.mermaidCode && project.nodes.length === 0) {
      const result = parseMermaid(project.mermaidCode);
      const layed = applyAutoLayout(result.nodes, result.edges);
      setNodes(layed.nodes);
      setEdges(layed.edges);
      setDiagramType(result.diagramType);
    } else {
      setNodes(project.nodes);
      setEdges(project.edges);
      const dt = parseMermaid(project.mermaidCode).diagramType;
      setDiagramType(dt);
    }
    setMermaidCodeState(project.mermaidCode);
    setChatHistory(project.chatHistory);
    setPreferredDiagramTypeState(project.preferredDiagramType);
    // Release suppress after state settles
    setTimeout(() => { suppressSave.current = false; }, 200);
  }

  function saveCurrentProjectNow(
    id: string,
    currentNodes: Node[],
    currentEdges: Edge[],
    currentMermaid: string,
    currentChat: ChatMessage[],
    currentPrefType: 'erd' | 'uml'
  ) {
    const projects = storage.getProjects();
    const idx = projects.findIndex(p => p.id === id);
    if (idx < 0) return;
    projects[idx] = {
      ...projects[idx],
      nodes: currentNodes,
      edges: currentEdges,
      mermaidCode: currentMermaid,
      chatHistory: currentChat,
      preferredDiagramType: currentPrefType,
      updatedAt: Date.now(),
    };
    storage.setProjects(projects);
  }

  // ── Auto-save current project (debounced) ─────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated.current || suppressSave.current || !currentProjectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (suppressSave.current || !currentProjectId) return;
      saveCurrentProjectNow(currentProjectId, nodes, edges, mermaidCode, chatHistory, preferredDiagramType);
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [nodes, edges, mermaidCode, chatHistory, preferredDiagramType, currentProjectId]);

  // ── Settings setters ──────────────────────────────────────────────────────

  const setLang = useCallback((l: Lang) => { setLangState(l); storage.setLang(l); }, []);
  const setModelMode = useCallback((m: ModelMode) => { setModelModeState(m); storage.setModelMode(m); }, []);
  const setApiKey = useCallback((k: string) => {
    setApiKeyState(k);
    if (k) storage.setApiKey(k); else storage.removeApiKey();
  }, []);
  const setOllamaModel = useCallback((m: string) => { setOllamaModelState(m); storage.setOllamaModel(m); }, []);
  const setOllamaUrl = useCallback((u: string) => { setOllamaUrlState(u); storage.setOllamaUrl(u); }, []);
  const setPreferredDiagramType = useCallback((type: 'erd' | 'uml') => {
    setPreferredDiagramTypeState(type);
    storage.setPreferredDiagramType(type);
  }, []);
  const setMermaidCode = useCallback((code: string) => { setMermaidCodeState(code); }, []);

  // ── Project actions ───────────────────────────────────────────────────────

  const createProject = useCallback(() => {
    // Flush any pending save for the current project
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (currentProjectId) {
      saveCurrentProjectNow(currentProjectId, nodes, edges, mermaidCode, chatHistory, preferredDiagramType);
    }

    const newProject: Project = {
      id: generateId(),
      name: generateProjectName(),
      mermaidCode: '',
      nodes: [],
      edges: [],
      chatHistory: [],
      preferredDiagramType,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setProjectsState(prev => {
      const next = [...prev, newProject];
      storage.setProjects(next);
      return next;
    });
    storage.setCurrentProjectId(newProject.id);
    setCurrentProjectIdState(newProject.id);

    suppressSave.current = true;
    setNodes([]);
    setEdges([]);
    setMermaidCodeState('');
    setDiagramType('unknown');
    setChatHistory([]);
    setTimeout(() => { suppressSave.current = false; }, 200);
  }, [currentProjectId, nodes, edges, mermaidCode, chatHistory, preferredDiagramType]);

  const switchProject = useCallback((id: string) => {
    if (id === currentProjectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (currentProjectId) {
      saveCurrentProjectNow(currentProjectId, nodes, edges, mermaidCode, chatHistory, preferredDiagramType);
    }

    const allProjects = storage.getProjects();
    const target = allProjects.find(p => p.id === id);
    if (!target) return;

    storage.setCurrentProjectId(id);
    setCurrentProjectIdState(id);
    loadProjectIntoState(target);
  }, [currentProjectId, nodes, edges, mermaidCode, chatHistory, preferredDiagramType]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameProject = useCallback((id: string, name: string) => {
    setProjectsState(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name, updatedAt: Date.now() } : p);
      storage.setProjects(next);
      return next;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjectsState(prev => {
      const next = prev.filter(p => p.id !== id);

      // If deleting the active project, switch to the nearest one
      if (id === currentProjectId) {
        const fallback = next[0];
        if (fallback) {
          storage.setCurrentProjectId(fallback.id);
          setCurrentProjectIdState(fallback.id);
          loadProjectIntoState(fallback);
        } else {
          // No projects left — create a blank one
          const blank: Project = {
            id: generateId(),
            name: generateProjectName(),
            mermaidCode: '', nodes: [], edges: [], chatHistory: [],
            preferredDiagramType: 'erd', pinned: false,
            createdAt: Date.now(), updatedAt: Date.now(),
          };
          const withBlank = [blank];
          storage.setProjects(withBlank);
          storage.setCurrentProjectId(blank.id);
          setCurrentProjectIdState(blank.id);
          suppressSave.current = true;
          setNodes([]); setEdges([]); setMermaidCodeState('');
          setDiagramType('unknown'); setChatHistory([]);
          setTimeout(() => { suppressSave.current = false; }, 200);
          return withBlank;
        }
      }

      storage.setProjects(next);
      return next;
    });
  }, [currentProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePinProject = useCallback((id: string) => {
    setProjectsState(prev => {
      const next = prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p);
      storage.setProjects(next);
      return next;
    });
  }, []);

  // ── Diagram actions ───────────────────────────────────────────────────────

  const applyMermaid = useCallback((code: string, autoLayout = true) => {
    const result = parseMermaid(code);
    const { nodes: n, edges: e } = autoLayout
      ? applyAutoLayout(result.nodes, result.edges)
      : { nodes: result.nodes, edges: result.edges };
    setNodes(n);
    setEdges(e);
    setDiagramType(result.diagramType);
    setMermaidCodeState(code);
  }, []);

  const runAutoLayout = useCallback(() => {
    setNodes(prev => applyAutoLayout(prev, edges).nodes);
  }, [edges]);

  const clearDiagram = useCallback(() => {
    suppressSave.current = true;
    setNodes([]); setEdges([]); setMermaidCodeState('');
    setDiagramType('unknown'); setChatHistory([]);
    if (currentProjectId) {
      saveCurrentProjectNow(currentProjectId, [], [], '', [], preferredDiagramType);
    }
    setTimeout(() => { suppressSave.current = false; }, 200);
  }, [currentProjectId, preferredDiagramType]);

  // ── Value ──────────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    lang, setLang,
    modelMode, setModelMode,
    apiKey, setApiKey,
    ollamaModel, setOllamaModel,
    ollamaUrl, setOllamaUrl,
    preferredDiagramType, setPreferredDiagramType,
    nodes, setNodes,
    edges, setEdges,
    mermaidCode, setMermaidCode,
    diagramType,
    chatHistory, setChatHistory,
    isGenerating, setIsGenerating,
    projects, currentProjectId,
    createProject, switchProject, renameProject, deleteProject, togglePinProject,
    applyMermaid, runAutoLayout, clearDiagram,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
