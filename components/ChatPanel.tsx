'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  Database,
  Eye,
  EyeOff,
  Key,
  Languages,
  Loader2,
  MessageSquare,
  Cpu,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { generateDiagram } from '@/lib/ai-client';
import { ChatMessage, Lang } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, lang }: { msg: ChatMessage; lang: Lang }) {
  const isUser = msg.role === 'user';
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (msg.mermaidCode) {
      navigator.clipboard.writeText(msg.mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'} ${msg.error ? 'chat-bubble--error' : ''}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 text-xs text-gray-400">
            <Bot size={11} />
            <span>{t(lang, 'assistant')}</span>
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

        {msg.mermaidCode && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {t(lang, 'mermaidCode')}
            </button>
            {expanded && (
              <div className="relative mt-1.5 rounded-md bg-gray-900 border border-gray-700 p-2 overflow-x-auto">
                <button
                  onClick={copyCode}
                  className="absolute top-1.5 right-1.5 p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                </button>
                <pre className="text-xs text-gray-300 font-mono leading-relaxed pr-6">{msg.mermaidCode}</pre>
              </div>
            )}
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-600 px-1">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ─── API Key Section ─────────────────────────────────────────────────────────

function ApiKeySection({ lang }: { lang: Lang }) {
  const { apiKey, setApiKey, modelMode } = useApp();
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (apiKey) setDraft(apiKey);
  }, [apiKey]);

  const save = () => {
    if (draft.trim()) {
      setApiKey(draft.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const remove = () => {
    setApiKey('');
    setDraft('');
  };

  if (modelMode === 'local') return null;

  return (
    <div className="p-3 border-b border-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <Key size={13} className="text-yellow-400" />
        <span className="text-xs font-medium text-gray-300">Gemini API Key</span>
        {apiKey && <span className="ml-auto text-[10px] text-green-400">● Active</span>}
      </div>

      {!apiKey ? (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder={t(lang, 'apiKeyPlaceholder')}
                className="input-field w-full pr-8 text-xs"
              />
              <button
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {show ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button onClick={save} className="btn-primary text-xs px-3">
              {saved ? <Check size={13} /> : t(lang, 'apiKeySave')}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-600">{t(lang, 'securityNote')}</p>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs text-gray-500 font-mono truncate">
            {'•'.repeat(16)} {apiKey.slice(-4)}
          </span>
          <button onClick={remove} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
            <X size={12} /> {t(lang, 'apiKeyRemove')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Settings Bar ────────────────────────────────────────────────────────────

function SettingsBar({ lang }: { lang: Lang }) {
  const {
    modelMode, setModelMode,
    lang: appLang, setLang,
    ollamaModel, setOllamaModel,
    preferredDiagramType, setPreferredDiagramType,
  } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-800">
      {/* Row 1: model + language + settings gear */}
      <div className="flex items-center gap-1 px-3 py-2">
        <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-xs">
          <button
            onClick={() => setModelMode('cloud')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-all ${modelMode === 'cloud' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Cloud size={12} /> {t(lang, 'cloud')}
          </button>
          <button
            onClick={() => setModelMode('local')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-all ${modelMode === 'local' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Cpu size={12} /> {t(lang, 'local')}
          </button>
        </div>

        <div className="ml-auto flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-xs">
          {(['en', 'hu'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex items-center gap-1 px-2.5 py-1.5 transition-all uppercase font-medium ${appLang === l ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Languages size={11} /> {l}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={`ml-1 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-all ${open ? 'bg-gray-700 text-white' : ''}`}
        >
          <Settings2 size={14} />
        </button>
      </div>

      {/* Row 2: diagram type selector */}
      <div className="px-3 pb-2.5">
        <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-xs">
          <button
            onClick={() => setPreferredDiagramType('erd')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-all font-medium ${preferredDiagramType === 'erd' ? 'bg-violet-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Database size={11} /> {t(lang, 'erdDiagram')}
          </button>
          <button
            onClick={() => setPreferredDiagramType('uml')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-all font-medium ${preferredDiagramType === 'uml' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Share2 size={11} /> {t(lang, 'umlDiagram')}
          </button>
        </div>
      </div>

      {open && modelMode === 'local' && (
        <div className="px-3 pb-3">
          <label className="text-xs text-gray-400 mb-1 block">{t(lang, 'ollamaModel')}</label>
          <input
            type="text"
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
            placeholder={t(lang, 'ollamaModelPlaceholder')}
            className="input-field w-full text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ─── Example prompts ─────────────────────────────────────────────────────────

function ExamplePrompts({ onSelect, lang }: { onSelect: (p: string) => void; lang: Lang }) {
  const examples = [t(lang, 'example1'), t(lang, 'example2'), t(lang, 'example3')];
  return (
    <div className="flex flex-col gap-4 items-center justify-center h-full px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <Sparkles size={20} className="text-indigo-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200">{t(lang, 'welcomeTitle')}</h3>
        <p className="text-xs text-gray-500 max-w-xs">{t(lang, 'welcomeSubtitle')}</p>
      </div>
      <div className="w-full space-y-2">
        <p className="text-xs text-gray-500 font-medium">{t(lang, 'examplePrompts')}</p>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onSelect(ex)}
            className="w-full text-left text-xs px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-indigo-600/50 hover:text-white transition-all"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ChatPanel ──────────────────────────────────────────────────────────

export default function ChatPanel() {
  const {
    lang,
    modelMode,
    apiKey,
    geminiModel,
    ollamaModel,
    ollamaUrl,
    preferredDiagramType,
    chatHistory,
    setChatHistory,
    isGenerating,
    setIsGenerating,
    mermaidCode,
    applyMermaid,
    clearDiagram,
  } = useApp();

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  // Auto-grow textarea
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const send = useCallback(async (promptOverride?: string) => {
    const prompt = (promptOverride ?? input).trim();
    if (!prompt || isGenerating) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setChatHistory((h) => [...h, userMsg]);
    setIsGenerating(true);

    try {
      const code = await generateDiagram({
        prompt,
        model: modelMode,
        apiKey,
        geminiModel,
        ollamaModel,
        ollamaUrl,
        language: lang,
        previousMermaid: mermaidCode,
        preferredDiagramType,
      });

      applyMermaid(code, true);

      const nodeCount = (code.match(/^\s*\w[\w-]*\s*\{/gm) ?? []).length;

      setChatHistory((h) => [
        ...h,
        {
          id: generateId(),
          role: 'assistant',
          content: `Generated ${nodeCount} ${t(lang, 'nodesGenerated')}.`,
          mermaidCode: code,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setChatHistory((h) => [
        ...h,
        {
          id: generateId(),
          role: 'assistant',
          content: `${t(lang, 'error')}: ${msg}`,
          timestamp: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, modelMode, apiKey, geminiModel, ollamaModel, lang, mermaidCode, applyMermaid, setChatHistory, setIsGenerating]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = Boolean(
    input.trim() &&
    !isGenerating &&
    (modelMode === 'local' || apiKey)
  );

  return (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 shrink-0">
        <MessageSquare size={16} className="text-indigo-400" />
        <span className="text-sm font-semibold text-gray-100">{t(lang, 'title')}</span>
        {chatHistory.length > 0 && (
          <button
            onClick={clearDiagram}
            className="ml-auto p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
            title={t(lang, 'clearChat')}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Settings bar */}
      <SettingsBar lang={lang} />

      {/* API Key */}
      <ApiKeySection lang={lang} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scroll-smooth">
        {chatHistory.length === 0 ? (
          <ExamplePrompts onSelect={(p) => send(p)} lang={lang} />
        ) : (
          <>
            {chatHistory.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} lang={lang} />
            ))}
            {isGenerating && (
              <div className="flex items-start gap-2">
                <div className="chat-bubble chat-bubble--assistant">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Bot size={11} />
                    <span>{t(lang, 'assistant')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Loader2 size={13} className="animate-spin text-indigo-400" />
                    <span className="text-sm text-gray-400">{t(lang, 'generating')}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        {modelMode === 'cloud' && !apiKey && (
          <p className="text-[10px] text-yellow-500/80 mb-2 flex items-center gap-1">
            <Key size={10} /> Add your Gemini API key above to start.
          </p>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder={t(lang, 'chatPlaceholder')}
            rows={1}
            className="input-field flex-1 resize-none text-sm leading-relaxed min-h-[38px]"
            style={{ height: 38 }}
            disabled={isGenerating}
          />
          <button
            onClick={() => send()}
            disabled={!canSend}
            className="btn-primary p-2.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-700 mt-1.5">Shift+Enter for new line · Enter to send</p>
      </div>
    </div>
  );
}
