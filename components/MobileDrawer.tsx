'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import dynamic from 'next/dynamic';

const ProjectSidebar = dynamic(() => import('./ProjectSidebar'), { ssr: false });

export default function MobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button — top-left, below any status bar */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open project menu"
        className="fixed top-3 left-3 z-30 flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900/90 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 active:scale-95 transition-all shadow-lg backdrop-blur-sm"
        style={{ display: isOpen ? 'none' : undefined }}
      >
        <Menu size={18} />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          style={{ animation: 'mobileDrawerFadeIn 0.2s ease' }}
        />
      )}

      {/* Slide-in drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 left-0 h-full z-50"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Tap outside strip on the right edge of sidebar to close */}
        <div onClick={close} className="absolute top-0 right-0 w-0 h-full" />
        <ProjectSidebar onRequestClose={close} />
      </div>

      <style>{`
        @keyframes mobileDrawerFadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}
