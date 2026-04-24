'use client';

import dynamic from 'next/dynamic';
import ChatPanel from '@/components/ChatPanel';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { Download, GitBranch, Loader2 } from 'lucide-react';

const DiagramCanvas = dynamic(() => import('@/components/DiagramCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#080b14]">
      <Loader2 className="animate-spin text-indigo-400" size={28} />
    </div>
  ),
});

// Mobile bottom sheet loaded only client-side (uses window APIs)
const BottomSheet = dynamic(() => import('@/components/BottomSheet'), { ssr: false });

function Header() {
  const { lang, mermaidCode, nodes, preferredDiagramType } = useApp();

  const exportPNG = () => {
    const el = document.querySelector('.react-flow') as HTMLElement | null;
    if (!el) return;
    const original = el.style.background;
    el.style.background = '#080b14';
    window.print();
    el.style.background = original;
  };

  const typeLabel = preferredDiagramType === 'erd' ? t(lang, 'erdDiagram') : t(lang, 'umlDiagram');
  const typeBadgeColor = preferredDiagramType === 'erd' ? 'text-violet-400 bg-violet-900/30' : 'text-blue-400 bg-blue-900/30';

  return (
    <header className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-gray-800 bg-gray-950 shrink-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <GitBranch size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold text-white tracking-tight">{t(lang, 'title')}</span>
      </div>

      {/* Diagram type badge — visible on mobile where the sidebar is hidden */}
      <span className={`hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${typeBadgeColor}`}>
        {typeLabel}
      </span>

      {nodes.length > 0 && (
        <span className="hidden sm:inline-flex text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
          {nodes.length} {t(lang, 'nodesGenerated')}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {mermaidCode && (
          <button
            onClick={exportPNG}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
          >
            <Download size={13} />
            <span className="hidden sm:inline">{t(lang, 'export')}</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-[#080b14] overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — hidden below md breakpoint */}
        <aside className="hidden md:flex w-[360px] shrink-0 flex-col overflow-hidden">
          <ChatPanel />
        </aside>

        {/* Canvas — full width on mobile */}
        <main className="flex-1 overflow-hidden">
          <DiagramCanvas />
        </main>
      </div>

      {/* Mobile bottom sheet — only rendered below md breakpoint via CSS */}
      <div className="md:hidden">
        <BottomSheet />
      </div>
    </div>
  );
}
