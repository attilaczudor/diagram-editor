'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Cloud,
  Cpu,
  Download,
  Eye,
  EyeOff,
  GitBranch,
  Key,
  Languages,
  Loader2,
  RefreshCw,
  Search,
  Server,
  Trash2,
  User,
  Wifi,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { storage } from '@/lib/storage';
import { t } from '@/lib/i18n';
import { CloudProvider, Lang } from '@/types';
import {
  listModels,
  pullModel,
  formatSize,
  OLLAMA_LIBRARY,
  OllamaLibraryModel,
  OllamaModel,
  PullProgress,
} from '@/lib/ollama-client';

// ─── Shared layout wrappers ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="settings-section">
      <h2 className="settings-section-title">{title}</h2>
      <div className="settings-card">{children}</div>
    </div>
  );
}

function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="settings-row">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── API key input ────────────────────────────────────────────────────────────

function ApiKeyInput({ value, onSave, onClear, placeholder }: {
  value: string; onSave: (v: string) => void; onClear: () => void; placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={show ? 'text' : 'password'} value={draft}
            onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()}
            placeholder={placeholder} className="input-field w-full pr-9 text-sm" />
          <button onClick={() => setShow(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={save} className="btn-primary px-4 text-sm">{saved ? <Check size={14} /> : 'Save'}</button>
        {value && <button onClick={() => { onClear(); setDraft(''); }} className="px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-gray-700 transition-all"><X size={14} /></button>}
      </div>
      {value && <p className="text-xs text-green-400 flex items-center gap-1.5"><Check size={11} /> Active — ending in ···{value.slice(-4)}</p>}
      <p className="text-xs text-gray-600">Stored locally in your browser only.</p>
    </div>
  );
}

// ─── Model card grid (for cloud AI providers) ─────────────────────────────────

function ModelGrid({ models, value, onChange }: {
  models: { id: string; label: string; hint: string }[]; value: string; onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {models.map(m => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${value === m.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}>
          <span className="text-xs font-semibold">{m.label}</span>
          <span className="text-[10px] text-gray-500 mt-0.5">{m.hint}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Cloud AI provider configs ────────────────────────────────────────────────

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash',      label: 'Flash 2.0',      hint: 'Fastest, default' },
  { id: 'gemini-2.0-flash-lite', label: 'Flash 2.0 Lite', hint: 'Most economical' },
  { id: 'gemini-1.5-flash',      label: 'Flash 1.5',      hint: 'Higher free quota' },
  { id: 'gemini-1.5-pro',        label: 'Pro 1.5',        hint: 'Most capable' },
];
const QWEN_MODELS = [
  { id: 'qwen-max', label: 'Qwen Max', hint: 'Most powerful' },
  { id: 'qwen-plus', label: 'Qwen Plus', hint: 'Balanced' },
  { id: 'qwen-turbo', label: 'Qwen Turbo', hint: 'Fast & cheap' },
  { id: 'qwen-long', label: 'Qwen Long', hint: 'Long context' },
];
const KIMI_MODELS = [
  { id: 'moonshot-v1-8k', label: 'Moonshot 8K', hint: '8K context' },
  { id: 'moonshot-v1-32k', label: 'Moonshot 32K', hint: '32K context' },
  { id: 'moonshot-v1-128k', label: 'Moonshot 128K', hint: '128K context' },
];
const PROVIDERS: { id: CloudProvider; label: string; docsHint: string }[] = [
  { id: 'gemini', label: 'Gemini (Google)',      docsHint: 'Get key at aistudio.google.com' },
  { id: 'qwen',   label: 'Qwen (Alibaba Cloud)', docsHint: 'Get key at dashscope.aliyuncs.com' },
  { id: 'kimi',   label: 'Kimi (Moonshot AI)',   docsHint: 'Get key at platform.moonshot.cn' },
];

function CloudTab() {
  const { cloudProvider, setCloudProvider, apiKey, setApiKey, geminiModel, setGeminiModel,
    qwenApiKey, setQwenApiKey, qwenModel, setQwenModel,
    kimiApiKey, setKimiApiKey, kimiModel, setKimiModel } = useApp();
  const info = PROVIDERS.find(p => p.id === cloudProvider)!;
  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">AI Provider</label>
        <select value={cloudProvider} onChange={e => setCloudProvider(e.target.value as CloudProvider)} className="input-field w-full text-sm">
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="text-xs text-gray-600 mt-1">{info.docsHint}</p>
      </div>
      <div className="h-px bg-gray-800" />
      {cloudProvider === 'gemini' && <>
        <div><div className="flex items-center gap-2 mb-2"><Key size={13} className="text-yellow-400" /><span className="text-sm font-medium text-gray-200">Gemini API Key</span></div><ApiKeyInput value={apiKey} onSave={setApiKey} onClear={() => setApiKey('')} placeholder="AIza..." /></div>
        <div><p className="text-xs text-gray-400 mb-2">Model</p><ModelGrid models={GEMINI_MODELS} value={geminiModel} onChange={setGeminiModel} /></div>
      </>}
      {cloudProvider === 'qwen' && <>
        <div><div className="flex items-center gap-2 mb-2"><Key size={13} className="text-yellow-400" /><span className="text-sm font-medium text-gray-200">DashScope API Key</span></div><ApiKeyInput value={qwenApiKey} onSave={setQwenApiKey} onClear={() => setQwenApiKey('')} placeholder="sk-..." /></div>
        <div><p className="text-xs text-gray-400 mb-2">Model</p><ModelGrid models={QWEN_MODELS} value={qwenModel} onChange={setQwenModel} /></div>
      </>}
      {cloudProvider === 'kimi' && <>
        <div><div className="flex items-center gap-2 mb-2"><Key size={13} className="text-yellow-400" /><span className="text-sm font-medium text-gray-200">Moonshot API Key</span></div><ApiKeyInput value={kimiApiKey} onSave={setKimiApiKey} onClear={() => setKimiApiKey('')} placeholder="sk-..." /></div>
        <div><p className="text-xs text-gray-400 mb-2">Model</p><ModelGrid models={KIMI_MODELS} value={kimiModel} onChange={setKimiModel} /></div>
      </>}
    </div>
  );
}

// ─── Ollama: progress bar ─────────────────────────────────────────────────────

function PullBar({ progress }: { progress: PullProgress }) {
  return (
    <div className="space-y-1 pt-1">
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{
            width: progress.percent != null ? `${progress.percent}%` : '100%',
            animation: progress.percent == null ? 'pulse 1.5s infinite' : 'none',
          }}
        />
      </div>
      <p className="text-[10px] text-gray-500 truncate">
        {progress.status}{progress.percent != null ? ` — ${progress.percent}%` : ''}
      </p>
    </div>
  );
}

// ─── Ollama: pull-to destination picker ──────────────────────────────────────

interface PullState {
  target: 'local' | 'lan';
  progress: PullProgress;
}

function PullButtons({
  modelId,
  localUrl,
  lanUrl,
  onDone,
}: {
  modelId: string;
  localUrl: string;
  lanUrl: string;
  onDone: () => void;
}) {
  const [pulling, setPulling] = useState<PullState | null>(null);
  const [done, setDone] = useState<'local' | 'lan' | null>(null);
  const [err, setErr] = useState('');

  const pull = async (target: 'local' | 'lan') => {
    const url = target === 'local' ? localUrl : lanUrl;
    setErr('');
    setPulling({ target, progress: { status: 'Starting…' } });
    try {
      await pullModel(url, modelId, p => setPulling({ target, progress: p }));
      setPulling(null);
      setDone(target);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Pull failed');
      setPulling(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <button
          onClick={() => !pulling && pull('local')}
          disabled={!!pulling || done === 'local'}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${done === 'local' ? 'bg-green-600/20 border-green-700 text-green-400' : pulling?.target === 'local' ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900 border-gray-600 text-gray-300 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white'}`}
        >
          {pulling?.target === 'local' ? <Loader2 size={11} className="animate-spin" /> : done === 'local' ? <Check size={11} /> : <Download size={11} />}
          → Local
        </button>
        <button
          onClick={() => lanUrl && !pulling && pull('lan')}
          disabled={!lanUrl || !!pulling || done === 'lan'}
          title={!lanUrl ? 'Configure LAN URL first' : undefined}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${!lanUrl ? 'opacity-40 cursor-not-allowed bg-gray-900 border-gray-700 text-gray-500' : done === 'lan' ? 'bg-green-600/20 border-green-700 text-green-400' : pulling?.target === 'lan' ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900 border-gray-600 text-gray-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white'}`}
        >
          {pulling?.target === 'lan' ? <Loader2 size={11} className="animate-spin" /> : done === 'lan' ? <Check size={11} /> : <Download size={11} />}
          → LAN
        </button>
      </div>
      {pulling && <PullBar progress={pulling.progress} />}
      {err && <p className="text-[10px] text-red-400">{err}</p>}
    </div>
  );
}

// ─── Ollama: installed models manager ────────────────────────────────────────

function InstalledModels({ url, activeModel, onSelect }: {
  url: string; activeModel: string; onSelect: (name: string) => void;
}) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [pullInput, setPullInput] = useState('');
  const [pull, setPull] = useState<PullProgress | null>(null);
  const [pullErr, setPullErr] = useState('');

  const refresh = useCallback(async () => {
    setStatus('loading'); setErrMsg('');
    try {
      setModels(await listModels(url));
      setStatus('ok');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Cannot reach Ollama');
      setStatus('error');
    }
  }, [url]);

  useEffect(() => { refresh(); }, [refresh]);

  const doPull = async () => {
    const name = pullInput.trim();
    if (!name) return;
    setPullErr(''); setPull({ status: 'Starting…' });
    try {
      await pullModel(url, name, p => setPull(p));
      setPull(null); setPullInput(''); refresh();
    } catch (e) {
      setPullErr(e instanceof Error ? e.message : 'Pull failed');
      setPull(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`} />
          <span className={status === 'ok' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-gray-500'}>
            {status === 'ok' ? `Connected · ${models.length} model${models.length !== 1 ? 's' : ''}` : status === 'error' ? errMsg : 'Connecting…'}
          </span>
        </div>
        <button onClick={refresh} disabled={status === 'loading'} className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-40">
          <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
        </button>
      </div>
      {models.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 font-medium">Installed Models</p>
          {models.map(m => (
            <div key={m.name} onClick={() => onSelect(m.name)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${activeModel === m.name ? 'bg-indigo-600/20 border-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeModel === m.name ? 'bg-indigo-400' : 'bg-gray-600'}`} />
              <span className="text-xs font-medium text-gray-200 flex-1 truncate">{m.name}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{formatSize(m.size)}</span>
              {activeModel === m.name && <Check size={11} className="text-indigo-400 shrink-0" />}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">Pull by Name</p>
        <div className="flex gap-2">
          <input type="text" value={pullInput} onChange={e => setPullInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doPull()}
            placeholder="e.g. llama3.2:3b" className="input-field flex-1 text-sm" disabled={!!pull} />
          <button onClick={doPull} disabled={!pullInput.trim() || !!pull} className="btn-primary px-3 disabled:opacity-40">
            {pull ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </div>
        {pull && <PullBar progress={pull} />}
        {pullErr && <p className="text-xs text-red-400">{pullErr}</p>}
      </div>
    </div>
  );
}

// ─── Ollama: library model card ───────────────────────────────────────────────

function LibraryCard({ model, lanUrl, onPulled }: {
  model: OllamaLibraryModel; lanUrl: string; onPulled?: () => void;
}) {
  const categoryColor = model.category === 'cloud'
    ? 'text-purple-400 bg-purple-900/30 border-purple-800'
    : 'text-emerald-400 bg-emerald-900/30 border-emerald-800';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-100">{model.label}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${categoryColor}`}>
              {model.category}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{model.size} · {model.desc}</p>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">{model.id}</p>
        </div>
      </div>
      <PullButtons
        modelId={model.id}
        localUrl="http://localhost:11434"
        lanUrl={lanUrl}
        onDone={() => onPulled?.()}
      />
    </div>
  );
}

// ─── Ollama: library browser with search + filter ────────────────────────────

type LibraryFilter = 'all' | 'local' | 'cloud';

function LibraryBrowser({ lanUrl }: { lanUrl: string }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = OLLAMA_LIBRARY.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      m.label.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.tags.some(tag => tag.includes(q));
    const matchFilter = filter === 'all' || m.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search models…"
          className="input-field w-full pl-8 text-sm"
        />
        {search && (
          <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {(['all', 'local', 'cloud'] as LibraryFilter[]).map(f => (
          <label key={f} className="flex items-center gap-1.5 cursor-pointer group">
            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${filter === f ? 'border-indigo-500 bg-indigo-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
              {filter === f && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            <input type="radio" className="sr-only" value={f} checked={filter === f} onChange={() => setFilter(f)} />
            <span className={`text-xs capitalize font-medium ${filter === f ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}`}>{f}</span>
          </label>
        ))}
        <span className="ml-auto text-[10px] text-gray-600">{filtered.length} model{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {!lanUrl && (
        <p className="text-[10px] text-yellow-600/80">Configure a LAN URL in the LAN tab to enable "→ LAN" pull.</p>
      )}

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
        {filtered.length === 0
          ? <p className="text-xs text-gray-500 text-center py-6">No models match your search.</p>
          : filtered.map(m => <LibraryCard key={m.id} model={m} lanUrl={lanUrl} />)
        }
      </div>
    </div>
  );
}

// ─── Ollama: cloud-only library (large models) ────────────────────────────────

function CloudLibrary({ lanUrl }: { lanUrl: string }) {
  const cloudModels = OLLAMA_LIBRARY.filter(m => m.category === 'cloud');
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Large models requiring server or cloud GPU (≥ 16 GB VRAM). Pull to your LAN Ollama instance.</p>
      {!lanUrl && (
        <p className="text-[10px] text-yellow-600/80">Configure a LAN URL in the LAN tab to enable "→ LAN" pull.</p>
      )}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5">
        {cloudModels.map(m => <LibraryCard key={m.id} model={m} lanUrl={lanUrl} />)}
      </div>
    </div>
  );
}

// ─── Ollama tab (Local | LAN | Cloud | Library) ───────────────────────────────

type OllamaSubTab = 'local' | 'lan' | 'cloud' | 'library';

function OllamaTab() {
  const { ollamaUrl, setOllamaUrl, ollamaModel, setOllamaModel } = useApp();
  const [subTab, setSubTab] = useState<OllamaSubTab>(() =>
    ollamaUrl === 'http://localhost:11434' ? 'local' : 'lan'
  );
  const [lanUrl, setLanUrlLocal] = useState(() => storage.getOllamaLanUrl());

  const applyLan = (url: string) => {
    const u = url.trim();
    if (!u) return;
    storage.setOllamaLanUrl(u);
    setOllamaUrl(u);
  };

  const SUBTABS: { id: OllamaSubTab; icon: React.ElementType; label: string }[] = [
    { id: 'local',   icon: Cpu,    label: 'Local' },
    { id: 'lan',     icon: Wifi,   label: 'LAN' },
    { id: 'cloud',   icon: Server, label: 'Cloud' },
    { id: 'library', icon: Cloud,  label: 'Library' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-xs">
        {SUBTABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              setSubTab(id);
              if (id === 'local') setOllamaUrl('http://localhost:11434');
              if (id === 'lan' && lanUrl) setOllamaUrl(lanUrl);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-all font-medium ${subTab === id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {subTab === 'local' && (
        <InstalledModels
          url="http://localhost:11434"
          activeModel={ollamaModel}
          onSelect={m => { setOllamaModel(m); setOllamaUrl('http://localhost:11434'); }}
        />
      )}

      {subTab === 'lan' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text" value={lanUrl}
              onChange={e => setLanUrlLocal(e.target.value)}
              onBlur={() => applyLan(lanUrl)}
              placeholder="http://192.168.1.100:11434"
              className="input-field flex-1 text-sm"
            />
            <button onClick={() => applyLan(lanUrl)} className="btn-primary px-3 text-sm">Connect</button>
          </div>
          {lanUrl && (
            <InstalledModels
              url={lanUrl}
              activeModel={ollamaModel}
              onSelect={m => { setOllamaModel(m); applyLan(lanUrl); }}
            />
          )}
        </div>
      )}

      {subTab === 'cloud' && <CloudLibrary lanUrl={lanUrl} />}
      {subTab === 'library' && <LibraryBrowser lanUrl={lanUrl} />}

      <p className="text-xs text-gray-600">
        Ollama must be running with{' '}
        <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">OLLAMA_ORIGINS=*</code>
      </p>
    </div>
  );
}

// ─── Page tab: AI Providers ───────────────────────────────────────────────────

function AiProvidersTab() {
  const { modelMode, setModelMode } = useApp();
  const [aiTab, setAiTab] = useState<'cloud' | 'ollama'>(modelMode === 'local' ? 'ollama' : 'cloud');

  const switchTab = (tab: 'cloud' | 'ollama') => {
    setAiTab(tab);
    setModelMode(tab === 'cloud' ? 'cloud' : 'local');
  };

  return (
    <div className="space-y-5">
      <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-sm">
        <button onClick={() => switchTab('cloud')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-all font-medium ${aiTab === 'cloud' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Cloud size={14} /> Cloud
        </button>
        <button onClick={() => switchTab('ollama')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-all font-medium ${aiTab === 'ollama' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
          <Cpu size={14} /> Ollama
        </button>
      </div>
      {aiTab === 'cloud' ? <CloudTab /> : <OllamaTab />}
    </div>
  );
}

// ─── Page tab: Others ─────────────────────────────────────────────────────────

function OthersTab() {
  const { lang, setLang } = useApp();
  return (
    <div className="space-y-8">
      <Section title={t(lang, 'appearance')}>
        <SettingsRow label={t(lang, 'language')} hint="Interface language for all UI labels.">
          <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-sm">
            {(['en', 'hu'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} className={`flex items-center gap-1.5 px-4 py-2 transition-all font-medium uppercase ${lang === l ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Languages size={12} /> {l}
              </button>
            ))}
          </div>
        </SettingsRow>
      </Section>

      <Section title={t(lang, 'about')}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <GitBranch size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">{t(lang, 'title')}</p>
            <p className="text-xs text-gray-500">{t(lang, 'aboutDesc')}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Page tab: Account ────────────────────────────────────────────────────────

const DISPLAY_NAME_KEY = 'diagram_display_name';

function getStorageUsed(): string {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) total += (localStorage.getItem(key) ?? '').length + key.length;
    }
    return (total / 1024).toFixed(1) + ' KB';
  } catch { return 'unknown'; }
}

function AccountTab() {
  const [name, setName] = useState(() => {
    try { return localStorage.getItem(DISPLAY_NAME_KEY) ?? ''; } catch { return ''; }
  });
  const [nameSaved, setNameSaved] = useState(false);
  const [cleared, setCleared] = useState(false);
  const storageUsed = getStorageUsed();

  const saveName = () => {
    try { localStorage.setItem(DISPLAY_NAME_KEY, name.trim()); } catch {}
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const clearData = () => {
    if (!window.confirm('Clear all app data? This cannot be undone.')) return;
    try { localStorage.clear(); } catch {}
    setCleared(true);
  };

  return (
    <div className="space-y-8">
      <Section title="Profile">
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 border border-indigo-700/50 flex items-center justify-center shrink-0">
              <User size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200">{name || 'Local User'}</p>
              <p className="text-xs text-gray-500">No cloud account required</p>
            </div>
          </div>
          <SettingsRow label="Display Name" hint="Shown locally in the app.">
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="Your name"
                className="input-field text-sm w-36"
              />
              <button onClick={saveName} className="btn-primary px-3 text-sm">
                {nameSaved ? <Check size={14} /> : 'Save'}
              </button>
            </div>
          </SettingsRow>
        </div>
      </Section>

      <Section title="Storage">
        <div className="space-y-4">
          <SettingsRow label="Local Storage Used" hint="All data is stored only in your browser.">
            <span className="text-sm text-gray-300 font-mono tabular-nums">{storageUsed}</span>
          </SettingsRow>
          <div className="h-px bg-gray-800" />
          <div className="space-y-3">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Danger Zone</p>
            {cleared ? (
              <p className="text-sm text-green-400 flex items-center gap-1.5">
                <Check size={13} /> Data cleared — refresh the page to reset the app.
              </p>
            ) : (
              <button
                onClick={clearData}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-800/60 text-red-400 hover:bg-red-900/20 text-sm transition-all"
              >
                <Trash2 size={14} /> Clear All Data
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

type SettingsTab = 'ai' | 'others' | 'account';

const PAGE_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'ai',      label: 'AI Providers' },
  { id: 'others',  label: 'Others' },
  { id: 'account', label: 'Account' },
];

export default function SettingsPage() {
  const { lang } = useApp();
  const [tab, setTab] = useState<SettingsTab>('ai');

  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={15} /> {t(lang, 'back')}
          </Link>
          <h1 className="text-sm font-bold text-white">{t(lang, 'settingsTitle')}</h1>
        </div>
        <div className="flex px-2 gap-0.5">
          {PAGE_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${tab === id ? 'text-white border-indigo-500' : 'text-gray-400 border-transparent hover:text-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {tab === 'ai'      && <AiProvidersTab />}
        {tab === 'others'  && <OthersTab />}
        {tab === 'account' && <AccountTab />}
      </main>
    </div>
  );
}
