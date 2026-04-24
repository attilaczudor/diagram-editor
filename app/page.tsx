'use client';

import dynamic from 'next/dynamic';
import ChatPanel from '@/components/ChatPanel';
import ProjectSidebar from '@/components/ProjectSidebar';
import { Loader2 } from 'lucide-react';

const MobileDrawer = dynamic(() => import('@/components/MobileDrawer'), { ssr: false });

const DiagramCanvas = dynamic(() => import('@/components/DiagramCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#080b14]">
      <Loader2 className="animate-spin text-indigo-400" size={28} />
    </div>
  ),
});

const BottomSheet = dynamic(() => import('@/components/BottomSheet'), { ssr: false });

export default function Home() {
  return (
    <div className="flex h-screen bg-[#080b14] overflow-hidden">
      {/* Project sidebar — always visible on desktop, hidden on mobile */}
      <div className="hidden md:flex shrink-0">
        <ProjectSidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Chat panel — desktop only */}
        <aside className="hidden md:flex w-[360px] shrink-0 flex-col overflow-hidden">
          <ChatPanel />
        </aside>

        {/* Canvas — full screen on mobile */}
        <main className="flex-1 overflow-hidden">
          <DiagramCanvas />
        </main>
      </div>

      {/* Mobile: bottom sheet (chat) + hamburger drawer (projects) */}
      <div className="md:hidden">
        <BottomSheet />
        <MobileDrawer />
      </div>
    </div>
  );
}
