'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
  Settings,
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
  OllamaModel,
  PullProgress,
} from '@/lib/ollama-client';

// ─── Section / Row wrappers ───────────────────────────────────────────────────

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

// ─── Generic API key input ────────────────────────────────────────────────────

function ApiKeyInput({
  value, onSave, onClear, placeholder,
}: {
  value: string; onSave: (v: string) => void; onClear: () => void; placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder={placeholder}
            className="input-field w-full pr-9 text-sm"
          />
          <button onClick={() => setShow(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={save} className="btn-primary px-4 text-sm">
          {saved ? <Check size={14} /> : 'Save'}
        </button>
        {value && (
          <button onClick={() => { onClear(); setDraft(''); }} className="px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-gray-700 transition-all">
            <X size={14} />
          </button>
        )}
      </div>
      {value && (
        <p className="text-xs text-green-400 flex items-center gap-1.5"><Check size={11} /> Active — ending in ···{value.slice(-4)}</p>
      )}
      <p className="text-xs text-gray-600">Stored locally in your browser only.</p>
    </div>
  );
}

// ─── Model card grid ──────────────────────────────────────────────────────────

function ModelGrid({ models, value, onChange }: { models: { id: string; label: string; hint: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {models.map(m => (
        <button
          key={m.id} onClick={() => onChange(m.id)}
          className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${value === m.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
        >
          <span className="text-xs font-semibold">{m.label}</span>
          <span className="text-[10px] text-gray-500 mt-0.5">{m.hint}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Provider configs ─────────────────────────────────────────────────────────

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash',      label: 'Flash 2.0',      hint: 'Fastest, default' },
  { id: 'gemini-2.0-flash-lite', label: 'Flash 2.0 Lite', hint: 'Most economical' },
  { id: 'gemini-1.5-flash',      label: 'Flash 1.5',      hint: 'Higher free quota' },
  { id: 'gemini-1.5-pro',        label: 'Pro 1.5',        hint: 'Most capable' },
];
const QWEN_MODELS = [
  { id: 'qwen-max',   label: 'Qwen Max',   hint: 'Most powerful' },
  { id: 'qwen-plus',  label: 'Qwen Plus',  hint: 'Balanced' },
  { id: 'qwen-turbo', label: 'Qwen Turbo', hint: 'Fast & cheap' },
  { id: 'qwen-long',  label: 'Qwen Long',  hint: 'Long context' },
];
const KIMI_MODELS = [
  { id: 'moonshot-v1-8k',   label: 'Moonshot 8K',   hint: '8K context' },
  { id: 'moonshot-v1-32k',  label: 'Moonshot 32K',  hint: '32K context' },
  { id: 'moonshot-v1-128k', label: 'Moonshot 128K', hint: '128K context' },
];
const PROVIDERS: { id: CloudProvider; label: string; docsHint: string }[] = [
  { id: 'gemini', label: 'Gemini (Google)',       docsHint: 'Get key at aistudio.google.com' },
  { id: 'qwen',   label: 'Qwen (Alibaba Cloud)',  docsHint: 'Get key at dashscope.aliyuncs.com' },
  { id: 'kimi',   label: 'Kimi (Moonshot AI)',    docsHint: 'Get key at platform.moonshot.cn' },
];

// ─── Cloud tab ────────────────────────────────────────────────────────────────

function CloudTab() {
  const {
    cloudProvider, setCloudProvider,
    apiKey, setApiKey,
    geminiModel, setGeminiModel,
    qwenApiKey, setQwenApiKey, qwenModel, setQwenModel,
    kimiApiKey, setKimiApiKey, kimiModel, setKimiModel,
  } = useApp();

  const providerInfo = PROVIDERS.find(p => p.id === cloudProvider)!;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">AI Provider</label>
        <select value={cloudProvider} onChange={e => setCloudProvider(e.target.value as CloudProvider)} className="input-field w-full text-sm">
          {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="text-xs text-gray-600 mt-1">{providerInfo.docsHint}</p>
      </div>
      <div className="h-px bg-gray-800" />
      {cloudProvider === 'gemini' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2"><Key size={13} className="text-yellow-400" /><span className="text-sm font-medium text-gray-200">Gemini API Key</span></div>
            <ApiKeyInput value={apiKey} onSave={setApiKey} onClear={() => setApiKey('')} placeholder="AIza..." />
          </div>
          <div><p className="text-xs text-gray-400 mb-2">Model</p><ModelGrid models={GEMINI_MODELS} value={geminiModel} onChange={setGeminiModel} /></div>
        </>
      )}
      {cloudProvider === 'qwen' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2"><Key size={13} className="text-yellow-400" /><span className="text-sm font-medium text-gray-200">DashScope API Key</span></div>
            <ApiKeyInput value={qwenApiKey} onSave={setQwenApiKey} onClear={() => setQwenApiKey('')} placeholder="sk-..." />
          </div>
          <div><p className="text-xs text-gray-400 mb-2">Model</p><ModelGrid models={QWEN_MODELS} value={qwenModel} onChange={setQwenModel} /></div>
        </>
      )}
      {cloudProvider === 'kimi' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2"><Key size={13} className="text-yellow-400" /><span className="text-sm font-medium text-gray-200">Moonshot API Key</span></div>
            <ApiKeyInput value={kimiApiKey} onSave={setKimiApiKey} onClear={() => setKimiApiKey('')} placeholder="sk-..." />
          </div>
          <div><p className="text-xs text-gray-400 mb-2">Model</p><ModelGrid models={KIMI_MODELS} value={kimiModel} onChange={setKimiModel} /></div>
        </>
      )}
    </div>
  );
}

// ─── Ollama: installed model manager ─────────────────────────────────────────

function InstalledModels({
  url, activeModel, onSelect,
}: {
  url: string; activeModel: string; onSelect: (name: string) => void;
}) {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [pullInput, setPullInput] = useState('');
  const [pull, setPull] = useState<PullProgress | null>(null);
  const [pullErr, setPullErr] = useState('');

  const refresh = useCallback(async () => {
    setStatus('loading');
    setErrMsg('');
    try {
      const list = await listModels(url);
      setModels(list);
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
    setPullErr('');
    setPull({ status: 'Starting…' });
    try {
      await pullModel(url, name, p => setPull(p));
      setPull(null);
      setPullInput('');
      refresh();
    } catch (e) {
      setPullErr(e instanceof Error ? e.message : 'Pull failed');
      setPull(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-gray-500'}`} />
          <span className={status === 'ok' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-gray-500'}>
            {status === 'ok' ? `Connected · ${models.length} model${models.length !== 1 ? 's' : ''}` : status === 'error' ? errMsg : 'Connecting…'}
          </span>
        </div>
        <button onClick={refresh} disabled={status === 'loading'} className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40">
          <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Installed models list */}
      {models.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 font-medium">Installed Models</p>
          {models.map(m => (
            <div key={m.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${activeModel === m.name ? 'bg-indigo-600/20 border-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`} onClick={() => onSelect(m.name)}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeModel === m.name ? 'bg-indigo-400' : 'bg-gray-600'}`} />
              <span className="text-xs font-medium text-gray-200 flex-1 truncate">{m.name}</span>
              <span className="text-[10px] text-gray-500 shrink-0">{formatSize(m.size)}</span>
              {activeModel === m.name && <Check size={11} className="text-indigo-400 shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* Pull a model */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">Pull a Model</p>
        <div className="flex gap-2">
          <input
            type="text" value={pullInput} onChange={e => setPullInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doPull()}
            placeholder="e.g. llama3.2:3b"
            className="input-field flex-1 text-sm"
            disabled={!!pull}
          />
          <button onClick={doPull} disabled={!pullInput.trim() || !!pull} className="btn-primary px-3 disabled:opacity-40">
            {pull ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        </div>
        {pull && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: pull.percent != null ? `${pull.percent}%` : '100%', animation: pull.percent == null ? 'pulse 1.5s infinite' : 'none' }} />
            </div>
            <p className="text-[10px] text-gray-500">{pull.status}{pull.percent != null ? ` — ${pull.percent}%` : ''}</p>
          </div>
        )}
        {pullErr && <p className="text-xs text-red-400">{pullErr}</p>}
      </div>
    </div>
  );
}

// ─── Ollama: model library browser ───────────────────────────────────────────

function ModelLibrary({ targetUrl }: { targetUrl: string }) {
  const [pulling, setPulling] = useState<{ id: string; progress: PullProgress } | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<{ id: string; msg: string } | null>(null);

  const doPull = async (modelId: string) => {
    setErr(null);
    setPulling({ id: modelId, progress: { status: 'Starting…' } });
    try {
      await pullModel(targetUrl, modelId, p => setPulling({ id: modelId, progress: p }));
      setPulling(null);
      setDone(prev => new Set([...prev, modelId]));
    } catch (e) {
      setErr({ id: modelId, msg: e instanceof Error ? e.message : 'Pull failed' });
      setPulling(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Cloud size={11} />
        <span>Pulling to: <code className="text-gray-400">{targetUrl}</code></span>
      </div>
      <div className="space-y-2">
        {OLLAMA_LIBRARY.map(m => {
          const isPulling = pulling?.id === m.id;
          const isDone = done.has(m.id);
          const hasErr = err?.id === m.id;
          return (
            <div key={m.id} className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.size} · {m.desc}</p>
                </div>
                <button
                  onClick={() => !isPulling && !isDone && doPull(m.id)}
                  disabled={isPulling || isDone}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDone ? 'bg-green-600/20 text-green-400 border border-green-700' : isPulling ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                >
                  {isDone ? <><Check size={12} /> Downloaded</> : isPulling ? <Loader2 size={12} className="animate-spin" /> : <><Download size={12} /> Pull</>}
                </button>
              </div>
              {isPulling && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: pulling.progress.percent != null ? `${pulling.progress.percent}%` : '40%', animation: pulling.progress.percent == null ? 'pulse 1.5s infinite' : 'none' }} />
                  </div>
                  <p className="text-[10px] text-gray-500">{pulling.progress.status}{pulling.progress.percent != null ? ` — ${pulling.progress.percent}%` : ''}</p>
                </div>
              )}
              {hasErr && <p className="text-xs text-red-400">{err!.msg}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ollama tab (with Local / LAN / Library sub-tabs) ────────────────────────

function OllamaTab() {
  const { ollamaUrl, setOllamaUrl, ollamaModel, setOllamaModel } = useApp();

  const [subTab, setSubTab] = useState<'local' | 'lan' | 'library'>(() =>
    ollamaUrl === 'http://localhost:11434' ? 'local' : 'lan'
  );
  const [lanUrl, setLanUrlState] = useState(() => storage.getOllamaLanUrl());

  const switchToLocal = () => {
    setSubTab('local');
    setOllamaUrl('http://localhost:11434');
  };

  const applyLan = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    storage.setOllamaLanUrl(trimmed);
    setOllamaUrl(trimmed);
  };

  const activeUrl = subTab === 'local' ? 'http://localhost:11434' : subTab === 'lan' ? lanUrl : ollamaUrl;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-xs">
        {([
          { id: 'local',   icon: Cpu,   label: 'Local' },
          { id: 'lan',     icon: Wifi,  label: 'LAN' },
          { id: 'library', icon: Cloud, label: 'Library' },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              setSubTab(id);
              if (id === 'local') switchToLocal();
              if (id === 'lan' && lanUrl) setOllamaUrl(lanUrl);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-all font-medium ${subTab === id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Local */}
      {subTab === 'local' && (
        <InstalledModels url="http://localhost:11434" activeModel={ollamaModel} onSelect={m => { setOllamaModel(m); setOllamaUrl('http://localhost:11434'); }} />
      )}

      {/* LAN */}
      {subTab === 'lan' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={lanUrl}
              onChange={e => setLanUrlState(e.target.value)}
              onBlur={() => applyLan(lanUrl)}
              placeholder="http://192.168.1.100:11434"
              className="input-field flex-1 text-sm"
            />
            <button onClick={() => applyLan(lanUrl)} className="btn-primary px-3 text-sm">Connect</button>
          </div>
          {lanUrl && <InstalledModels url={lanUrl} activeModel={ollamaModel} onSelect={m => { setOllamaModel(m); applyLan(lanUrl); }} />}
        </div>
      )}

      {/* Library */}
      {subTab === 'library' && <ModelLibrary targetUrl={activeUrl} />}

      <p className="text-xs text-gray-600">
        Ollama must be running with{' '}
        <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">OLLAMA_ORIGINS=*</code>
      </p>
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { lang, setLang, modelMode, setModelMode } = useApp();
  const [aiTab, setAiTab] = useState<'cloud' | 'ollama'>(modelMode === 'local' ? 'ollama' : 'cloud');

  const switchTab = (tab: 'cloud' | 'ollama') => {
    setAiTab(tab);
    setModelMode(tab === 'cloud' ? 'cloud' : 'local');
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100">
      <header className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={15} /> {t(lang, 'back')}
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
            <GitBranch size={12} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white">{t(lang, 'title')}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Settings size={15} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-200">{t(lang, 'settingsTitle')}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* ── AI Provider ──────────────────────────────────────────── */}
        <Section title={t(lang, 'aiProvider')}>
          <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-sm mb-5">
            <button onClick={() => switchTab('cloud')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-all font-medium ${aiTab === 'cloud' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Cloud size={14} /> Cloud
            </button>
            <button onClick={() => switchTab('ollama')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 transition-all font-medium ${aiTab === 'ollama' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Cpu size={14} /> Ollama
            </button>
          </div>
          {aiTab === 'cloud' ? <CloudTab /> : <OllamaTab />}
        </Section>

        {/* ── Appearance ───────────────────────────────────────────── */}
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

        {/* ── About ────────────────────────────────────────────────── */}
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
      </main>
    </div>
  );
}
