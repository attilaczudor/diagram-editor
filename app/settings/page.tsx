'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  GitBranch,
  Key,
  Languages,
  Settings,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { Lang } from '@/types';

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── API Key row ──────────────────────────────────────────────────────────────

function ApiKeyRow({ lang }: { lang: Lang }) {
  const { apiKey, setApiKey } = useApp();
  const [draft, setDraft] = useState(apiKey);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (draft.trim()) {
      setApiKey(draft.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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
            placeholder={t(lang, 'apiKeyPlaceholder')}
            className="input-field w-full pr-9 text-sm"
          />
          <button
            onClick={() => setShow(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={save} className="btn-primary px-4">
          {saved ? <Check size={14} /> : t(lang, 'apiKeySave')}
        </button>
        {apiKey && (
          <button onClick={() => { setApiKey(''); setDraft(''); }} className="px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-gray-700 transition-all">
            <X size={14} />
          </button>
        )}
      </div>
      {apiKey && (
        <p className="text-xs text-green-400 flex items-center gap-1.5">
          <Check size={11} /> Active — ending in ···{apiKey.slice(-4)}
        </p>
      )}
      <p className="text-xs text-gray-600">{t(lang, 'securityNote')}</p>
    </div>
  );
}

// ─── Settings page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const {
    lang, setLang,
    modelMode, setModelMode,
    ollamaModel, setOllamaModel,
    ollamaUrl, setOllamaUrl,
  } = useApp();

  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-4 py-3 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          {t(lang, 'back')}
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

        {/* ── AI Provider ──────────────────────────────────────────────── */}
        <Section title={t(lang, 'aiProvider')}>
          {/* Model toggle */}
          <SettingsRow label={t(lang, 'model')} hint="Choose between Cloud AI (Gemini) or a locally running model (Ollama).">
            <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-sm">
              <button
                onClick={() => setModelMode('cloud')}
                className={`flex items-center gap-2 px-4 py-2 transition-all ${modelMode === 'cloud' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Cloud size={14} /> {t(lang, 'cloud')}
              </button>
              <button
                onClick={() => setModelMode('local')}
                className={`flex items-center gap-2 px-4 py-2 transition-all ${modelMode === 'local' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Cpu size={14} /> {t(lang, 'local')}
              </button>
            </div>
          </SettingsRow>

          <div className="h-px bg-gray-800" />

          {/* Gemini API Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key size={14} className="text-yellow-400 shrink-0" />
              <p className="text-sm font-medium text-gray-200">Gemini API Key</p>
            </div>
            <ApiKeyRow lang={lang} />
          </div>

          {/* Ollama settings */}
          <div className="h-px bg-gray-800" />
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-emerald-400 shrink-0" />
              <p className="text-sm font-medium text-gray-200">Ollama (Local)</p>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">{t(lang, 'ollamaUrl')}</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  placeholder={t(lang, 'ollamaUrlPlaceholder')}
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">{t(lang, 'ollamaModel')}</label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={e => setOllamaModel(e.target.value)}
                  placeholder={t(lang, 'ollamaModelPlaceholder')}
                  className="input-field w-full text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Make sure Ollama is running with{' '}
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">OLLAMA_ORIGINS=*</code>{' '}
              to allow browser connections.
            </p>
          </div>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────────── */}
        <Section title={t(lang, 'appearance')}>
          <SettingsRow label={t(lang, 'language')} hint="Interface language for all UI labels.">
            <div className="flex rounded-lg bg-gray-900 border border-gray-700 overflow-hidden text-sm">
              {(['en', 'hu'] as Lang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex items-center gap-1.5 px-4 py-2 transition-all font-medium uppercase ${lang === l ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <Languages size={12} /> {l}
                </button>
              ))}
            </div>
          </SettingsRow>
        </Section>

        {/* ── About ────────────────────────────────────────────────────── */}
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
