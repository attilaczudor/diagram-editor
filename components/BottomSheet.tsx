'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import dynamic from 'next/dynamic';

const ChatPanel = dynamic(() => import('./ChatPanel'), {
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-400" size={20} />
    </div>
  ),
});

export default function BottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const { isGenerating, chatHistory, lang } = useApp();

  // Swipe-to-close state
  const dragStartY = useRef<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    setDragDelta(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragDelta(delta); // only allow downward drag
  };
  const onTouchEnd = () => {
    if (dragDelta > 90) close();
    else setDragDelta(0);
    dragStartY.current = null;
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const hasActivity = chatHistory.length > 0;

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={open}
        aria-label={t(lang, 'openChat')}
        className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 shadow-lg shadow-indigo-900/60 hover:bg-indigo-500 active:scale-95 transition-all duration-200"
        style={{
          transform: isOpen ? 'scale(0)' : 'scale(1)',
          opacity: isOpen ? 0 : 1,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        <MessageSquare size={22} className="text-white" />
        {/* Activity indicator dot */}
        {isGenerating && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-yellow-400 animate-pulse border-2 border-gray-950" />
        )}
        {!isGenerating && hasActivity && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-gray-950" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.2s ease' }}
        />
      )}

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-gray-950 border-t border-gray-800 overflow-hidden"
        style={{
          height: '88dvh',
          transform: isOpen ? `translateY(${dragDelta}px)` : 'translateY(100%)',
          transition: dragDelta > 0 ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle — touching this area drags the sheet */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex flex-col items-center pt-3 pb-1 shrink-0 touch-none cursor-grab active:cursor-grabbing select-none"
        >
          <div className="w-10 h-1 rounded-full bg-gray-700" />
        </div>

        {/* Chat panel fills remaining height */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}
